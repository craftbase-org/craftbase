// newCanvas: 2600+ lines of Two.js + ZUI canvas logic with multiple internal
// state machines (pencil velocity tracking, scenario dispatch, drag/draw/
// arrow/text/group selectors). The stale-closure pattern from CLAUDE.md is
// pervasive — many handlers close over refs that are reassigned post-mount.
//
// Two.js scene shapes carry codebase-specific bookkeeping (.elementData,
// ._renderer, .lineData, .siblingCircle, .direction, …) that's set ad-hoc
// across factories, element components, and this file. Per migration
// convention, those access sites use `any` casts; component props, hook
// params, and event handler signatures get real types.
import React, {
    useEffect,
    useState,
    useRef,
    Suspense,
    type MutableRefObject,
    type ReactNode,
} from 'react'
import Two from 'two.js'

import { ZUI } from 'two.js/extras/jsm/zui'
import { useBoardContext } from './views/Board/board'
import { useMediaQueryUtils } from './constants/exportHooks'

import {
    GROUP_COMPONENT,
    componentTypes,
    RUBBER_MODE_KEY,
    VIEWPORT_KEY_PREFIX,
    MOBILE_VIEWPORT_KEY_PREFIX,
    VIEWPORT_TTL_MS,
    ARROW_DRAW_MODE_KEY,
    TEXT_DRAW_MODE_KEY,
    PENDING_SHAPE_TYPE_KEY,
    PENDING_SHAPE_PROPS_KEY,
    LAST_ADDED_ELEMENT_ID_KEY,
    PENCIL_MODE_KEY,
    PENCIL_DEFAULT_COLOR,
    SHAPE_DEFAULT_STROKE,
    HOVER_THRESHOLD,
    HOVER_COLOR,
    SELECTION_PREVIEW_STROKE,
    DEFAULT_PREVIEW_OPACITY,
    LINE_HEIGHT_MULTIPLIER,
    PENCIL_DISTANCE_THROTTLE,
    DEFAULT_TEXT_SIZE,
    GEO_DRAW_MODE_KEY,
    GEO_DRAW_TYPE_KEY,
    GEO_DRAW_PROPS_KEY,
    GEO_POINT_PLACE_MODE_KEY,
    GEO_MIN_VERTICES,
} from './constants/misc'
import Spinner from './components/common/spinner'

const elementModules = import.meta.glob('./components/elements/*.tsx')

import Loader from './components/utils/loader'
import SelectionController from './canvas/selectionController'
import { updateX1Y1Vertices, updateX2Y2Vertices } from './utils/updateVertices'
import { generateUUID } from './utils/misc'
import {
    velocityToLinewidth,
    smoothLinewidth,
    simplifyWithLinewidth,
    chaikinSmooth,
} from './utils/pencilHelper'
import {
    setArrowEndpointsVisible,
    pollUntilElement,
    cloneElementData,
    resolveShapeFromPath,
    findShapeTextLayer,
    getShapeTextNodes,
    applyShapeText,
    shapeTextStyleFromMeta,
} from './utils/canvasUtils'
import { growShapeToFitText, usableTextWidth } from './utils/shapeTextFit'
import { isSelectPanMode, isPanMode } from './utils/drawModeUtils'
import { createDiamondPath } from './factory/diamond'
import { useCanvasClipboard } from './hooks/useCanvasClipboard'
import {
    ElementRenderWrapper,
    GroupRenderWrapper,
} from './components/utils/elementRenderWrappers'
import type {
    CameraChangeEvent,
    ComponentRecord,
    ComponentStore,
    SelectedComponent,
    CurrentElement,
} from './types/board'

interface CanvasProps {
    pointerToggle: boolean
    isPencilMode: boolean
    selectPanMode: boolean
    boardId: string
    selectedComponent: SelectedComponent | null
    lastAddedElement: ComponentRecord | null
    componentStore: ComponentStore
    defaultLinewidth: number
    defaultStrokeType: string | null
    defaultStrokeColor: string
    defaultTextSize: number
    onCameraChange?: (event: CameraChangeEvent) => void
    renderBackground?: () => ReactNode
}

// Shape of the handle addZUI returns and Canvas stores in state. The
// remaining fields are accessed via `as any` at call sites (see resetDragState
// usage etc.) where Two.js internals leak through.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZuiHandle = any

// Local callback signatures (defined inside Canvas, consumed by addZUI).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UpdateToGlobalStateFn = (newShapeData: any, oldShapeData: any) => void
type UpdateComponentVerticesFn = (id: string, x: number, y: number) => void
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SetOnGroupHandlerFn = (obj: any) => void

/**
 * @typedef {Object} elementData
 * @property {string} boardId
 * @property {string} componentType
 * @property {string} fill
 * @property {Object} handleDeleteComponent //function
 * @property {number} height
 * @property {number} id // component's id
 * @property {boolean} isDummy
 * @property {boolean} isGroupSelector
 * @property {Object} itemData // the data which we recieve from database
 * @property {Object} metadata
 * @property {number} prevY // the value of prev Y coordinate used to diff
 * @property {number} prevX // the value of prev X coordinate used to diff
 * @property {string} textColor
 * @property {Object} twoJSInstance // the main Two.js instance
 * @property {number} width
 * @property {number} x
 * @property {number} y
 */

let isDrawing: boolean = false
let defaultLinewidthValue: number = 1
let defaultStrokeTypeValue: string | null = null
let defaultStrokeColorValue: string = PENCIL_DEFAULT_COLOR
// Live default text size (px) for shape-with-text. Module-level + synced via
// useEffect so the once-bound addZUI DOM handlers read the latest value
// (same stale-closure escape hatch as defaultLinewidthValue).
let defaultTextSizeValue: number = DEFAULT_TEXT_SIZE

function addZUI(
    props: CanvasProps,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    two: any,
    updateToGlobalState: UpdateToGlobalStateFn,
    updateComponentVertices: UpdateComponentVerticesFn,
    setOnGroupHandler: SetOnGroupHandlerFn,
    addToLocalComponentStore: (
        id: string,
        type: string,
        componentInfo: ComponentRecord,
        skipHistory?: boolean
    ) => void,
    setSelectedComponentInBoard: (component: SelectedComponent | null) => void,
    setArrowDrawModeOff: () => void,
    setTextDrawModeOff: () => void,
    setPointerElement: (element: CurrentElement | null) => void,
    updateComponentBulkPropertiesInLocalStore: (
        id: string,
        update: Partial<ComponentRecord>,
        skipDbWrite?: boolean
    ) => void,
    deleteComponentFromLocalStore: (id: string) => void,
    isPencilModeRef: MutableRefObject<boolean>,
    createTextAtSurfaceRef: MutableRefObject<
        ((x: number, y: number) => void) | null
    >,
    onCameraChangeRef: MutableRefObject<
        ((event: CameraChangeEvent) => void) | undefined
    >
): ZuiHandle {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let shape: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastSelectedShape: any = null
    // Tracks the GroupedObjectWrapper's Two.js group while it has DOM focus.
    // Set/cleared by groupFocused/groupBlurred custom events.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeGroupRef: { current: any } = { current: null }
    const domElement: HTMLElement = two.renderer.domElement
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zui: any = new ZUI(two.scene, domElement)
    const mouse = new Two.Vector()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let touches: Record<string, any> = {}
    let distance = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastTouch: any = null
    let touchStartX = 0
    let touchStartY = 0
    let twoFingerMidX = 0
    let twoFingerMidY = 0
    let lastTapTime = 0
    let lastTapX = 0
    let lastTapY = 0
    // Single-finger pan-mode state: when the toolbar pan button is active,
    // a one-finger touchstart begins panning the surface (instead of routing
    // to a synthetic mousedown). Cleared on touchend.
    let isSinglePanning = false
    let panLastX = 0
    let panLastY = 0
    let dragging = false
    let isResizeEvent = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentPath: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastAddedPath: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paths: any[] = []

    // Velocity-based pencil state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pencilGroup: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pencilPath: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pencilRawPoints: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastPencilPoint: any = null
    let lastPencilTime = 0
    let lastPencilLinewidth: number | null = null

    let viewportSaveTimer: ReturnType<typeof setTimeout> | null = null
    let scenario: string | null = null
    const SCENARIO_JUST_ADDED_ELEMENT = 'justAddedElement'
    const SCENARIO_PENCIL_MODE = 'pencilMode'
    const SCENARIO_ARROW_DRAW = 'arrowDraw'
    const SCENARIO_DRAW_SHAPE = 'drawShape'
    const SCENARIO_TEXT_DRAW = 'textDraw'
    const SCENARIO_RUBBER_MODE = 'rubberMode'
    const SCENARIO_GEO_POINT = 'geoPoint'
    const SCENARIO_GEO_DRAW = 'geoDraw'
    const SCENARIO_DEFAULT = null

    const pendingDeletionSet = new Set<string>()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let arrowDrawElement: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let textDrawElement: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let drawOrigin: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let drawCurrentCoords: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let previewShape: any = null
    let drawShapeType: string | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let drawShapeProps: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastPlacedElement: any = null
    // Empty-canvas mousedown stores its origin here. The dotted group
    // selector is only materialised on the first mousemove, so a click
    // without drag never produces a stray rectangle (and dblclick on
    // empty canvas can spawn a text element cleanly).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pendingGroupSelectorOrigin: any = null

    // ── Geo multi-click draw state (area / route) ────────────────────────────
    // Vertices are surface coords; preview dots/lines live in two.scene so ZUI
    // transforms them like everything else. Built into a component on finish.
    let geoDrawType: 'area' | 'route' | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let geoDrawProps: any = null
    let geoVertices: { x: number; y: number }[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let geoDots: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let geoLines: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let geoPreviewLine: any = null

    const toSurface = (e: { clientX: number; clientY: number }) =>
        zui.clientToSurface(e.clientX, e.clientY)
    zui.addLimits(0.06, 8)

    const setRootCursor = (cursor: string) => {
        const root = document.getElementById('main-two-root')
        if (root) root.style.cursor = cursor
    }

    // ── Geo multi-click draw helpers (area / route) ──────────────────────────
    const addGeoVertex = (x: number, y: number) => {
        geoVertices.push({ x, y })
        // Read the live element defaults (kept in sync via useEffect) so a
        // stroke/width change made in the geo panel mid-draw is reflected
        // immediately — same contract as pencil. Falls back to the props
        // stashed at tool-pick, then the global shape default.
        const stroke =
            defaultStrokeColorValue ||
            geoDrawProps?.stroke ||
            SHAPE_DEFAULT_STROKE
        const lw = defaultLinewidthValue || geoDrawProps?.linewidth || 2
        const dot = two.makeCircle(x, y, 4)
        dot.fill = stroke
        dot.noStroke()
        geoDots.push(dot)
        if (geoVertices.length >= 2) {
            const prev = geoVertices[geoVertices.length - 2]!
            const line = two.makeLine(prev.x, prev.y, x, y)
            line.stroke = stroke
            line.linewidth = lw
            line.opacity = 0.6
            geoLines.push(line)
        }
        two.update()
    }

    const updateGeoPreview = (sx: number, sy: number) => {
        if (!geoDrawType || geoVertices.length === 0) return
        const last = geoVertices[geoVertices.length - 1]!
        const stroke =
            defaultStrokeColorValue ||
            geoDrawProps?.stroke ||
            SHAPE_DEFAULT_STROKE
        const lw = defaultLinewidthValue || geoDrawProps?.linewidth || 2
        if (geoPreviewLine) {
            geoPreviewLine.vertices[0].set(last.x, last.y)
            geoPreviewLine.vertices[1].set(sx, sy)
        } else {
            geoPreviewLine = two.makeLine(last.x, last.y, sx, sy)
            geoPreviewLine.stroke = stroke
            geoPreviewLine.linewidth = lw
            geoPreviewLine.opacity = 0.35
        }
        two.update()
    }

    const clearGeoPreviewArtifacts = () => {
        geoDots.forEach((d) => two.remove(d))
        geoLines.forEach((l) => two.remove(l))
        if (geoPreviewLine) two.remove(geoPreviewLine)
        geoDots = []
        geoLines = []
        geoPreviewLine = null
        two.update()
    }

    const resetGeoDrawState = () => {
        geoDrawType = null
        geoDrawProps = null
        geoVertices = []
        localStorage.removeItem(GEO_DRAW_MODE_KEY)
        localStorage.removeItem(GEO_DRAW_TYPE_KEY)
        localStorage.removeItem(GEO_DRAW_PROPS_KEY)
        domElement.removeEventListener('mousemove', mousemove, false)
    }

    const cancelGeoDraw = () => {
        clearGeoPreviewArtifacts()
        resetGeoDrawState()
        setRootCursor('auto')
    }

    // Finish a multi-click area/route. `dropLast` strips the duplicate vertex
    // that the second mousedown of a double-click adds. Below the minimum vertex
    // count, the draw is discarded.
    const finishGeoDraw = ({
        dropLast = false,
    }: { dropLast?: boolean } = {}) => {
        if (!geoDrawType) return
        let verts = geoVertices.slice()
        if (dropLast && verts.length > 0) verts = verts.slice(0, -1)

        if (verts.length < GEO_MIN_VERTICES[geoDrawType]) {
            cancelGeoDraw()
            setPointerElement('pointer')
            return
        }

        const type = geoDrawType
        const originX = Math.floor(verts[0]!.x)
        const originY = Math.floor(verts[0]!.y)
        const finalId = generateUUID()
        const finalShapeData = {
            ...(geoDrawProps || {}),
            id: finalId,
            componentType: type,
            objectClass: 'geo',
            // Stroke/width/type come from the live element defaults so geo
            // draws honor edits made in the panel (just like pencil/shapes),
            // sharing the one default set across shapes/pencil/geo.
            stroke:
                defaultStrokeColorValue ||
                geoDrawProps?.stroke ||
                SHAPE_DEFAULT_STROKE,
            linewidth: defaultLinewidthValue || geoDrawProps?.linewidth || 2,
            strokeType: defaultStrokeTypeValue,
            x: originX,
            y: originY,
            x1: 0,
            x2: 0,
            y1: 0,
            y2: 0,
            width: 0,
            height: 0,
            radius: null,
            iconStroke: null,
            isDummy: null,
            createdAt: null,
            children: {},
            // Absolute vertex coords (same convention as pencil).
            metadata: verts.map((v) => ({
                x: Math.round(v.x),
                y: Math.round(v.y),
            })),
        }

        clearGeoPreviewArtifacts()
        resetGeoDrawState()
        addToLocalComponentStore(
            finalId,
            type,
            finalShapeData as unknown as ComponentRecord
        )
        setSelectedComponentInBoard(null)
        setPointerElement('pointer')
        setRootCursor('auto')
    }

    window.addEventListener('cancelGeoDraw', () => {
        if (geoDrawType) cancelGeoDraw()
    })

    window.addEventListener('keydown', (e: KeyboardEvent) => {
        if (!geoDrawType) return
        if (e.key === 'Enter' || e.key === 'Escape') {
            e.preventDefault()
            finishGeoDraw({})
        }
    })

    const selectionController = new SelectionController({
        two,
        zui,
        domElement,
        onSelect: (toolbarState) => {
            setSelectedComponentInBoard(toolbarState)
        },
        onDeselect: () => {
            setSelectedComponentInBoard(null)
        },
        commit: (id, patch) => {
            updateComponentBulkPropertiesInLocalStore(id, patch)
        },
        onDelete: (group) => {
            const id = group?.elementData?.id
            if (id) deleteComponentFromLocalStore(id)
            two.remove([group])
            two.update()
        },
    })

    domElement.addEventListener('mousedown', mousedown, false)
    domElement.addEventListener('mousemove', hoverDetectMove, false)
    domElement.addEventListener('dblclick', dblclick, false)
    domElement.addEventListener(
        'mousewheel',
        mousewheel as EventListener,
        false
    )
    domElement.addEventListener('wheel', mousewheel, false)

    domElement.addEventListener('touchstart', touchstart, { passive: false })
    domElement.addEventListener('touchmove', touchmove, { passive: false })
    domElement.addEventListener('touchend', touchend, false)
    domElement.addEventListener('touchcancel', touchend, false)

    window.addEventListener('groupFocused', ((e: CustomEvent) => {
        activeGroupRef.current = e.detail?.group ?? null
    }) as EventListener)
    window.addEventListener('groupBlurred', () => {
        activeGroupRef.current = null
    })

    function dblclick(e: MouseEvent) {
        // In a multi-click geo draw, a double-click finishes it. Drop the
        // duplicate vertex the second mousedown added.
        if (geoDrawType) {
            finishGeoDraw({ dropLast: true })
            return
        }
        shape = null
        mouse.x = e.clientX
        mouse.y = e.clientY
        let avoidDragging = false
        // Hide all arrow endpoint circles before processing the new selection
        two.scene.children.forEach((child: any) => {
            if (child?.elementData?.componentType === 'arrowLine') {
                setArrowEndpointsVisible(child, false)
            }
        })

        const path =
            (e as MouseEvent & { path?: EventTarget[] }).path ||
            (e.composedPath && e.composedPath())
        ;({ shape, avoidDragging } = resolveShapeFromPath(path, two))

        if (avoidDragging) {
            shape = {}
        }

        // Empty-canvas dblclick → create new text element at click point.
        // Skipped if a shape was hit (preserve dblclick-to-edit), if the
        // dblclick landed on avoid-dragging UI, or if a draw mode is active.
        if (!avoidDragging && (!shape || Object.keys(shape).length === 0)) {
            const inDrawMode =
                isPencilModeRef?.current === true ||
                arrowDrawElement !== null ||
                localStorage.getItem(RUBBER_MODE_KEY) === 'true' ||
                localStorage.getItem(TEXT_DRAW_MODE_KEY) === 'true' ||
                localStorage.getItem(ARROW_DRAW_MODE_KEY) === 'true' ||
                localStorage.getItem(GEO_DRAW_MODE_KEY) === 'true' ||
                localStorage.getItem(GEO_POINT_PLACE_MODE_KEY) === 'true' ||
                localStorage.getItem(PENDING_SHAPE_TYPE_KEY) !== null
            if (!inDrawMode && createTextAtSurfaceRef?.current) {
                const surfaceCoords = toSurface(e)
                createTextAtSurfaceRef.current(surfaceCoords.x, surfaceCoords.y)
                return
            }
        }

        const showTextInput = (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            group: any,
            componentId: string,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            currentMetadata: any
        ) => {
            const groupDomElem = document.getElementById(`${group.id}`)
            if (!groupDomElem) return

            const shapeKind = group?.elementData?.componentType
            // The shape Path child (rectangle/ellipse/diamond). The text layer
            // is a Group with no numeric width, so this still resolves the
            // geometry node and lets us auto-grow it while typing.
            const rectChild = group.children.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (c: any) =>
                    typeof c.value !== 'string' &&
                    typeof c.width === 'number' &&
                    typeof c.height === 'number'
            )

            // Anchor the textarea over the shape's screen box — its center is
            // where the centered text block sits, valid whether or not text
            // exists yet.
            const anchorElem =
                rectChild?._renderer?.elem ?? (groupDomElem as Element)
            const screenRect = anchorElem.getBoundingClientRect()

            // Hide the text layer (not the shape) while the textarea overlays.
            const textLayer = findShapeTextLayer(group)
            const layerElem = textLayer?._renderer?.elem as
                | HTMLElement
                | undefined
            if (layerElem) layerElem.style.display = 'none'
            selectionController.ui.visible = false
            two.update()

            const rawLiveMeta =
                group.elementData?.metadata || currentMetadata || {}
            // A shape that's never had text has no `textFontSize` —
            // shapeTextStyleFromMeta would fall back to its hardcoded 24px
            // ("S"). Seed it from the user's current default text size (the
            // defaults toolbar) so new shape-text honors the last-set size.
            const liveMeta = {
                ...rawLiveMeta,
                textFontSize: rawLiveMeta.textFontSize ?? defaultTextSizeValue,
            }
            const { style: textStyle } = shapeTextStyleFromMeta(liveMeta)
            const fontSize = textStyle.size || DEFAULT_TEXT_SIZE
            // Two.js renders text at `fontSize * sceneScale` screen pixels.
            // Match the textarea/measureSpan to that so visuals stay in sync
            // and the surface-unit math (measuredW / zoom) remains correct.
            const sceneScale = two?.scene?.scale || 1
            const cssFontSize = fontSize * sceneScale
            // Use a generous line-height so ascenders/descenders are
            // never clipped. A LINE_HEIGHT_MULTIPLIER× covers most font metrics.
            const lineH = Math.ceil(cssFontSize * LINE_HEIGHT_MULTIPLIER)
            // Vertical padding inside the textarea prevents the top of
            // tall glyphs (H, d, l …) from being cut off by the element
            // boundary. Half the difference between lineH and cssFontSize
            // approximates the ascender headroom the browser needs.
            const vertPad = Math.ceil((lineH - cssFontSize) / 2) + 4

            const input = document.createElement('textarea')
            const randomId = Math.floor(Math.random() * 90 + 10)
            input.id = `new-text-input-area-${randomId}`
            // Edit the RAW text (hard newlines preserved) — the wrapped
            // layout shown on canvas is derived, never the source of truth.
            input.value =
                typeof liveMeta.textContent === 'string'
                    ? liveMeta.textContent
                    : ''
            input.rows = 1
            input.style.border = 'none'
            input.style.background = 'transparent'
            input.style.padding = `${vertPad}px 8px`
            input.style.color = textStyle.fill || '#3A342C'
            input.style.fontSize = `${cssFontSize}px`
            input.style.fontFamily = textStyle.family || 'Caveat'
            input.style.fontWeight = String(textStyle.weight ?? 'normal')
            input.style.lineHeight = `${lineH}px`
            input.style.letterSpacing = '0px'
            input.style.textAlign = 'left'
            input.style.position = 'absolute'
            input.style.outline = 'none'
            input.style.resize = 'none'
            input.style.overflow = 'hidden'
            // Wrap inside the shape (don't run past it horizontally); long
            // words break so the box can squeeze to 1 char/line.
            input.style.whiteSpace = 'pre-wrap'
            input.style.overflowWrap = 'anywhere'
            input.style.boxSizing = 'border-box'
            input.className = 'temp-input-area'

            // Anchor point: the SVG text element's screen-space center
            const centerX = screenRect.left + screenRect.width / 2
            const centerY = screenRect.top + screenRect.height / 2

            // px-per-surface-unit derived from the shape's current screen
            // size; converts the textarea's pixel measurement back into
            // Two.js surface units before growing the shape.
            const rectScreen =
                rectChild?._renderer?.elem?.getBoundingClientRect()
            const zoom =
                rectChild && rectScreen && rectChild.width
                    ? rectScreen.width / rectChild.width
                    : 1

            document.getElementById('main-two-root')?.append(input)

            // ── Offscreen measurement helper ──
            // We create a hidden <span> with identical font styles and
            // read its offsetWidth/offsetHeight. This is more reliable
            // than textarea.scrollWidth which can be affected by cols,
            // min intrinsic sizing, and platform differences.
            // The textarea content width = the shape's usable inner width
            // (screen px), so wrapping mirrors the committed render and the
            // box never spills outside the shape horizontally.
            const surfaceW = rectChild?.width || screenRect.width / zoom
            const usableScreenW = Math.max(
                Math.round(usableTextWidth(shapeKind, surfaceW) * zoom),
                Math.ceil(cssFontSize) // never below ~1 glyph
            )
            const PAD_X = 8

            const measureSpan = document.createElement('span')
            measureSpan.style.position = 'absolute'
            measureSpan.style.visibility = 'hidden'
            measureSpan.style.display = 'inline-block'
            measureSpan.style.whiteSpace = 'pre-wrap'
            measureSpan.style.overflowWrap = 'anywhere'
            measureSpan.style.width = `${usableScreenW}px`
            measureSpan.style.fontSize = `${cssFontSize}px`
            measureSpan.style.fontFamily = textStyle.family || 'Caveat'
            measureSpan.style.fontWeight = String(textStyle.weight ?? 'normal')
            measureSpan.style.lineHeight = `${lineH}px`
            measureSpan.style.letterSpacing = '0px'
            measureSpan.style.padding = '0'
            measureSpan.style.boxSizing = 'content-box'
            document.body.appendChild(measureSpan)

            const autoSizeAndCenter = () => {
                // Measure wrapped height at the fixed usable width.
                const val = input.value || 'M'
                measureSpan.textContent = val
                const measuredH = measureSpan.offsetHeight

                const contentWidth = usableScreenW + PAD_X * 2
                const contentHeight = Math.max(
                    measuredH + vertPad * 2,
                    lineH + vertPad * 2
                )

                input.style.width = `${contentWidth}px`
                input.style.height = `${contentHeight}px`

                // Centre over the shape midpoint. Width is fixed to the
                // shape's usable width, so the box stays inside the shape;
                // only the height grows as lines are added.
                input.style.left = `${centerX - contentWidth / 2}px`
                input.style.top = `${centerY - contentHeight / 2}px`

                // Grow ONLY the shape height to fit the wrapped lines
                // (width is user-driven). Symmetric growth keeps the centre
                // fixed, so centerX/centerY stay valid.
                if (rectChild) {
                    const textSurfaceH = measuredH / zoom
                    const { h: nextH } = growShapeToFitText(
                        shapeKind,
                        rectChild.width,
                        rectChild.height,
                        0,
                        textSurfaceH
                    )
                    if (rectChild.height < nextH) {
                        rectChild.height = nextH
                        two.update()
                    }
                }
            }

            autoSizeAndCenter()

            // Re-measure on every keystroke so the box grows with the text
            input.addEventListener('input', autoSizeAndCenter)

            input.focus()

            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    if (event.shiftKey) {
                        // Shift+Enter: let the textarea insert a hard newline
                        // (whiteSpace:'pre-wrap' preserves it; reflow on
                        // commit re-wraps to the shape width).
                        return
                    }
                    // Plain Enter commits and closes the editor.
                    event.preventDefault()
                    input.blur()
                }
                if (event.key === 'Escape') {
                    event.preventDefault()
                    input.blur()
                }
            })

            input.addEventListener('blur', () => {
                // Clean up the input listener and measurement span
                input.removeEventListener('input', autoSizeAndCenter)
                if (measureSpan.parentNode) {
                    measureSpan.parentNode.removeChild(measureSpan)
                }

                if (layerElem) layerElem.style.display = ''
                // mousedown fires before blur, so if the user clicked empty
                // canvas, detach() already ran and currentGroup is null.
                // Only restore the selection UI if we still have a target.
                if (selectionController.currentGroup) {
                    selectionController.ui.visible = true
                    selectionController.syncToTarget()
                }
                two.update()

                // Raw text — may contain hard newlines from Shift+Enter.
                const newContent = input.value

                if (componentId) {
                    // Use the live elementData.metadata (updated by toolbar ops
                    // like font-size and text-color) rather than the stale
                    // snapshot captured at dblclick time.
                    const latestMeta = group.elementData?.metadata || {}
                    const updatedMetadata = {
                        ...latestMeta,
                        hasText: true,
                        textContent: newContent,
                        textFill: latestMeta.textFill || textStyle.fill,
                        textFontSize: latestMeta.textFontSize || textStyle.size,
                        textFamily: latestMeta.textFamily || textStyle.family,
                        textFontFamily:
                            latestMeta.textFontFamily || textStyle.family,
                        textBaseLine:
                            latestMeta.textBaseLine ||
                            textStyle.baseline ||
                            'middle',
                    }
                    // Re-wrap the raw text to the (possibly grown) box width
                    // and rebuild the multiline layer.
                    applyShapeText(
                        two,
                        group,
                        shapeKind,
                        rectChild?.width || screenRect.width,
                        updatedMetadata
                    )
                    two.update()

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const persistPayload: any = { metadata: updatedMetadata }
                    if (rectChild) {
                        persistPayload.width = Math.round(rectChild.width)
                        persistPayload.height = Math.round(rectChild.height)
                    }
                    updateComponentBulkPropertiesInLocalStore(
                        componentId,
                        persistPayload
                    )
                    // Keep the live group's elementData in sync so consumers
                    // that read from it (copy/paste, toolbar) see the latest
                    // text content without waiting for a re-render.
                    if (group.elementData) {
                        group.elementData.metadata = updatedMetadata
                        if (rectChild) {
                            group.elementData.width = persistPayload.width
                            group.elementData.height = persistPayload.height
                        }
                    }
                }

                input.remove()
            })
        }

        if (shape !== null && !isPencilModeRef?.current) {
            const ct = shape.elementData?.componentType
            if (
                ct === componentTypes.rectangle ||
                ct === componentTypes.diamond ||
                ct === componentTypes.circle
            ) {
                const meta = shape.elementData.metadata || {}
                showTextInput(shape, shape.elementData.id, meta)
            }
        }
    }

    function eraseElementAtPoint(x: number, y: number) {
        const el = document.elementFromPoint(x, y)
        if (!el) return

        let target: Element | null = el
        let componentId: string | null = null
        while (target && target !== document.body) {
            componentId = target.getAttribute?.('data-component-id') ?? null
            if (componentId) break
            target = target.parentElement
        }
        if (!componentId || pendingDeletionSet.has(componentId)) return

        const group = two.scene.children.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (c: any) => c?.elementData?.id === componentId
        )
        if (!group) return

        pendingDeletionSet.add(componentId)
        group.opacity = 0.3
        two.update()

        setTimeout(() => {
            two.remove([group])
            two.update()
            deleteComponentFromLocalStore(componentId)
            pendingDeletionSet.delete(componentId)
        }, 1000)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastHoveredCircleGroup: any = null

    // Singleton hover indicator — separate from the selection circles
    const hoverCircle = two.makeCircle(0, 0, 6)
    hoverCircle.fill = HOVER_COLOR
    hoverCircle.noStroke()
    hoverCircle.opacity = 0

    function hoverDetectMove(e: MouseEvent) {
        // No arrow-endpoint hover while drawing/placing a geo object.
        if (
            geoDrawType ||
            localStorage.getItem(GEO_POINT_PLACE_MODE_KEY) === 'true'
        ) {
            return
        }
        if (!isSelectPanMode(isPencilModeRef.current)) {
            if (lastHoveredCircleGroup) {
                hoverCircle.opacity = 0
                two.update()
                lastHoveredCircleGroup = null
            }
            return
        }

        const worldPos = toSurface(e)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let found: any = null
        let foundWx = 0
        let foundWy = 0

        for (const child of two.scene.children) {
            if (child?.elementData?.componentType !== 'arrowLine') continue
            const gx = child.translation.x
            const gy = child.translation.y
            for (const circleGroup of [child.children[1], child.children[2]]) {
                if (!circleGroup) continue
                const wx = gx + circleGroup.translation.x
                const wy = gy + circleGroup.translation.y
                const dist = Math.sqrt(
                    (worldPos.x - wx) ** 2 + (worldPos.y - wy) ** 2
                )
                if (dist < HOVER_THRESHOLD) {
                    found = circleGroup
                    foundWx = wx
                    foundWy = wy
                    break
                }
            }
            if (found) break
        }

        if (found) {
            hoverCircle.translation.x = foundWx
            hoverCircle.translation.y = foundWy
            if (found !== lastHoveredCircleGroup) hoverCircle.opacity = 1
            two.update()
        } else if (lastHoveredCircleGroup) {
            hoverCircle.opacity = 0
            two.update()
        }
        lastHoveredCircleGroup = found ?? null
    }

    function mousedown(e: MouseEvent) {
        // initialize shape definition
        const lastAddedElementId = localStorage.getItem(
            LAST_ADDED_ELEMENT_ID_KEY
        )

        // Controller handle check — runs before the bare-canvas clearSelector
        // dispatch and the DOM path walk. Corner handles can extend slightly
        // beyond the element's SVG bounds, so relying on path-walking would
        // miss clicks that land in the handle's radius but outside the shape.
        if (selectionController.currentGroup) {
            const hit = selectionController.hitTest(e.clientX, e.clientY)
            if (hit) {
                selectionController.beginInteraction(e, hit)
                return
            }
        }

        if (
            (e?.srcElement as Element & { lastChild?: Element })?.lastChild
                ?.id === 'two-0'
        ) {
            let evt = new CustomEvent('clearSelector', {})
            window.dispatchEvent(evt)
        }

        // Reset scenario to prevent stale state from a previous interaction
        // (e.g. mouse released outside the canvas during a draw)
        scenario = SCENARIO_DEFAULT

        // Clean up orphaned draw state from an interrupted drag
        // (e.g. user moved cursor outside canvas and released mouse there)
        if (previewShape) {
            two.remove(previewShape)
            two.update()
            previewShape = null
        }
        if (drawOrigin) {
            drawOrigin = null
            drawCurrentCoords = null
            drawShapeType = null
            drawShapeProps = null
            domElement.removeEventListener('mousemove', mousemove, false)
            domElement.removeEventListener('mouseup', mouseup, false)
        }

        if (isDrawing === true) {
            scenario = SCENARIO_PENCIL_MODE
        }

        const arrowDrawMode = localStorage.getItem(ARROW_DRAW_MODE_KEY)
        const textDrawMode = localStorage.getItem(TEXT_DRAW_MODE_KEY)
        const pendingShapeType = localStorage.getItem(PENDING_SHAPE_TYPE_KEY)
        const rubberMode = localStorage.getItem(RUBBER_MODE_KEY)
        const geoPointPlaceMode = localStorage.getItem(GEO_POINT_PLACE_MODE_KEY)
        const geoDrawMode = localStorage.getItem(GEO_DRAW_MODE_KEY)
        if (rubberMode === 'true') {
            scenario = SCENARIO_RUBBER_MODE
        } else if (arrowDrawMode === 'true') {
            scenario = SCENARIO_ARROW_DRAW
        } else if (textDrawMode === 'true') {
            scenario = SCENARIO_TEXT_DRAW
        } else if (geoPointPlaceMode === 'true') {
            // checked before JUST_ADDED_ELEMENT: point place also sets
            // LAST_ADDED_ELEMENT_ID_KEY (the pre-created point).
            scenario = SCENARIO_GEO_POINT
        } else if (geoDrawMode === 'true') {
            scenario = SCENARIO_GEO_DRAW
        } else if (pendingShapeType !== null) {
            scenario = SCENARIO_DRAW_SHAPE
        } else if (lastAddedElementId !== null) {
            scenario = SCENARIO_JUST_ADDED_ELEMENT
        }

        switch (scenario) {
            case SCENARIO_ARROW_DRAW: {
                const surfaceCoords = toSurface(e)
                const arrowId = localStorage.getItem(LAST_ADDED_ELEMENT_ID_KEY)

                localStorage.removeItem(LAST_ADDED_ELEMENT_ID_KEY)
                localStorage.removeItem(ARROW_DRAW_MODE_KEY)

                domElement.addEventListener('mousemove', mousemove, false)
                domElement.addEventListener('mouseup', mouseup, false)

                setRootCursor('crosshair')

                // On first use the arrowLine module loads lazily — poll until the
                // React element appears in the scene before positioning it.
                // mousemove/mouseup already guard on arrowDrawElement being non-null,
                // so they are safe no-ops until this resolves.
                pollUntilElement(
                    two,
                    arrowId ?? '',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (el: any) => {
                        arrowDrawElement = el
                        arrowDrawElement.position.x = surfaceCoords.x
                        arrowDrawElement.position.y = surfaceCoords.y

                        const line = arrowDrawElement.children[0]
                        const pointCircle1Group = arrowDrawElement.children[1]
                        const pointCircle2Group = arrowDrawElement.children[2]

                        updateX1Y1Vertices(
                            Two,
                            line,
                            0,
                            0,
                            pointCircle1Group,
                            two
                        )
                        updateX2Y2Vertices(
                            Two,
                            line,
                            0,
                            0,
                            pointCircle2Group,
                            two
                        )
                        two.update()
                    },
                    { maxRetries: 30 }
                )

                break
            }
            case SCENARIO_TEXT_DRAW: {
                const surfaceCoords = toSurface(e)
                const textId = localStorage.getItem(LAST_ADDED_ELEMENT_ID_KEY)

                textDrawElement = two.scene.children.find(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (child: any) => child?.elementData?.id === textId
                )

                if (textDrawElement && textId) {
                    // Position the text at the clicked point
                    textDrawElement.position.x = surfaceCoords.x
                    textDrawElement.position.y = surfaceCoords.y
                    two.update()

                    // Update the component position in the store
                    updateComponentVertices(
                        textId,
                        surfaceCoords.x,
                        surfaceCoords.y
                    )
                }

                localStorage.removeItem(LAST_ADDED_ELEMENT_ID_KEY)
                localStorage.removeItem(TEXT_DRAW_MODE_KEY)

                domElement.addEventListener('mouseup', mouseup, false)
                setRootCursor('auto')
                break
            }
            case SCENARIO_GEO_POINT: {
                const surfaceCoords = toSurface(e)
                const pointId = localStorage.getItem(LAST_ADDED_ELEMENT_ID_KEY)

                localStorage.removeItem(LAST_ADDED_ELEMENT_ID_KEY)
                localStorage.removeItem(GEO_POINT_PLACE_MODE_KEY)

                // The point module loads lazily on first use — poll until the
                // pre-created element appears, then drop it at the click point.
                if (pointId) {
                    pollUntilElement(
                        two,
                        pointId,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (el: any) => {
                            el.position.x = surfaceCoords.x
                            el.position.y = surfaceCoords.y
                            two.update()
                            updateComponentVertices(
                                pointId,
                                surfaceCoords.x,
                                surfaceCoords.y
                            )
                        },
                        { maxRetries: 30 }
                    )
                }

                setSelectedComponentInBoard(null)
                setPointerElement('pointer')
                setRootCursor('auto')
                break
            }
            case SCENARIO_GEO_DRAW: {
                const surfaceCoords = toSurface(e)
                // First click of this draw — capture type/props from storage.
                if (!geoDrawType) {
                    geoDrawType = localStorage.getItem(GEO_DRAW_TYPE_KEY) as
                        | 'area'
                        | 'route'
                        | null
                    geoDrawProps = JSON.parse(
                        localStorage.getItem(GEO_DRAW_PROPS_KEY) ?? 'null'
                    )
                    geoVertices = []
                    domElement.addEventListener('mousemove', mousemove, false)
                }
                if (geoDrawType) {
                    addGeoVertex(surfaceCoords.x, surfaceCoords.y)
                    setRootCursor('crosshair')
                }
                break
            }
            case SCENARIO_DRAW_SHAPE: {
                const surfaceCoords = toSurface(e)
                drawOrigin = { x: surfaceCoords.x, y: surfaceCoords.y }
                drawCurrentCoords = { x: surfaceCoords.x, y: surfaceCoords.y }
                drawShapeType = localStorage.getItem(PENDING_SHAPE_TYPE_KEY)
                drawShapeProps = JSON.parse(
                    localStorage.getItem(PENDING_SHAPE_PROPS_KEY) ?? 'null'
                )

                localStorage.removeItem(PENDING_SHAPE_TYPE_KEY)
                localStorage.removeItem(PENDING_SHAPE_PROPS_KEY)

                if (drawShapeType === 'circle') {
                    previewShape = two.makeEllipse(
                        surfaceCoords.x,
                        surfaceCoords.y,
                        0,
                        0
                    )
                } else if (drawShapeType === 'rectangle') {
                    previewShape = two.makeRoundedRectangle(
                        surfaceCoords.x,
                        surfaceCoords.y,
                        0,
                        0,
                        3
                    )
                } else if (drawShapeType === 'diamond') {
                    previewShape = createDiamondPath(two, 0, 0, 6)
                    previewShape.translation.set(
                        surfaceCoords.x,
                        surfaceCoords.y
                    )
                }

                if (previewShape) {
                    previewShape.fill = drawShapeProps?.fill || '#fff'
                    previewShape.stroke =
                        drawShapeProps?.stroke || SHAPE_DEFAULT_STROKE
                    previewShape.linewidth = drawShapeProps?.linewidth || 1
                    previewShape.opacity = DEFAULT_PREVIEW_OPACITY
                    two.update()
                }

                domElement.addEventListener('mousemove', mousemove, false)
                domElement.addEventListener('mouseup', mouseup, false)
                setRootCursor('crosshair')
                break
            }
            case SCENARIO_JUST_ADDED_ELEMENT:
                domElement.addEventListener('mousemove', mousemove, false)

                // This block falls for the case when there is newly added element and we let user click
                // anywhere to set last added element's position
                const surfaceCoords = toSurface(e)

                let twoJSElement = two.scene.children.find(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (child: any) =>
                        child?.elementData?.id === lastAddedElementId
                )

                if (twoJSElement?.position && lastAddedElementId) {
                    twoJSElement.position.x = surfaceCoords.x
                    twoJSElement.position.y = surfaceCoords.y

                    two.update()

                    updateComponentVertices(
                        lastAddedElementId,
                        surfaceCoords.x,
                        surfaceCoords.y
                    )

                    lastPlacedElement = twoJSElement
                }

                localStorage.removeItem(LAST_ADDED_ELEMENT_ID_KEY)

                // remove event listeners for mousemove
                // domElement.removeEventListener('mousemove', mousemove, false)

                domElement.addEventListener('mousemove', mousemove, false)
                domElement.addEventListener('mouseup', mouseup, false)

                setRootCursor('auto')
                break
            case SCENARIO_PENCIL_MODE: {
                domElement.addEventListener('mousemove', mousemove, false)
                domElement.addEventListener('mouseup', mouseup, false)

                // Single growing curved path for live preview — matches the
                // final factory render so there's no visual jump on mouseup.
                pencilGroup = two.makeGroup()
                pencilRawPoints = []
                lastPencilLinewidth = defaultLinewidthValue

                const startCoords = toSurface(e)
                lastPencilPoint = { x: startCoords.x, y: startCoords.y }
                lastPencilTime = performance.now()
                pencilRawPoints.push({
                    x: startCoords.x,
                    y: startCoords.y,
                    lw: lastPencilLinewidth,
                })

                // Note: two.makePath only treats numeric (x, y) pair args as
                // vertices. Passing a Two.Anchor here would be silently dropped,
                // leaving the path empty and missing the mousedown start point.
                pencilPath = two.makePath()
                pencilPath.vertices.push(
                    new Two.Anchor(startCoords.x, startCoords.y)
                )
                pencilPath.noFill()
                pencilPath.stroke = defaultStrokeColorValue
                pencilPath.linewidth = defaultLinewidthValue
                pencilPath.cap = 'round'
                pencilPath.join = 'round'
                pencilPath.closed = false
                pencilGroup.add(pencilPath)
                break
            }
            case SCENARIO_RUBBER_MODE: {
                domElement.addEventListener('mousemove', mousemove, false)
                domElement.addEventListener('mouseup', mouseup, false)
                eraseElementAtPoint(e.clientX, e.clientY)
                break
            }
            default:
                shape = null
                mouse.x = e.clientX
                mouse.y = e.clientY
                let avoidDragging = false
                let isGroupSelector = false

                // Snapshot before clearing — used below to select arrow by endpoint click
                const hoveredEndpointGroup = lastHoveredCircleGroup

                // Hide all arrow endpoint circles and hover indicator before processing the new selection
                lastHoveredCircleGroup = null
                hoverCircle.opacity = 0
                two.scene.children.forEach((child: any) => {
                    if (child?.elementData?.componentType === 'arrowLine') {
                        setArrowEndpointsVisible(child, false)
                    }
                })

                const path =
                    (e as MouseEvent & { path?: EventTarget[] }).path ||
                    (e.composedPath && e.composedPath())
                ;({ shape, avoidDragging } = resolveShapeFromPath(path, two))

                // Endpoint circles are opacity:0 so pointer-events don't fire on them.
                // If the cursor was hovering over an endpoint (hoverCircle was visible),
                // use that to select the parent arrow — only in select/pan mode.
                if (shape === null && hoveredEndpointGroup) {
                    const parentArrow = two.scene.children.find(
                        (child: any) =>
                            child?.elementData?.componentType === 'arrowLine' &&
                            (child.children[1] === hoveredEndpointGroup ||
                                child.children[2] === hoveredEndpointGroup)
                    )
                    if (parentArrow) {
                        setArrowEndpointsVisible(parentArrow, true)
                        shape = parentArrow
                    }
                }

                // Track for copy BEFORE drag-prevention clears shape (pencil uses
                // avoid-dragging so shape would become {} immediately after).
                if (shape?.elementData?.id) {
                    lastSelectedShape = shape
                }

                if (avoidDragging) {
                    shape = {}
                }

                if (shape === null) {
                    // Clicking empty canvas clears any active selection.
                    lastSelectedShape = null
                    selectionController.detach()
                    // When a text input overlay is active (about to blur),
                    // the click is just dismissing the input — skip the
                    // pending-selector setup so no rect is ever materialised.
                    const activeTextInput =
                        document.querySelector('.temp-input-area')

                    if (activeTextInput) {
                        shape = {}
                        avoidDragging = true
                    } else {
                        // Defer rect creation to the first mousemove. We
                        // still need mousemove/mouseup wired up below so
                        // the next mousemove can materialise the selector.
                        pendingGroupSelectorOrigin = toSurface(e)
                        mouse.copy(pendingGroupSelectorOrigin)
                        domElement.addEventListener(
                            'mousemove',
                            mousemove,
                            false
                        )
                        domElement.addEventListener('mouseup', mouseup, false)
                        return
                    }
                }

                // Central selection controller: for shapes registered in its
                // adapter registry, the controller owns selection lifecycle
                // (toolbar open/close) and replaces per-element interactjs
                // resize. If the pointer landed on a resize/rotate handle,
                // the controller claims this gesture and we skip the legacy
                // drag + toolbar wiring below.
                let controllerClaimedGesture = false
                let controllerHandledSelection = false
                if (
                    !avoidDragging &&
                    shape &&
                    !isGroupSelector &&
                    selectionController.canHandle(shape)
                ) {
                    selectionController.attach(shape, shape.children[0])
                    controllerHandledSelection = true
                    const hit = selectionController.hitTest(
                        e.clientX,
                        e.clientY
                    )
                    if (hit) {
                        selectionController.beginInteraction(e, hit)
                        controllerClaimedGesture = true
                    }
                }

                if (controllerClaimedGesture) {
                    two.update()
                    return
                }

                // inserting prevX and prevY to diff at updateToGlobalState function
                // checking if new x,y are not equal to prev x,y
                // then only perform the mutation
                if (!avoidDragging) {
                    shape.elementData = {
                        ...shape?.elementData,
                        isGroupSelector: isGroupSelector,
                        prevX: parseInt(shape.translation.x),
                        prevY: parseInt(shape.translation.y),
                    }

                    const shapeEl = document.getElementById(shape.id)
                    if (shapeEl) {
                        const rect = shapeEl.getBoundingClientRect()
                        dragging =
                            mouse.x > rect.left &&
                            mouse.x < rect.right &&
                            mouse.y > rect.top &&
                            mouse.y < rect.bottom

                        domElement.addEventListener(
                            'mousemove',
                            mousemove,
                            false
                        )
                        domElement.addEventListener('mouseup', mouseup, false)
                    }
                }

                // When an arrow or its endpoint circle is selected, disable pointer
                // events on all other components so interactjs resize handlers on
                // shapes like rectangle don't capture events during arrow drag
                if (
                    !avoidDragging &&
                    (shape?.elementData?.isLineCircle ||
                        shape?.elementData?.componentType === 'arrowLine')
                ) {
                    document
                        .querySelectorAll<HTMLElement>(
                            '.dragger-picker:not(.is-line-circle)'
                        )
                        .forEach((el) => {
                            el.style.pointerEvents = 'none'
                        })
                }

                if (
                    !avoidDragging &&
                    !shape.elementData.isGroupSelector &&
                    !controllerHandledSelection
                ) {
                    selectionController.detach()
                    // this internal state is required for floating toolbar component since floating
                    // toolbar relies on the exact structure/schema for component's internal state
                    // so that any changes made from toolbar can be applied directly on component's two.js properties

                    // For arrow endpoint circle clicks, resolve to the parent arrow group and
                    // the actual line shape so the toolbar has the correct id and target element
                    const isLineCircle =
                        shape?.elementData?.isLineCircle === true
                    const groupForToolbar = isLineCircle
                        ? shape.elementData.parentData
                        : shape
                    const shapeForToolbar = isLineCircle
                        ? shape.elementData.lineData
                        : shape.children[0]

                    // First line node of the text layer (or a legacy direct
                    // text child) — gives the toolbar a representative text
                    // node for shape-with-text enablement.
                    const textChild = getShapeTextNodes(groupForToolbar)[0]

                    let componentInternalState = {
                        element: {
                            [shapeForToolbar.id]: shapeForToolbar,
                            [groupForToolbar.id]: groupForToolbar,
                        },
                        group: {
                            id: groupForToolbar.id,
                            data: groupForToolbar,
                        },
                        shape: {
                            type: groupForToolbar.elementData.componentType,
                            id: shapeForToolbar.id,
                            data: shapeForToolbar,
                        },
                        text: {
                            data: textChild || {},
                        },
                        icon: {
                            data: {},
                        },
                    }
                    setSelectedComponentInBoard(componentInternalState)
                }

                two.update()
        }
    }

    function mousemove(e: MouseEvent) {
        // Multi-click geo draw: rubber-band the preview line to the cursor.
        if (geoDrawType) {
            const s = toSurface(e)
            updateGeoPreview(s.x, s.y)
            return
        }

        const lastAddedElementId = localStorage.getItem(
            LAST_ADDED_ELEMENT_ID_KEY
        )

        if (
            lastAddedElementId !== null &&
            localStorage.getItem(ARROW_DRAW_MODE_KEY) !== 'true' &&
            localStorage.getItem(TEXT_DRAW_MODE_KEY) !== 'true'
        ) {
            scenario = SCENARIO_JUST_ADDED_ELEMENT
        }

        switch (scenario) {
            case SCENARIO_ARROW_DRAW:
                if (arrowDrawElement) {
                    const surfaceCoords = toSurface(e)
                    let relX = surfaceCoords.x - arrowDrawElement.position.x
                    let relY = surfaceCoords.y - arrowDrawElement.position.y

                    if (e.shiftKey) {
                        if (Math.abs(relY) < Math.abs(relX)) {
                            relY = 0
                        } else {
                            relX = 0
                        }
                    }

                    const line = arrowDrawElement.children[0]
                    const pointCircle2Group = arrowDrawElement.children[2]

                    updateX2Y2Vertices(
                        Two,
                        line,
                        relX,
                        relY,
                        pointCircle2Group,
                        two
                    )
                }
                break
            case SCENARIO_DRAW_SHAPE: {
                const surfaceCoordsMove = toSurface(e)
                drawCurrentCoords = {
                    x: surfaceCoordsMove.x,
                    y: surfaceCoordsMove.y,
                }

                const drawWidth = Math.abs(surfaceCoordsMove.x - drawOrigin.x)
                const drawHeight = Math.abs(surfaceCoordsMove.y - drawOrigin.y)
                const centerX = (surfaceCoordsMove.x + drawOrigin.x) / 2
                const centerY = (surfaceCoordsMove.y + drawOrigin.y) / 2

                if (previewShape) {
                    previewShape.translation.x = centerX
                    previewShape.translation.y = centerY
                    previewShape.width = drawWidth
                    previewShape.height = drawHeight
                    two.update()
                }
                break
            }
            case SCENARIO_JUST_ADDED_ELEMENT: {
                // This block falls for the case when there is newly added element and we let user click
                // anywhere to set last added element's position
                const sc = toSurface(e)

                let twoJSElement = two.scene.children.find(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (child: any) =>
                        child?.elementData?.id === lastAddedElementId
                )

                if (twoJSElement?.position) {
                    twoJSElement.position.x = sc.x
                    twoJSElement.position.y = sc.y

                    two.update()
                }
                break
            }
            case SCENARIO_PENCIL_MODE: {
                const pencilCoords = toSurface(e)

                // Distance throttle: skip if too close to last point
                const pdx = pencilCoords.x - lastPencilPoint.x
                const pdy = pencilCoords.y - lastPencilPoint.y
                const pDist = Math.sqrt(pdx * pdx + pdy * pdy)
                if (pDist < PENCIL_DISTANCE_THROTTLE) break

                // Compute velocity and map to linewidth
                const now = performance.now()
                const timeDelta = now - lastPencilTime
                const velocity = timeDelta > 0 ? pDist / timeDelta : 0
                const targetLw = velocityToLinewidth(
                    velocity,
                    defaultLinewidthValue
                )
                const smoothedLw = smoothLinewidth(
                    lastPencilLinewidth ?? defaultLinewidthValue,
                    targetLw,
                    0.3
                )

                // Record point with linewidth (kept for future variable-width work)
                pencilRawPoints.push({
                    x: pencilCoords.x,
                    y: pencilCoords.y,
                    lw: smoothedLw,
                })

                // Rebuild the preview path from the smoothed raw points so the
                // live stroke matches the final factory render exactly.
                if (pencilPath) {
                    const smoothedPreview =
                        pencilRawPoints.length > 2
                            ? chaikinSmooth(pencilRawPoints, 2)
                            : pencilRawPoints
                    pencilPath.vertices.splice(0)
                    smoothedPreview.forEach((pt) => {
                        pencilPath.vertices.push(new Two.Anchor(pt.x, pt.y))
                    })
                }

                lastPencilPoint = { x: pencilCoords.x, y: pencilCoords.y }
                lastPencilTime = now
                lastPencilLinewidth = smoothedLw

                two.update()
                break
            }
            case SCENARIO_RUBBER_MODE:
                eraseElementAtPoint(e.clientX, e.clientY)
                break
            default:
                /**
                    Currently "resize" event handling is at component level.
                    Once I shift that handling to this one main component,
                    I'll remove this first if condition block
                */

                // Empty-canvas mousedown deferred selector creation here.
                // First mousemove materialises the dotted rect at the
                // original mousedown position so it grows with the cursor.
                if (pendingGroupSelectorOrigin && !shape?.elementData) {
                    const area = two.makePath(0, 0, 10, 0, 10, 10, 0, 10)
                    area.fill = 'rgba(0,0,0,0)'
                    area.opacity = 1
                    area.linewidth = 1
                    area.dashes[0] = 4
                    area.stroke = SELECTION_PREVIEW_STROKE
                    const newSelectorGroup = two.makeGroup(area)
                    newSelectorGroup.position.copy(pendingGroupSelectorOrigin)
                    shape = newSelectorGroup
                    shape.elementData = {
                        isGroupSelector: true,
                        prevX: parseInt(shape.translation.x),
                        prevY: parseInt(shape.translation.y),
                    }
                    dragging = true
                    pendingGroupSelectorOrigin = null
                    two.update()
                }

                if (isResizeEvent === true) {
                    domElement.removeEventListener(
                        'mousemove',
                        mousemove,
                        false
                    )
                    domElement.removeEventListener('mouseup', mouseup, false)
                    isResizeEvent = false
                } else if (
                    shape?.id &&
                    document
                        .getElementById(shape.id)
                        ?.hasAttribute('data-resize')
                ) {
                    // element resize is being performed
                    isResizeEvent = true
                    domElement.removeEventListener(
                        'mousemove',
                        mousemove,
                        false
                    )
                    domElement.removeEventListener('mouseup', mouseup, false)
                } else if (shape?.id || shape?.elementData) {
                    let dx = e.clientX - mouse.x
                    let dy = e.clientY - mouse.y

                    // check if while dragging, the shape does not point to root element (two-0)
                    if (
                        dragging &&
                        shape.id !== 'two-0' &&
                        !shape.elementData.isGroupSelector
                    ) {
                        // code block condition to handle arrow line circle component's dragging
                        // it roughly translates -> does shape === line/arrow line ?
                        if (shape?.lineData) {
                            let line = shape?.lineData

                            if (shape.direction === 'left') {
                                if (e.shiftKey == true) {
                                    let x1 = (line.vertices[0].x +=
                                        dx / zui.scale)
                                    let y1 = (line.vertices[0].y +=
                                        dy / zui.scale)
                                    updateX1Y1Vertices(
                                        Two,
                                        line,
                                        x1,
                                        y1,
                                        shape,
                                        two
                                    )

                                    /* update x2,y2 vertices acc. to shift key press event */
                                    let x2 = line.vertices[1].x
                                    let y2 = y1
                                    updateX2Y2Vertices(
                                        Two,
                                        line,
                                        x2,
                                        y2,
                                        shape.siblingCircle,
                                        two
                                    )
                                } else {
                                    let x1 = (line.vertices[0].x +=
                                        dx / zui.scale)
                                    let y1 = (line.vertices[0].y +=
                                        dy / zui.scale)
                                    updateX1Y1Vertices(
                                        Two,
                                        line,
                                        x1,
                                        y1,
                                        shape,
                                        two
                                    )
                                }
                            } else if (shape.direction === 'right') {
                                if (e.shiftKey === true) {
                                    let x2 = (line.vertices[1].x +=
                                        dx / zui.scale)
                                    let y2 = (line.vertices[1].y +=
                                        dy / zui.scale)
                                    updateX2Y2Vertices(
                                        Two,
                                        line,
                                        x2,
                                        y2,
                                        shape,
                                        two
                                    )

                                    /* update x1,y1 vertices acc. to shift key press event */
                                    let x1 = line.vertices[0].x
                                    let y1 = y2
                                    updateX1Y1Vertices(
                                        Two,
                                        line,
                                        x1,
                                        y1,
                                        shape.siblingCircle,
                                        two
                                    )
                                } else {
                                    let x2 = (line.vertices[1].x +=
                                        dx / zui.scale)
                                    let y2 = (line.vertices[1].y +=
                                        dy / zui.scale)
                                    updateX2Y2Vertices(
                                        Two,
                                        line,
                                        x2,
                                        y2,
                                        shape,
                                        two
                                    )
                                }
                            }
                        }
                        // code block condition to handle normal component's dragging
                        else {
                            shape.position.x += dx / zui.scale
                            shape.position.y += dy / zui.scale
                        }
                    } else if (shape.elementData.isGroupSelector) {
                        // this blocks falls for the case when user has clicked and
                        // is dragging to create a group selector
                        let area = shape.children[0]
                        const m = toSurface(e)
                        mouse.copy(m)

                        const width = mouse.x - shape.position.x
                        const height = mouse.y - shape.position.y

                        area.vertices[1].x = width
                        area.vertices[2].x = width
                        area.vertices[2].y = height
                        area.vertices[3].y = height

                        two.update()
                    }
                    mouse.set(e.clientX, e.clientY)
                    two.update()
                }
        }
    }

    function mouseup(e: MouseEvent) {
        switch (scenario) {
            case SCENARIO_ARROW_DRAW: {
                if (arrowDrawElement) {
                    const line = arrowDrawElement.children[0]
                    const finalX1 = parseInt(line.vertices[0].x)
                    const finalY1 = parseInt(line.vertices[0].y)
                    const finalX2 = parseInt(line.vertices[1].x)
                    const finalY2 = parseInt(line.vertices[1].y)

                    // Update elementData so subsequent drag operations use correct position
                    arrowDrawElement.elementData.x = parseInt(
                        arrowDrawElement.position.x
                    )
                    arrowDrawElement.elementData.y = parseInt(
                        arrowDrawElement.position.y
                    )

                    const newShapeData = {
                        id: arrowDrawElement.elementData.id,
                        prevX: -9999,
                        prevY: -9999,
                        isLineCircle: true,
                        parentData: arrowDrawElement,
                        data: {
                            x: parseInt(arrowDrawElement.position.x),
                            y: parseInt(arrowDrawElement.position.y),
                            x1: finalX1,
                            y1: finalY1,
                            x2: finalX2,
                            y2: finalY2,
                        },
                    }

                    updateToGlobalState(newShapeData, {})
                }

                setSelectedComponentInBoard(null)

                arrowDrawElement = null
                setArrowDrawModeOff()
                setPointerElement('pointer')
                setRootCursor('auto')
                domElement.removeEventListener('mousemove', mousemove, false)
                domElement.removeEventListener('mouseup', mouseup, false)
                break
            }
            case SCENARIO_TEXT_DRAW: {
                if (textDrawElement && textDrawElement.children?.[0]) {
                    // Trigger text input by dispatching a custom event
                    const textInputEvent = new CustomEvent('triggerTextInput', {
                        detail: { elementId: textDrawElement.elementData.id },
                    })
                    window.dispatchEvent(textInputEvent)

                    const groupEl = textDrawElement
                    const shapeEl = textDrawElement.children[0]
                    const componentInternalState = {
                        element: {
                            [shapeEl.id]: shapeEl,
                            [groupEl.id]: groupEl,
                        },
                        group: { id: groupEl.id, data: groupEl },
                        shape: {
                            type: groupEl.elementData?.componentType,
                            id: shapeEl.id,
                            data: shapeEl,
                        },
                        text: { data: {} },
                        icon: { data: {} },
                    }
                    // Don't use the board's generic toolbar for text elements —
                    // the text component manages its own correctly-configured toolbar.
                    setSelectedComponentInBoard(null)
                }

                textDrawElement = null
                setTextDrawModeOff()
                setPointerElement('pointer')
                setRootCursor('auto')
                domElement.removeEventListener('mouseup', mouseup, false)
                break
            }
            case SCENARIO_DRAW_SHAPE: {
                const MIN_SIZE = 20
                const endCoords = drawCurrentCoords || drawOrigin
                const finalWidth = Math.round(
                    Math.max(Math.abs(endCoords.x - drawOrigin.x), MIN_SIZE)
                )
                const finalHeight = Math.round(
                    Math.max(Math.abs(endCoords.y - drawOrigin.y), MIN_SIZE)
                )
                const finalCenterX = Math.round(
                    (drawOrigin.x + endCoords.x) / 2
                )
                const finalCenterY = Math.round(
                    (drawOrigin.y + endCoords.y) / 2
                )

                const capturedPreview = previewShape
                previewShape = null

                const finalId = generateUUID()
                const finalShapeData = {
                    ...drawShapeProps,
                    id: finalId,
                    x: finalCenterX,
                    y: finalCenterY,
                    width: finalWidth,
                    height: finalHeight,
                }

                addToLocalComponentStore(
                    finalId,
                    drawShapeType ?? '',
                    finalShapeData as unknown as ComponentRecord
                )

                // React renders the element asynchronously; poll until it appears in two.scene.children,
                // then remove the preview so there is no blank gap between preview removal and final render
                const removePreview = () => {
                    if (capturedPreview) {
                        two.remove(capturedPreview)
                        two.update()
                    }
                }
                pollUntilElement(two, finalId, removePreview, {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    condition: (el: any) => !!el.children?.[0],
                    onTimeout: removePreview,
                })
                setSelectedComponentInBoard(null)

                drawOrigin = null
                drawCurrentCoords = null
                drawShapeType = null
                drawShapeProps = null
                setPointerElement('pointer')
                setRootCursor('auto')
                const hintBtn = document.getElementById(
                    'show-click-anywhere-btn'
                )
                if (hintBtn) hintBtn.style.opacity = '0'
                domElement.removeEventListener('mousemove', mousemove, false)
                domElement.removeEventListener('mouseup', mouseup, false)
                break
            }
            case SCENARIO_JUST_ADDED_ELEMENT:
                setSelectedComponentInBoard(null)
                lastPlacedElement = null
                setPointerElement('pointer')
                domElement.removeEventListener('mousemove', mousemove, false)
                domElement.removeEventListener('mouseup', mouseup, false)
                break
            case SCENARIO_PENCIL_MODE: {
                const capturedPencilGroup = pencilGroup
                pencilGroup = null
                pencilPath = null

                if (pencilRawPoints.length < 2) {
                    // Too few points to form a stroke — remove preview immediately
                    if (capturedPencilGroup) {
                        two.remove(capturedPencilGroup)
                        two.update()
                    }
                    pencilRawPoints = []
                    lastPencilPoint = null
                    lastPencilLinewidth = null
                    break
                }

                // Light simplification keeps the final shape close to what the
                // user actually drew (smaller epsilon = more fidelity).
                const simplifiedPoints = simplifyWithLinewidth(
                    pencilRawPoints,
                    0.3
                )

                let pencilId = generateUUID()
                let pencilComponentData = {
                    id: pencilId,
                    boardId: props.boardId,
                    componentType: 'pencil',
                    children: {},
                    metadata: simplifiedPoints,
                    x: 0,
                    y: 0,
                    linewidth: defaultLinewidthValue,
                    stroke: defaultStrokeColorValue,
                    strokeType: defaultStrokeTypeValue,
                }

                pencilComponentData.x = Math.floor(simplifiedPoints[0]?.x || 0)
                pencilComponentData.y = Math.floor(simplifiedPoints[0]?.y || 0)

                addToLocalComponentStore(
                    pencilComponentData.id,
                    pencilComponentData.componentType,
                    pencilComponentData as unknown as ComponentRecord
                )

                // React renders the element asynchronously; keep preview visible until
                // the final element appears in two.scene.children to avoid a blank gap
                const removePencilPreview = () => {
                    if (capturedPencilGroup) {
                        two.remove(capturedPencilGroup)
                        two.update()
                    }
                }
                pollUntilElement(two, pencilId, removePencilPreview, {
                    onTimeout: removePencilPreview,
                })

                // Reset pencil state
                pencilRawPoints = []
                lastPencilPoint = null
                lastPencilLinewidth = null
                break
            }
            case SCENARIO_RUBBER_MODE:
                domElement.removeEventListener('mousemove', mousemove, false)
                domElement.removeEventListener('mouseup', mouseup, false)
                break
            default:
                // diff to check new x,y and prev x,y
                let oldShapeData = {}
                let newShapeData = {}
                // No mousemove happened between empty-canvas mousedown and
                // this mouseup → no selector was ever materialised. Just
                // clear the pending origin and let the cleanup below run.
                if (pendingGroupSelectorOrigin) {
                    pendingGroupSelectorOrigin = null
                }
                if (shape?.elementData?.isGroupSelector) {
                    // check on mouse up if shape's a group selector or not
                    // if yes, then call setOnGroup for adding a group in two.js space
                    let area = shape.children[0]
                    const groupWidth = area.vertices[2].x - area.vertices[0].x
                    const groupHeight = area.vertices[3].y - area.vertices[0].y
                    two.remove(shape)
                    // The selector starts as a 10x10 rect (see mousedown). If
                    // it never grew, the user just clicked without dragging —
                    // don't materialise an empty groupobject skeleton (and
                    // crucially, don't leave one behind that would intercept
                    // the second click of a dblclick on empty canvas).
                    if (groupWidth > 10 || groupHeight > 10) {
                        setOnGroupHandler({
                            x: area.vertices[0].x + shape.translation.x,
                            y: area.vertices[0].y + shape.translation.y,
                            left: area.vertices[0].x + shape.translation.x,
                            right: area.vertices[1].x + shape.translation.x,
                            top: area.vertices[0].y + shape.translation.y,
                            bottom: area.vertices[3].y + shape.translation.y,
                            width: groupWidth,
                            height: groupHeight,
                        })
                    }
                    setSelectedComponentInBoard(null)
                } else if (shape?.elementData) {
                    if (
                        shape.elementData.x !== shape.translation.x ||
                        shape.elementData.y !== shape.translation.y
                    ) {
                        if (shape?.elementData?.isLineCircle === true) {
                            shape.opacity = 0
                            shape.siblingCircle.opacity = 0

                            oldShapeData = { ...shape.elementData }

                            newShapeData = Object.assign(
                                {},
                                shape.elementData,
                                {
                                    data: {
                                        x1: parseInt(
                                            shape.lineData.vertices[0].x
                                        ),
                                        y1: parseInt(
                                            shape.lineData.vertices[0].y
                                        ),
                                        x2: parseInt(
                                            shape.lineData.vertices[1].x
                                        ),
                                        y2: parseInt(
                                            shape.lineData.vertices[1].y
                                        ),
                                    },
                                }
                            )

                            updateToGlobalState(newShapeData, oldShapeData)
                        } else {
                            shape.elementData.x = shape.translation.x
                            shape.elementData.y = shape.translation.y

                            oldShapeData = { ...shape.elementData }

                            newShapeData = Object.assign(
                                {},
                                shape.elementData,
                                {
                                    data: {
                                        x: parseInt(shape.translation.x),
                                        y: parseInt(shape.translation.y),
                                    },
                                }
                            )

                            if (
                                shape.elementData.componentType !==
                                'groupobject'
                            ) {
                                updateToGlobalState(newShapeData, oldShapeData)
                            }
                        }
                    }
                }
        }

        // Restore pointer events on all components (may have been disabled during arrow drag)
        document
            .querySelectorAll<HTMLElement>('.dragger-picker')
            .forEach((el) => {
                el.style.pointerEvents = ''
            })

        shape = {}
        scenario = null

        two.update()

        domElement.removeEventListener('mousemove', mousemove, false)
        domElement.removeEventListener('mouseup', mouseup, false)
    }

    function mousewheel(e: WheelEvent) {
        if (e.shiftKey === true || e.metaKey === true) {
            let dy =
                ((e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY ||
                    -e.deltaY) / 1000
            zui.zoomBy(dy, e.clientX, e.clientY)
            window.dispatchEvent(
                new CustomEvent('zoomChanged', { detail: { scale: zui.scale } })
            )
        } else {
            zui.translateSurface(-e.deltaX, -e.deltaY)
        }

        two.update()

        onCameraChangeRef?.current?.({
            scale: two.scene.scale,
            tx: two.scene.translation.x,
            ty: two.scene.translation.y,
        })

        if (props.boardId) {
            if (viewportSaveTimer) clearTimeout(viewportSaveTimer)
            viewportSaveTimer = setTimeout(() => {
                localStorage.setItem(
                    `${VIEWPORT_KEY_PREFIX}${props.boardId}`,
                    JSON.stringify({
                        tx: two.scene.translation.x,
                        ty: two.scene.translation.y,
                        scale: two.scene.scale,
                        savedAt: Date.now(),
                    })
                )
            }, 300)
        }
    }

    // --- Touch handlers ---
    // Routing:
    //   1 finger  → synthetic MouseEvent → existing mouse pipeline (select, drag, pencil, draw)
    //   2 fingers → pan canvas (midpoint delta) + pinch zoom (distance delta) simultaneously

    function touchstart(e: TouchEvent) {
        e.preventDefault()

        if (e.touches.length === 1) {
            lastTouch = e.touches[0]
            touchStartX = lastTouch.clientX
            touchStartY = lastTouch.clientY

            // Pan-mode short-circuit: single-finger drag should translate the
            // surface, not select/draw. Skip the synthetic mousedown pipeline
            // entirely while pan mode is active.
            if (isPanMode()) {
                isSinglePanning = true
                panLastX = lastTouch.clientX
                panLastY = lastTouch.clientY
                const root = document.getElementById('main-two-root')
                if (root) root.style.cursor = 'grabbing'
                return
            }

            // If the tap lands on an active selection handle, keep the selection
            // attached so mousedown's hitTest can begin a resize/rotate. Without
            // this, the unconditional clearSelector below detaches the controller
            // before mousedown runs — visible on shapes whose bbox corners sit in
            // empty space (e.g. diamond NE handle), where elementFromPoint returns
            // bare canvas and re-selection never fires.
            const handleHit =
                selectionController.currentGroup &&
                selectionController.hitTest(
                    lastTouch.clientX,
                    lastTouch.clientY
                )

            if (!handleHit) {
                // Clear any previous selection before processing the new tap.
                // On desktop this happens via focus/blur, but synthetic mouse events
                // don't transfer browser focus on mobile, so we do it explicitly here
                // — before mousedown so the new selection set inside mousedown survives.
                window.dispatchEvent(new CustomEvent('clearSelector', {}))
            }

            // Dispatch mousedown on the actual element under the finger so
            // element-level listeners (interactjs resize handles, click handlers) fire correctly.
            // For handle hits, target domElement directly — elementFromPoint may
            // resolve to bare canvas (which would re-trigger clearSelector inside
            // mousedown at the `two-0` branch).
            const target = handleHit
                ? domElement
                : document.elementFromPoint(
                      lastTouch.clientX,
                      lastTouch.clientY
                  ) || domElement
            target.dispatchEvent(
                new MouseEvent('mousedown', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: lastTouch.clientX,
                    clientY: lastTouch.clientY,
                    screenX: lastTouch.screenX,
                    screenY: lastTouch.screenY,
                })
            )
        } else if (e.touches.length === 2) {
            // Second finger added — cancel any in-progress 1-finger interaction
            if (isSinglePanning) {
                // Single-finger pan never dispatched a mousedown, so there's
                // nothing to mouseup; just clear pan state and let
                // twoFingerStart take over for pinch+pan.
                isSinglePanning = false
                lastTouch = null
            } else if (lastTouch) {
                domElement.dispatchEvent(
                    new MouseEvent('mouseup', {
                        bubbles: true,
                        cancelable: true,
                        view: window,
                        clientX: lastTouch.clientX,
                        clientY: lastTouch.clientY,
                    })
                )
                lastTouch = null
            }
            twoFingerStart(e)
        }
    }

    function touchmove(e: TouchEvent) {
        e.preventDefault()

        if (e.touches.length === 1) {
            lastTouch = e.touches[0]

            // Pan-mode: translate the surface by per-frame finger delta.
            if (isSinglePanning) {
                const dx = lastTouch.clientX - panLastX
                const dy = lastTouch.clientY - panLastY
                panLastX = lastTouch.clientX
                panLastY = lastTouch.clientY
                if (dx !== 0 || dy !== 0) {
                    zui.translateSurface(dx, dy)
                    two.update()
                    onCameraChangeRef?.current?.({
                        scale: two.scene.scale,
                        tx: two.scene.translation.x,
                        ty: two.scene.translation.y,
                    })
                }
                return
            }

            domElement.dispatchEvent(
                new MouseEvent('mousemove', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: lastTouch.clientX,
                    clientY: lastTouch.clientY,
                    screenX: lastTouch.screenX,
                    screenY: lastTouch.screenY,
                })
            )
        } else if (e.touches.length >= 2) {
            twoFingerMove(e)
        }
    }

    function touchend(e: TouchEvent) {
        if (e.touches.length === 0 && lastTouch) {
            const endX = lastTouch.clientX
            const endY = lastTouch.clientY

            // Pan-mode end: persist viewport (matches two-finger persistence
            // path below) and reset cursor. Skip the synthetic mouseup/click
            // pipeline so taps in pan mode never trigger selection.
            if (isSinglePanning) {
                isSinglePanning = false
                if (props.boardId) {
                    try {
                        localStorage.setItem(
                            `${MOBILE_VIEWPORT_KEY_PREFIX}${props.boardId}`,
                            JSON.stringify({
                                tx: two.scene.translation.x,
                                ty: two.scene.translation.y,
                                scale: two.scene.scale,
                                savedAt: Date.now(),
                            })
                        )
                    } catch (_) {}
                }
                const root = document.getElementById('main-two-root')
                if (root) root.style.cursor = 'grab'
                lastTouch = null
                return
            }

            domElement.dispatchEvent(
                new MouseEvent('mouseup', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: endX,
                    clientY: endY,
                })
            )

            // If finger barely moved, treat as a tap and fire a click on the
            // actual element so interactjs `.on('click')` handlers (which draw
            // the selection outline) are triggered.
            const dx = endX - touchStartX
            const dy = endY - touchStartY
            const moved = Math.sqrt(dx * dx + dy * dy)
            if (moved < 10) {
                // Blur any focused element (e.g. an active text-editing
                // textarea) so it commits + removes itself before we
                // re-query elementFromPoint and dispatch the tap click.
                // On mobile, synthetic mouse events don't transfer focus,
                // so blur never fires naturally when tapping elsewhere.
                if (
                    document.activeElement &&
                    document.activeElement !== document.body
                ) {
                    ;(document.activeElement as HTMLElement).blur()
                }

                const now = Date.now()
                const tapDx = endX - lastTapX
                const tapDy = endY - lastTapY
                const tapDist = Math.sqrt(tapDx * tapDx + tapDy * tapDy)
                const isDoubleTap = now - lastTapTime < 300 && tapDist < 30

                const target =
                    document.elementFromPoint(endX, endY) || domElement

                if (isDoubleTap) {
                    // Reset so a third tap doesn't re-trigger
                    lastTapTime = 0
                    lastTapX = 0
                    lastTapY = 0
                    target.dispatchEvent(
                        new MouseEvent('dblclick', {
                            bubbles: true,
                            cancelable: true,
                            view: window,
                            clientX: endX,
                            clientY: endY,
                        })
                    )
                } else {
                    lastTapTime = now
                    lastTapX = endX
                    lastTapY = endY
                    target.dispatchEvent(
                        new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            view: window,
                            clientX: endX,
                            clientY: endY,
                        })
                    )
                }
            }

            lastTouch = null
        }
        // Drop below 2 fingers — save viewport then reset 2-finger tracking state.
        // distance > 0 means twoFingerStart ran (a real 2-finger gesture was active).
        if (e.touches.length < 2) {
            if (distance > 0 && props.boardId) {
                localStorage.setItem(
                    `${MOBILE_VIEWPORT_KEY_PREFIX}${props.boardId}`,
                    JSON.stringify({
                        tx: two.scene.translation.x,
                        ty: two.scene.translation.y,
                        scale: two.scene.scale,
                        savedAt: Date.now(),
                    })
                )
            }
            touches = {}
            distance = 0
        }
    }

    function twoFingerStart(e: TouchEvent) {
        touches = {}
        for (let i = 0; i < e.touches.length; i++) {
            const t = e.touches[i]
            if (t) touches[t.identifier] = t
        }
        const ids = Object.keys(touches)
        if (ids.length < 2) return
        const a = touches[ids[0]!]
        const b = touches[ids[1]!]
        const dx = b.clientX - a.clientX
        const dy = b.clientY - a.clientY
        distance = Math.sqrt(dx * dx + dy * dy)
        twoFingerMidX = (a.clientX + b.clientX) / 2
        twoFingerMidY = (a.clientY + b.clientY) / 2
    }

    function twoFingerMove(e: TouchEvent) {
        for (let i = 0; i < e.touches.length; i++) {
            const t = e.touches[i]
            if (t) touches[t.identifier] = t
        }
        const ids = Object.keys(touches)
        if (ids.length < 2) return

        const a = touches[ids[0]!]
        const b = touches[ids[1]!]
        const dx = b.clientX - a.clientX
        const dy = b.clientY - a.clientY
        const newDist = Math.sqrt(dx * dx + dy * dy)
        const newMidX = (a.clientX + b.clientX) / 2
        const newMidY = (a.clientY + b.clientY) / 2

        // Safety: if twoFingerStart was never called (e.g. second finger
        // landed outside the canvas element), initialise from current state
        // and skip this frame to avoid a large jump.
        if (distance === 0) {
            distance = newDist
            twoFingerMidX = newMidX
            twoFingerMidY = newMidY
            return
        }

        // Pan: translate by midpoint delta
        zui.translateSurface(newMidX - twoFingerMidX, newMidY - twoFingerMidY)

        // Zoom: scale by distance delta (pinch)
        const distDelta = newDist - distance
        if (Math.abs(distDelta) > 0.5) {
            zui.zoomBy(distDelta / 250, newMidX, newMidY)
            window.dispatchEvent(
                new CustomEvent('zoomChanged', { detail: { scale: zui.scale } })
            )
        }

        twoFingerMidX = newMidX
        twoFingerMidY = newMidY
        distance = newDist

        two.update()

        onCameraChangeRef?.current?.({
            scale: two.scene.scale,
            tx: two.scene.translation.x,
            ty: two.scene.translation.y,
        })
    }

    return {
        zui,
        mousemove,
        resetDragState: () => {
            dragging = false
            shape = {}
        },
        getCurrentShape: () => shape,
        getSelectedGroup: () =>
            selectionController.currentGroup ||
            activeGroupRef.current ||
            lastSelectedShape,
    }
}

const Canvas: React.FC<CanvasProps> = (props) => {
    const { isMobile } = useMediaQueryUtils()

    const {
        addToLocalComponentStore,
        deleteComponentFromLocalStore,
        updateComponentVerticesInLocalStore,
        updateComponentBulkPropertiesInLocalStore,
        setTwoJSInstanceInBoard,
        setZuiInstanceInBoard,
        setSelectedComponentInBoard,
        setArrowDrawModeInBoard,
        setTextDrawModeInBoard,
        setCurrentElementInBoard,
        undoLastAction,
        redoLastAction,
        enableTextDrawMode,
        createTextAtSurface,
    } = useBoardContext()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [twoJSInstance, setTwoJSInstance] = useState<any>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [zuiInstance, setZuiInstance] = useState<any>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [onGroup, setOnGroup] = useState<any>(null)
    const [componentsToRender, setComponentsToRender] = useState<
        React.ComponentType[]
    >([])

    const stateRefForComponentStore = useRef<ComponentStore | undefined>(
        undefined
    )
    const isPencilModeRef = useRef<boolean>(props.isPencilMode)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zuiInstanceRef = useRef<any>(null)
    const renderGroupRef = useRef<
        ((currentComponents: ComponentRecord[]) => void) | null
    >(null)
    const prevElementsRef = useRef<string[]>([])
    const componentsToRenderRef = useRef<React.ComponentType[]>([])
    // Holds the latest createTextAtSurface from BoardContext so the dblclick
    // handler (registered once inside addZUI) sees fresh closure state.
    const createTextAtSurfaceRef = useRef<
        ((x: number, y: number) => void) | null
    >(null)
    useEffect(() => {
        createTextAtSurfaceRef.current = createTextAtSurface
    }, [createTextAtSurface])

    // Latest onCameraChange callback. Read from inside addZUI's DOM event
    // handlers via the ref to avoid the stale-closure trap (see CLAUDE.md).
    const onCameraChangeRef = useRef<
        ((event: CameraChangeEvent) => void) | undefined
    >(props.onCameraChange)
    useEffect(() => {
        onCameraChangeRef.current = props.onCameraChange
    }, [props.onCameraChange])

    const { clipboardRef, lastMouseRef } = useCanvasClipboard({
        twoJSInstance,
        zuiInstanceRef,
        boardId: props.boardId,
        addToLocalComponentStore,
        renderGroupRef,
    })

    useEffect(() => {
        const elem = document.getElementById('main-two-root')
        if (!elem) return

        const two = new Two({ fullscreen: true }).appendTo(elem)
        two.update()

        let zui_instance = addZUI(
            props,
            two,
            updateToGlobalState,
            updateComponentVertices,
            setOnGroupHandler,
            addToLocalComponentStore,
            setSelectedComponentInBoard,
            () => setArrowDrawModeInBoard(false),
            () => setTextDrawModeInBoard(false),
            setCurrentElementInBoard,
            updateComponentBulkPropertiesInLocalStore,
            deleteComponentFromLocalStore,
            isPencilModeRef,
            createTextAtSurfaceRef,
            onCameraChangeRef
        )

        setZuiInstance(zui_instance)
        setTwoJSInstance(two)
        setTwoJSInstanceInBoard(two)
        setZuiInstanceInBoard(zui_instance)

        // Restore last mobile viewport (zoom + pan) from localStorage.
        // Use ZUI's own API so its internal zScale stays in sync with the
        // scene — setting two.scene.scale directly desynchronises ZUI and
        // causes the first pan gesture to jump back to the origin.
        const restoreViewport = (storageKey: string) => {
            const saved = localStorage.getItem(storageKey)
            if (!saved) return
            try {
                const parsed = JSON.parse(saved)
                const { tx, ty, scale, savedAt } = parsed
                if (!savedAt || Date.now() - savedAt > VIEWPORT_TTL_MS) {
                    localStorage.removeItem(storageKey)
                    return
                }
                // zoomSet updates zui.zScale + surface.scale atomically.
                // Centering at (0,0) with initial translation (0,0) means no
                // translation side-effect from the zoom.
                zui_instance.zui.zoomSet(scale, 0, 0)
                // translateSurface increments from the post-zoom translation
                // (still 0,0) to the saved position.
                zui_instance.zui.translateSurface(tx, ty)
                two.update()
            } catch (_) {
                localStorage.removeItem(storageKey)
            }
        }

        if (isMobile && props.boardId) {
            restoreViewport(`${MOBILE_VIEWPORT_KEY_PREFIX}${props.boardId}`)
        }

        if (!isMobile && props.boardId) {
            restoreViewport(`${VIEWPORT_KEY_PREFIX}${props.boardId}`)
        }

        onCameraChangeRef.current?.({
            scale: two.scene.scale as number,
            tx: two.scene.translation.x,
            ty: two.scene.translation.y,
        })

        const boardId = props.boardId
        const tabsOpen = localStorage.getItem(`tabs_open_${boardId}`)
        if (tabsOpen == null) {
            localStorage.setItem(`tabs_open_${boardId}`, '1')
        } else {
            localStorage.setItem(
                `tabs_open_${boardId}`,
                String(parseInt(tabsOpen) + 1)
            )
        }

        window.onunload = function (e) {
            const newTabCount = localStorage.getItem(`tabs_open_${boardId}`)
            if (newTabCount !== null) {
                localStorage.setItem(
                    `tabs_open_${boardId}`,
                    String(Number(newTabCount) - 1)
                )
            }
        }

        // Two.js `fullscreen: true` mutates document.body inline styles
        // (overflow:hidden, position:fixed, margin/padding/inset:0) and binds
        // a window 'resize' listener — none of which it auto-reverts. Without
        // this cleanup, leaving the Board (e.g. navigating to /privacy or
        // /support) leaves <body> scroll-locked so those pages can't scroll.
        // Resetting to '' drops the inline declarations so the stylesheet /
        // browser defaults take over again; remounting the Board re-applies
        // them, so the whiteboard's no-scroll behavior is unchanged.
        return () => {
            for (const prop of [
                'overflow',
                'position',
                'margin',
                'padding',
                'top',
                'left',
                'right',
                'bottom',
            ]) {
                document.body.style.removeProperty(prop)
            }
        }
    }, [])

    useEffect(() => {
        stateRefForComponentStore.current = props.componentStore
        if (twoJSInstance !== null && zuiInstance !== null) {
            let domElement = twoJSInstance?.renderer?.domElement
            // Reset stale drag state so a resize followed by a store update
            // (e.g. undo) doesn't leave the element dragging on next mousemove
            zuiInstance.resetDragState()
            domElement.addEventListener(
                'mousemove',
                zuiInstance.mousemove,
                false
            )
        }

        if (Object.values(props.componentStore).length > 0 && twoJSInstance) {
            handleSetComponentsToRender(Object.values(props.componentStore))
        }
    }, [props.componentStore])

    useEffect(() => {
        if (props.lastAddedElement !== null) {
            handleSetComponentsToRender([
                { ...props.lastAddedElement, isDummy: true },
            ])
        }
    }, [props.lastAddedElement])

    useEffect(() => {
        isPencilModeRef.current = props.isPencilMode
        const root = document.getElementById('main-two-root')
        if (props.isPencilMode === true) {
            isDrawing = true
            if (root) root.style.cursor = 'crosshair'
        } else {
            isDrawing = false
            if (root) root.style.cursor = 'auto'
        }
    }, [props.isPencilMode])

    useEffect(() => {
        defaultLinewidthValue = props.defaultLinewidth || 1
    }, [props.defaultLinewidth])

    useEffect(() => {
        defaultStrokeTypeValue = props.defaultStrokeType || null
    }, [props.defaultStrokeType])

    useEffect(() => {
        defaultStrokeColorValue =
            props.defaultStrokeColor || PENCIL_DEFAULT_COLOR
    }, [props.defaultStrokeColor])

    useEffect(() => {
        defaultTextSizeValue = props.defaultTextSize || DEFAULT_TEXT_SIZE
    }, [props.defaultTextSize])

    // on group select use effect hook
    useEffect(() => {
        if (onGroup) {
            let e = onGroup
            let x1Coord = e.left
            let x2Coord = e.right
            let y1Coord = e.top
            let y2Coord = e.bottom

            let xMid = parseInt(String(e.left)) + Math.floor(e.width / 2)
            let yMid = parseInt(String(e.top)) + Math.floor(e.height / 2)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newGroup: any = {}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newChildren: any[] = []
            const selectedComponentArr: string[] = []

            const allComponentCoords = stateRefForComponentStore.current
                ? Object.values(stateRefForComponentStore.current)
                : []
            allComponentCoords.forEach((item) => {
                if (
                    item.x > x1Coord &&
                    item.x < x2Coord &&
                    item.y > y1Coord &&
                    item.y < y2Coord
                ) {
                    selectedComponentArr.push(item.id)

                    let relativeX = item.x - xMid
                    let relativeY = item.y - yMid

                    let newMetadata = item.metadata
                    // pencil + geo area/route all store an absolute {x,y} vertex
                    // array; remap it into the group's child coordinate space.
                    if (
                        (item.componentType === 'pencil' ||
                            item.componentType === 'area' ||
                            item.componentType === 'route') &&
                        Array.isArray(item.metadata)
                    ) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const meta = item.metadata as any[]
                        newMetadata = meta.map((vert, index) => {
                            const lwProp =
                                vert.lw !== undefined ? { lw: vert.lw } : {}
                            if (index === 0) {
                                return { x: relativeX, y: relativeY, ...lwProp }
                            } else if (index > 0) {
                                // here the logic is to get relative vertex coordinates to the original metadata
                                // so we want to get result of ( relative coordinate + orginal_vert(x) - originalX )
                                // here originalX means the coordinates of first set of vertices
                                // since they were the first coordinates to start a path
                                return {
                                    x:
                                        relativeX +
                                        Math.trunc(vert.x - meta[0].x),
                                    y:
                                        relativeY +
                                        Math.trunc(vert.y - meta[0].y),
                                    ...lwProp,
                                }
                            }
                        }) as unknown as typeof item.metadata
                    }
                    let obj = {
                        ...item,
                        metadata: newMetadata,
                        id: item.id,
                        componentType: item.componentType,
                        x: relativeX,
                        relativeX: relativeX,
                        y: relativeY,
                        relativeY: relativeY,
                    }

                    // For arrowLine: read actual vertex coordinates from Two.js scene
                    // to preserve arrow direction (componentStore may have stale/missing values)
                    if (item.componentType === 'arrowLine') {
                        const arrowShape = twoJSInstance.scene.children.find(
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (child: any) => child?.elementData?.id === item.id
                        )
                        // Arrow factory adds line as first child (line, pointCircle1Group, pointCircle2Group)
                        const line = arrowShape?.children?.[0]
                        if (line?.vertices?.length >= 2) {
                            obj.x1 = Math.trunc(line.vertices[0].x)
                            obj.y1 = Math.trunc(line.vertices[0].y)
                            obj.x2 = Math.trunc(line.vertices[1].x)
                            obj.y2 = Math.trunc(line.vertices[1].y)
                        }
                    }

                    newChildren.push(obj)
                }
            })

            newGroup.id = Math.floor(100000 + Math.random() * 900000)
            newGroup.componentType = 'groupobject'
            newGroup.width = e.width
            newGroup.height = e.height
            newGroup.x = e.x + e.width / 2
            newGroup.y = e.y + e.height / 2

            newGroup.children = newChildren

            twoJSInstance.scene.children.forEach((child: any) => {
                if (selectedComponentArr.includes(child?.elementData?.id)) {
                    child.opacity = 0
                    twoJSInstance.update()
                }
            })

            handleSetComponentsToRender([newGroup])
        }
    }, [onGroup])

    useEffect(() => {
        zuiInstanceRef.current = zuiInstance
    }, [zuiInstance])

    useEffect(() => {
        const onUndoRedoKeyDown = (evt: KeyboardEvent) => {
            if (evt.key.toLowerCase() === 'z' && (evt.ctrlKey || evt.metaKey)) {
                evt.preventDefault()
                if (evt.shiftKey) {
                    redoLastAction()
                } else {
                    undoLastAction()
                }
            }
        }

        const onTextModeKeyDown = (evt: KeyboardEvent) => {
            if (evt.key !== 't' && evt.key !== 'T') return
            if (evt.ctrlKey || evt.metaKey || evt.altKey) return
            const tag = document.activeElement?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return
            if (
                localStorage.getItem(TEXT_DRAW_MODE_KEY) === 'true' ||
                localStorage.getItem(ARROW_DRAW_MODE_KEY) === 'true' ||
                localStorage.getItem(RUBBER_MODE_KEY) === 'true' ||
                localStorage.getItem(PENCIL_MODE_KEY) === 'TRUE' ||
                localStorage.getItem(GEO_DRAW_MODE_KEY) === 'true' ||
                localStorage.getItem(GEO_POINT_PLACE_MODE_KEY) === 'true' ||
                localStorage.getItem(PENDING_SHAPE_TYPE_KEY) !== null
            )
                return
            evt.preventDefault()
            enableTextDrawMode?.()
        }

        window.addEventListener('keydown', onUndoRedoKeyDown)
        window.addEventListener('keydown', onTextModeKeyDown)
        return () => {
            window.removeEventListener('keydown', onUndoRedoKeyDown)
            window.removeEventListener('keydown', onTextModeKeyDown)
        }
    }, [undoLastAction, redoLastAction, enableTextDrawMode])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setOnGroupHandler = (obj: any) => {
        setOnGroup(obj)
    }

    const handleSetComponentsToRender = (
        currentComponents: ComponentRecord[]
    ) => {
        let arr = [...prevElementsRef.current]
        let components = [...componentsToRenderRef.current]
        if (currentComponents && twoJSInstance) {
            // console.log(
            //     'newCanvas ... Canvas ... handleSetComponentsToRender ... condition(currentComponents && twoJSInstance) === true ',
            //     prevElementsRef.current,
            //     currentComponents
            // )
            currentComponents.forEach((item) => {
                // prevElementsRef is the sole authority on whether a wrapper already exists.
                // We must NOT check existsInScene here: on slow networks the React lazy
                // module may still be loading (no Two.js group yet) when a second shape is
                // drawn, causing existsInScene=false even though a wrapper was already
                // created — which would produce a second wrapper and a duplicate shape.
                // Deletion removes the id from the ref via the 'elementRemoved' event,
                // so undo-of-delete still gets a fresh wrapper.
                const moduleLoader =
                    elementModules[
                        `./components/elements/${item.componentType}.tsx`
                    ]
                if (!moduleLoader) {
                    // componentType doesn't map to a known element file — skip to avoid a crash.
                    // This can happen if shapeData was null when stored (e.g. componentTypes
                    // query hadn't resolved yet).
                    return
                }

                if (prevElementsRef.current.includes(item.id)) {
                    // do nothing
                    // console.log(
                    //     'newCanvas ... Canvas ... handleSetComponentsToRender ... condition(currentComponents && twoJSInstance) === true ... condition(prevElements.includes(item.id)) === true'
                    // )
                } else {
                    arr.push(item.id)
                    const ElementToRender = React.lazy(
                        moduleLoader as () => Promise<{
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            default: React.ComponentType<any>
                        }>
                    )
                    const data = {
                        twoJSInstance: twoJSInstance,
                        id: item.id,
                        boardId: props.boardId,
                        itemData: item,
                    }

                    let component = null
                    if (item.componentType === GROUP_COMPONENT) {
                        component = GroupRenderWrapper(ElementToRender, {
                            ...item,
                            ...data,
                        })
                    } else {
                        component = ElementRenderWrapper(
                            ElementToRender,
                            data,
                            deleteComponentFromLocalStore,
                            props.componentStore
                        )
                    }
                    components.push(component)
                }
            })
            componentsToRenderRef.current = components
            setComponentsToRender(components)
            if (twoJSInstance) prevElementsRef.current = arr
        }
    }
    renderGroupRef.current = handleSetComponentsToRender

    // When an element is deleted or its ADD is undone, remove it from prevElementsRef
    // so handleSetComponentsToRender can create a fresh wrapper if the element is
    // ever restored (e.g. undo of a delete).
    useEffect(() => {
        const handleElementRemoved = ((e: CustomEvent<{ id: string }>) => {
            // console.log(
            //     'newCanvas ... Canvas ... elementRemoved Event Listener',
            //     prevElementsRef.current
            // )
            const { id } = e.detail
            let updatedPrevElementsArr = prevElementsRef.current
            updatedPrevElementsArr = updatedPrevElementsArr.filter(
                (eid) => eid !== id
            )
            // console.log(
            //     'newCanvas ... Canvas ... elementRemoved Event Listener ... updatedPrevElementsArr',
            //     updatedPrevElementsArr
            // )
            prevElementsRef.current = updatedPrevElementsArr
        }) as EventListener
        window.addEventListener('elementRemoved', handleElementRemoved)
        return () => {
            window.removeEventListener('elementRemoved', handleElementRemoved)
        }
    }, [])

    const updateToGlobalState: UpdateToGlobalStateFn = (
        newShapeData,
        oldShapeData
    ) => {
        const userId = localStorage.getItem('userId')
        // prevX === -9999 means initial arrow placement — skip extra undo steps
        const isInitialArrowPlacement = newShapeData.prevX === -9999

        if (
            newShapeData.id &&
            (newShapeData.data.x != newShapeData.prevX ||
                newShapeData.data.y != newShapeData.prevY)
        ) {
            let updateObj = {
                x: parseInt(newShapeData.data.x),
                y: parseInt(newShapeData.data.y),
                updatedBy: userId,
            }
            updateComponentBulkPropertiesInLocalStore(
                newShapeData.id,
                updateObj,
                isInitialArrowPlacement
            )
        }

        if (newShapeData?.isLineCircle === true) {
            let updateObj = {
                x1: parseInt(newShapeData.data.x1),
                x2: parseInt(newShapeData.data.x2),
                y1: parseInt(newShapeData.data.y1),
                y2: parseInt(newShapeData.data.y2),
                updatedBy: userId,
            }
            updateComponentBulkPropertiesInLocalStore(
                newShapeData.parentData.elementData.id,
                updateObj,
                isInitialArrowPlacement
            )
        }
    }

    const updateComponentVertices: UpdateComponentVerticesFn = (id, x, y) => {
        updateComponentVerticesInLocalStore(id, x, y)
        const btn = document.getElementById('show-click-anywhere-btn')
        if (btn) btn.style.opacity = '0'
    }

    return (
        <>
            <div id="selector-rect"></div>
            {props.renderBackground?.()}
            <div id="main-two-root"></div>
            {componentsToRender.map((Component, index) => (
                <Suspense key={index} fallback={<Loader />}>
                    <Component />
                </Suspense>
            ))}
        </>
    )
}

export default Canvas
