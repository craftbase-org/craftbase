import React, { useEffect, useState, useRef, Suspense } from 'react'
import Two from 'two.js'

import { ZUI } from 'two.js/extras/jsm/zui'
import { useBoardContext } from './views/Board/board'
import { useMediaQueryUtils } from './constants/exportHooks'

import {
    GROUP_COMPONENT,
    componentTypes,
    RUBBER_MODE_KEY,
    VIEWPORT_KEY_PREFIX,
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
} from './constants/misc'
import Spinner from './components/common/spinner'

const elementModules = import.meta.glob('./components/elements/*.js')

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
} from './utils/canvasUtils'
import { isSelectPanMode } from './utils/drawModeUtils'
import { createDiamondPath } from './factory/diamond'
import { useCanvasClipboard } from './hooks/useCanvasClipboard'
import {
    ElementRenderWrapper,
    GroupRenderWrapper,
} from './components/utils/elementRenderWrappers'

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

var isDrawing
var defaultLinewidthValue = 1
var defaultStrokeTypeValue = null
var defaultStrokeColorValue = PENCIL_DEFAULT_COLOR

function addZUI(
    props,
    two,
    updateToGlobalState,
    updateComponentVertices,
    setOnGroupHandler,
    addToLocalComponentStore,
    setSelectedComponentInBoard,
    setArrowDrawModeOff,
    setTextDrawModeOff,
    setPointerElement,
    updateComponentBulkPropertiesInLocalStore,
    deleteComponentFromLocalStore,
    isPencilModeRef,
    createTextAtSurfaceRef,
    onCameraChangeRef
) {
    let shape = null
    let lastSelectedShape = null
    // Tracks the GroupedObjectWrapper's Two.js group while it has DOM focus.
    // Set/cleared by groupFocused/groupBlurred custom events.
    const activeGroupRef = { current: null }
    let domElement = two.renderer.domElement
    let zui = new ZUI(two.scene, domElement)
    let mouse = new Two.Vector()
    let touches = {}
    let distance = 0
    let lastTouch = null
    let touchStartX = 0
    let touchStartY = 0
    let twoFingerMidX = 0
    let twoFingerMidY = 0
    let lastTapTime = 0
    let lastTapX = 0
    let lastTapY = 0
    let dragging = false
    let isResizeEvent = false
    let currentPath
    let lastAddedPath
    let paths = []

    // Velocity-based pencil state
    let pencilGroup = null
    let pencilPath = null
    let pencilRawPoints = []
    let lastPencilPoint = null
    let lastPencilTime = 0
    let lastPencilLinewidth = null

    let viewportSaveTimer = null
    let scenario = null
    let SCENARIO_JUST_ADDED_ELEMENT = 'justAddedElement'
    let SCENARIO_PENCIL_MODE = 'pencilMode'
    let SCENARIO_ARROW_DRAW = 'arrowDraw'
    let SCENARIO_DRAW_SHAPE = 'drawShape'
    let SCENARIO_TEXT_DRAW = 'textDraw'
    let SCENARIO_RUBBER_MODE = 'rubberMode'
    let SCENARIO_DEFAULT = null

    const pendingDeletionSet = new Set()

    let arrowDrawElement = null
    let textDrawElement = null
    let drawOrigin = null
    let drawCurrentCoords = null
    let previewShape = null
    let drawShapeType = null
    let drawShapeProps = null
    let lastPlacedElement = null
    // Empty-canvas mousedown stores its origin here. The dotted group
    // selector is only materialised on the first mousemove, so a click
    // without drag never produces a stray rectangle (and dblclick on
    // empty canvas can spawn a text element cleanly).
    let pendingGroupSelectorOrigin = null

    const toSurface = (e) => zui.clientToSurface(e.clientX, e.clientY)
    zui.addLimits(0.06, 8)

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
    domElement.addEventListener('mousewheel', mousewheel, false)
    domElement.addEventListener('wheel', mousewheel, false)

    domElement.addEventListener('touchstart', touchstart, { passive: false })
    domElement.addEventListener('touchmove', touchmove, { passive: false })
    domElement.addEventListener('touchend', touchend, false)
    domElement.addEventListener('touchcancel', touchend, false)

    window.addEventListener('groupFocused', (e) => {
        activeGroupRef.current = e.detail?.group ?? null
    })
    window.addEventListener('groupBlurred', () => {
        activeGroupRef.current = null
    })

    function dblclick(e) {
        shape = null
        mouse.x = e.clientX
        mouse.y = e.clientY
        let avoidDragging = false
        // Hide all arrow endpoint circles before processing the new selection
        two.scene.children.forEach((child) => {
            if (child?.elementData?.componentType === 'arrowLine') {
                setArrowEndpointsVisible(child, false)
            }
        })

        const path = e.path || (e.composedPath && e.composedPath())
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
                localStorage.getItem(PENDING_SHAPE_TYPE_KEY) !== null
            if (!inDrawMode && createTextAtSurfaceRef?.current) {
                const surfaceCoords = toSurface(e)
                createTextAtSurfaceRef.current(
                    surfaceCoords.x,
                    surfaceCoords.y
                )
                return
            }
        }

        const showTextInput = (
            group,
            twoText,
            componentId,
            currentMetadata
        ) => {
            const groupDomElem = document.getElementById(`${group.id}`)
            if (!groupDomElem) return

            // Use the native SVG <text> DOM element to derive screen position
            const textDomElem = twoText._renderer.elem
            const screenRect = textDomElem.getBoundingClientRect()

            // Hide only the SVG text node so the rectangle shape stays visible
            // while the textarea overlays it for editing.
            textDomElem.style.display = 'none'
            selectionController.ui.visible = false
            two.update()

            const fontSize = twoText.size || DEFAULT_TEXT_SIZE
            // Use a generous line-height so ascenders/descenders are
            // never clipped. A LINE_HEIGHT_MULTIPLIER× covers most font metrics.
            const lineH = Math.ceil(fontSize * LINE_HEIGHT_MULTIPLIER)
            // Vertical padding inside the textarea prevents the top of
            // tall glyphs (H, d, l …) from being cut off by the element
            // boundary. Half the difference between lineH and fontSize
            // approximates the ascender headroom the browser needs.
            const vertPad = Math.ceil((lineH - fontSize) / 2) + 4

            const input = document.createElement('textarea')
            const randomId = Math.floor(Math.random() * 90 + 10)
            input.id = `new-text-input-area-${randomId}`
            input.value = twoText.value || ''
            input.rows = 1
            input.style.border = 'none'
            input.style.background = 'transparent'
            input.style.padding = `${vertPad}px 8px`
            input.style.color = twoText.fill || '#3A342C'
            input.style.fontSize = `${fontSize}px`
            input.style.fontFamily = twoText.family || 'Caveat'
            input.style.fontWeight = twoText.weight || 'normal'
            input.style.lineHeight = `${lineH}px`
            input.style.letterSpacing = '0px'
            input.style.textAlign = 'center'
            input.style.position = 'absolute'
            input.style.outline = 'none'
            input.style.resize = 'none'
            input.style.overflow = 'visible'
            input.style.whiteSpace = 'pre'
            input.style.boxSizing = 'border-box'
            input.className = 'temp-input-area'

            // Anchor point: the SVG text element's screen-space center
            const centerX = screenRect.left + screenRect.width / 2
            const centerY = screenRect.top + screenRect.height / 2

            // Locate the parent rectangle child so we can auto-grow it when
            // the text outgrows the box during edit. Only meaningful for
            // rectangle-with-text (componentId is set in that path).
            const rectChild = componentId
                ? group.children.find(
                      (c) =>
                          typeof c.value !== 'string' &&
                          typeof c.width === 'number' &&
                          typeof c.height === 'number'
                  )
                : null
            // Inner padding (surface units) preserved between the text and
            // the rectangle edge so glyphs never touch the border.
            const RECT_INNER_PAD_X = 24
            const RECT_INNER_PAD_Y = 12
            // Diamond's inscribed rect is smaller than its bbox; keep
            // padding tight so growth isn't aggressive. The slanted edges
            // already provide visual breathing room.
            const DIAMOND_INNER_PAD_X = 12
            const DIAMOND_INNER_PAD_Y = 6
            const shapeKind = group?.elementData?.componentType

            // Returns the minimum (w, h) for the host shape that fits a
            // text rect of (textSurfaceW, textSurfaceH). Per-shape geometry.
            const fitShape = (currentW, currentH, textSurfaceW, textSurfaceH) => {
                if (shapeKind === componentTypes.diamond) {
                    // Inscribed rect constraint: tw/w + th/h <= 1.
                    // Pad first, then solve for minimum w (keeping h fixed).
                    const TW = textSurfaceW + DIAMOND_INNER_PAD_X * 2
                    const TH = textSurfaceH + DIAMOND_INNER_PAD_Y * 2
                    let h = currentH
                    if (TH >= h - 1) {
                        // Text taller than current diamond — bump h just
                        // enough (text occupies ~85% of vertical budget).
                        h = Math.ceil(TH / 0.85)
                    }
                    const denom = 1 - TH / h
                    const wNeed =
                        denom > 0
                            ? Math.ceil(TW / denom)
                            : Number.POSITIVE_INFINITY
                    return { w: Math.max(currentW, wNeed), h }
                }
                // rectangle (default)
                const w = Math.max(
                    currentW,
                    Math.ceil(textSurfaceW + RECT_INNER_PAD_X * 2)
                )
                const h = Math.max(
                    currentH,
                    Math.ceil(textSurfaceH + RECT_INNER_PAD_Y * 2)
                )
                return { w, h }
            }
            // px-per-surface-unit derived from the rect's current screen
            // size; lets us convert the textarea's pixel measurement back
            // into Two.js surface units before resizing the rectangle.
            const rectScreen = rectChild?._renderer?.elem?.getBoundingClientRect()
            const zoom =
                rectChild && rectScreen && rectChild.width
                    ? rectScreen.width / rectChild.width
                    : 1

            document.getElementById('main-two-root').append(input)

            // ── Offscreen measurement helper ──
            // We create a hidden <span> with identical font styles and
            // read its offsetWidth/offsetHeight. This is more reliable
            // than textarea.scrollWidth which can be affected by cols,
            // min intrinsic sizing, and platform differences.
            const measureSpan = document.createElement('span')
            measureSpan.style.position = 'absolute'
            measureSpan.style.visibility = 'hidden'
            measureSpan.style.whiteSpace = 'pre'
            measureSpan.style.fontSize = `${fontSize}px`
            measureSpan.style.fontFamily = twoText.family || 'Caveat'
            measureSpan.style.fontWeight = twoText.weight || 'normal'
            measureSpan.style.lineHeight = `${lineH}px`
            measureSpan.style.letterSpacing = '0px'
            measureSpan.style.padding = '0'
            document.body.appendChild(measureSpan)

            const autoSizeAndCenter = () => {
                // Measure the text content with the hidden span
                const val = input.value || 'M' // fallback to 'M' so empty input still has width
                measureSpan.textContent = val

                const measuredW = measureSpan.offsetWidth
                const measuredH = measureSpan.offsetHeight

                // Total textarea size = measured text + padding + breathing room
                const contentWidth = Math.max(
                    measuredW + 40,
                    screenRect.width + 40,
                    80
                )
                const contentHeight = Math.max(
                    measuredH + vertPad * 2,
                    lineH + vertPad * 2
                )

                input.style.width = `${contentWidth}px`
                input.style.height = `${contentHeight}px`

                // Centre over the original text midpoint
                input.style.left = `${centerX - contentWidth / 2}px`
                input.style.top = `${centerY - contentHeight / 2}px`

                // Grow the parent rectangle so the centered text never
                // overflows its bounds. Symmetric growth preserves the
                // rectangle's center, which keeps centerX/centerY valid.
                if (rectChild) {
                    const textSurfaceW = measuredW / zoom
                    const textSurfaceH = measuredH / zoom
                    const { w: nextW, h: nextH } = fitShape(
                        rectChild.width,
                        rectChild.height,
                        textSurfaceW,
                        textSurfaceH
                    )
                    let rectChanged = false
                    if (rectChild.width < nextW) {
                        rectChild.width = nextW
                        rectChanged = true
                    }
                    if (rectChild.height < nextH) {
                        rectChild.height = nextH
                        rectChanged = true
                    }
                    if (rectChanged) two.update()
                }
            }

            autoSizeAndCenter()

            // Re-measure on every keystroke so the box grows with the text
            input.addEventListener('input', autoSizeAndCenter)

            input.focus()

            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault()
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

                textDomElem.style.display = ''
                // mousedown fires before blur, so if the user clicked empty
                // canvas, detach() already ran and currentGroup is null.
                // Only restore the selection UI if we still have a target.
                if (selectionController.currentGroup) {
                    selectionController.ui.visible = true
                    selectionController.syncToTarget()
                }
                two.update()

                const newContent = input.value

                // Reflect change in the Two.js text object
                twoText.value = newContent
                two.update()

                group.center()
                two.update()

                // this means "rectangle-with-text" is enabled
                if (componentId) {
                    // Use the live elementData.metadata (updated by toolbar ops
                    // like font-size and text-color) rather than the stale
                    // currentMetadata snapshot captured at dblclick time.
                    const latestMeta = group.elementData?.metadata || {}
                    const updatedMetadata = {
                        ...latestMeta,
                        hasText: true,
                        textContent: newContent,
                        textFill:
                            latestMeta.textFill ||
                            twoText.fill ||
                            '#3A342C',
                        textFontSize:
                            latestMeta.textFontSize || twoText.size || 24,
                        textFamily:
                            latestMeta.textFamily ||
                            twoText.family ||
                            'Caveat',
                        textFontFamily:
                            latestMeta.textFontFamily ||
                            twoText.family ||
                            'Caveat',
                        textBaseLine:
                            latestMeta.textBaseLine ||
                            twoText.baseline ||
                            'middle',
                    }
                    const persistPayload = { metadata: updatedMetadata }
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
                ct === componentTypes.diamond
            ) {
                const meta = shape.elementData.metadata || {}
                let twoText = shape.children.find(
                    (child) => typeof child.value === 'string'
                )
                if (!twoText) {
                    twoText = two.makeText(meta.textContent || '', 0, 0)
                    twoText.fill = meta.textFill || SHAPE_DEFAULT_STROKE
                    twoText.size = meta.textFontSize || DEFAULT_TEXT_SIZE
                    twoText.alignment = 'center'
                    twoText.baseline = meta.textBaseLine || 'middle'
                    twoText.family = meta.textFamily || 'Caveat'
                    shape.add(twoText)
                    two.update()
                }
                showTextInput(shape, twoText, shape.elementData.id, meta)
            }
        }
    }

    function eraseElementAtPoint(x, y) {
        const el = document.elementFromPoint(x, y)
        if (!el) return

        let target = el
        let componentId = null
        while (target && target !== document.body) {
            componentId = target.getAttribute?.('data-component-id')
            if (componentId) break
            target = target.parentElement
        }
        if (!componentId || pendingDeletionSet.has(componentId)) return

        const group = two.scene.children.find(
            (c) => c?.elementData?.id === componentId
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

    let lastHoveredCircleGroup = null

    // Singleton hover indicator — separate from the selection circles
    const hoverCircle = two.makeCircle(0, 0, 6)
    hoverCircle.fill = HOVER_COLOR
    hoverCircle.noStroke()
    hoverCircle.opacity = 0

    function hoverDetectMove(e) {
        if (!isSelectPanMode(isPencilModeRef.current)) {
            if (lastHoveredCircleGroup) {
                hoverCircle.opacity = 0
                two.update()
                lastHoveredCircleGroup = null
            }
            return
        }

        const worldPos = toSurface(e)
        let found = null
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

    function mousedown(e) {
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

        if (e?.srcElement?.lastChild?.id === 'two-0') {
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
        if (rubberMode === 'true') {
            scenario = SCENARIO_RUBBER_MODE
        } else if (arrowDrawMode === 'true') {
            scenario = SCENARIO_ARROW_DRAW
        } else if (textDrawMode === 'true') {
            scenario = SCENARIO_TEXT_DRAW
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

                document.getElementById('main-two-root').style.cursor =
                    'crosshair'

                // On first use the arrowLine module loads lazily — poll until the
                // React element appears in the scene before positioning it.
                // mousemove/mouseup already guard on arrowDrawElement being non-null,
                // so they are safe no-ops until this resolves.
                pollUntilElement(
                    two,
                    arrowId,
                    (el) => {
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
                    (child) => child?.elementData?.id === textId
                )

                if (textDrawElement) {
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
                document.getElementById('main-two-root').style.cursor = 'auto'
                break
            }
            case SCENARIO_DRAW_SHAPE: {
                const surfaceCoords = toSurface(e)
                drawOrigin = { x: surfaceCoords.x, y: surfaceCoords.y }
                drawCurrentCoords = { x: surfaceCoords.x, y: surfaceCoords.y }
                drawShapeType = localStorage.getItem(PENDING_SHAPE_TYPE_KEY)
                drawShapeProps = JSON.parse(
                    localStorage.getItem(PENDING_SHAPE_PROPS_KEY)
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
                document.getElementById('main-two-root').style.cursor =
                    'crosshair'
                break
            }
            case SCENARIO_JUST_ADDED_ELEMENT:
                domElement.addEventListener('mousemove', mousemove, false)

                // This block falls for the case when there is newly added element and we let user click
                // anywhere to set last added element's position
                const surfaceCoords = toSurface(e)

                let twoJSElement = two.scene.children.find(
                    (child) => child?.elementData?.id === lastAddedElementId
                )

                if (twoJSElement?.position) {
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

                document.getElementById('main-two-root').style.cursor = 'auto'
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
                two.scene.children.forEach((child) => {
                    if (child?.elementData?.componentType === 'arrowLine') {
                        setArrowEndpointsVisible(child, false)
                    }
                })

                const path = e.path || (e.composedPath && e.composedPath())
                ;({ shape, avoidDragging } = resolveShapeFromPath(path, two))

                // Endpoint circles are opacity:0 so pointer-events don't fire on them.
                // If the cursor was hovering over an endpoint (hoverCircle was visible),
                // use that to select the parent arrow — only in select/pan mode.
                if (shape === null && hoveredEndpointGroup) {
                    const parentArrow = two.scene.children.find(
                        (child) =>
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

                    let rect = document
                        .getElementById(shape.id)
                        .getBoundingClientRect()

                    dragging =
                        mouse.x > rect.left &&
                        mouse.x < rect.right &&
                        mouse.y > rect.top &&
                        mouse.y < rect.bottom

                    domElement.addEventListener('mousemove', mousemove, false)
                    domElement.addEventListener('mouseup', mouseup, false)
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
                        .querySelectorAll(
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

                    const textChild = groupForToolbar.children.find(
                        (child) => typeof child.value === 'string'
                    )

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

    function mousemove(e) {
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
                    (child) => child?.elementData?.id === lastAddedElementId
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
                    lastPencilLinewidth,
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
                        .hasAttribute('data-resize')
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

    function mouseup(e) {
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
                document.getElementById('main-two-root').style.cursor = 'auto'
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
                document.getElementById('main-two-root').style.cursor = 'auto'
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

                addToLocalComponentStore(finalId, drawShapeType, finalShapeData)

                // React renders the element asynchronously; poll until it appears in two.scene.children,
                // then remove the preview so there is no blank gap between preview removal and final render
                const removePreview = () => {
                    if (capturedPreview) {
                        two.remove(capturedPreview)
                        two.update()
                    }
                }
                pollUntilElement(two, finalId, removePreview, {
                    condition: (el) => !!el.children?.[0],
                    onTimeout: removePreview,
                })
                setSelectedComponentInBoard(null)

                drawOrigin = null
                drawCurrentCoords = null
                drawShapeType = null
                drawShapeProps = null
                setPointerElement('pointer')
                document.getElementById('main-two-root').style.cursor = 'auto'
                const hintBtn = document.getElementById(
                    'show-click-anywhere-btn'
                )
                if (hintBtn) hintBtn.style.opacity = 0
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
                    pencilComponentData
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
                    const groupWidth =
                        area.vertices[2].x - area.vertices[0].x
                    const groupHeight =
                        area.vertices[3].y - area.vertices[0].y
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
        document.querySelectorAll('.dragger-picker').forEach((el) => {
            el.style.pointerEvents = ''
        })

        shape = {}
        scenario = null

        two.update()

        domElement.removeEventListener('mousemove', mousemove, false)
        domElement.removeEventListener('mouseup', mouseup, false)
    }

    function mousewheel(e) {
        if (e.shiftKey === true || e.metaKey === true) {
            let dy = (e.wheelDeltaY || -e.deltaY) / 1000
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
            clearTimeout(viewportSaveTimer)
            viewportSaveTimer = setTimeout(() => {
                localStorage.setItem(
                    `${VIEWPORT_KEY_PREFIX}${props.boardId}`,
                    JSON.stringify({
                        tx: two.scene.translation.x,
                        ty: two.scene.translation.y,
                        scale: two.scene.scale,
                    })
                )
            }, 300)
        }
    }

    // --- Touch handlers ---
    // Routing:
    //   1 finger  → synthetic MouseEvent → existing mouse pipeline (select, drag, pencil, draw)
    //   2 fingers → pan canvas (midpoint delta) + pinch zoom (distance delta) simultaneously

    function touchstart(e) {
        e.preventDefault()

        if (e.touches.length === 1) {
            lastTouch = e.touches[0]
            touchStartX = lastTouch.clientX
            touchStartY = lastTouch.clientY

            // Clear any previous selection before processing the new tap.
            // On desktop this happens via focus/blur, but synthetic mouse events
            // don't transfer browser focus on mobile, so we do it explicitly here
            // — before mousedown so the new selection set inside mousedown survives.
            window.dispatchEvent(new CustomEvent('clearSelector', {}))

            // Dispatch mousedown on the actual element under the finger so
            // element-level listeners (interactjs resize handles, click handlers) fire correctly.
            const target =
                document.elementFromPoint(
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
            if (lastTouch) {
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

    function touchmove(e) {
        e.preventDefault()

        if (e.touches.length === 1) {
            lastTouch = e.touches[0]
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

    function touchend(e) {
        if (e.touches.length === 0 && lastTouch) {
            const endX = lastTouch.clientX
            const endY = lastTouch.clientY

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
                    document.activeElement.blur()
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
                    `craftbase_mobile_viewport_${props.boardId}`,
                    JSON.stringify({
                        tx: two.scene.translation.x,
                        ty: two.scene.translation.y,
                        scale: two.scene.scale,
                    })
                )
            }
            touches = {}
            distance = 0
        }
    }

    function twoFingerStart(e) {
        touches = {}
        for (let i = 0; i < e.touches.length; i++) {
            touches[e.touches[i].identifier] = e.touches[i]
        }
        const ids = Object.keys(touches)
        const a = touches[ids[0]]
        const b = touches[ids[1]]
        const dx = b.clientX - a.clientX
        const dy = b.clientY - a.clientY
        distance = Math.sqrt(dx * dx + dy * dy)
        twoFingerMidX = (a.clientX + b.clientX) / 2
        twoFingerMidY = (a.clientY + b.clientY) / 2
    }

    function twoFingerMove(e) {
        for (let i = 0; i < e.touches.length; i++) {
            touches[e.touches[i].identifier] = e.touches[i]
        }
        const ids = Object.keys(touches)
        if (ids.length < 2) return

        const a = touches[ids[0]]
        const b = touches[ids[1]]
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

const Canvas = (props) => {
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

    const [twoJSInstance, setTwoJSInstance] = useState(null)
    const [zuiInstance, setZuiInstance] = useState(null)
    const [onGroup, setOnGroup] = useState(null)
    const [componentsToRender, setComponentsToRender] = useState([])

    const stateRefForComponentStore = useRef()
    const isPencilModeRef = useRef(props.isPencilMode)
    const zuiInstanceRef = useRef(null)
    const renderGroupRef = useRef(null)
    const prevElementsRef = useRef([])
    const componentsToRenderRef = useRef([])
    // Holds the latest createTextAtSurface from BoardContext so the dblclick
    // handler (registered once inside addZUI) sees fresh closure state.
    const createTextAtSurfaceRef = useRef(null)
    useEffect(() => {
        createTextAtSurfaceRef.current = createTextAtSurface
    }, [createTextAtSurface])

    // Latest onCameraChange callback. Read from inside addZUI's DOM event
    // handlers via the ref to avoid the stale-closure trap (see CLAUDE.md).
    const onCameraChangeRef = useRef(props.onCameraChange)
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
        if (isMobile && props.boardId) {
            const saved = localStorage.getItem(
                `craftbase_mobile_viewport_${props.boardId}`
            )
            if (saved) {
                const { tx, ty, scale } = JSON.parse(saved)
                // zoomSet updates zui.zScale + surface.scale atomically.
                // Centering at (0,0) with initial translation (0,0) means no
                // translation side-effect from the zoom.
                zui_instance.zui.zoomSet(scale, 0, 0)
                // translateSurface increments from the post-zoom translation
                // (still 0,0) to the saved position.
                zui_instance.zui.translateSurface(tx, ty)
                two.update()
            }
        }

        if (!isMobile && props.boardId) {
            const saved = localStorage.getItem(
                `${VIEWPORT_KEY_PREFIX}${props.boardId}`
            )
            if (saved) {
                const { tx, ty, scale } = JSON.parse(saved)
                zui_instance.zui.zoomSet(scale, 0, 0)
                zui_instance.zui.translateSurface(tx, ty)
                two.update()
            }
        }

        onCameraChangeRef.current?.({
            scale: two.scene.scale,
            tx: two.scene.translation.x,
            ty: two.scene.translation.y,
        })

        const boardId = props.boardId
        const tabsOpen = localStorage.getItem(`tabs_open_${boardId}`)
        if (tabsOpen == null) {
            localStorage.setItem(`tabs_open_${boardId}`, 1)
        } else {
            localStorage.setItem(
                `tabs_open_${boardId}`,
                parseInt(tabsOpen) + parseInt(1)
            )
        }

        window.onunload = function (e) {
            const newTabCount = localStorage.getItem(`tabs_open_${boardId}`)
            if (newTabCount !== null) {
                localStorage.setItem(`tabs_open_${boardId}`, newTabCount - 1)
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
        if (props.isPencilMode === true) {
            isDrawing = true
            document.getElementById('main-two-root').style.cursor = 'crosshair'
        } else {
            isDrawing = false
            document.getElementById('main-two-root').style.cursor = 'auto'
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

    // on group select use effect hook
    useEffect(() => {
        if (onGroup) {
            let e = onGroup
            let x1Coord = e.left
            let x2Coord = e.right
            let y1Coord = e.top
            let y2Coord = e.bottom

            let xMid = parseInt(e.left) + parseInt(e.width / 2)
            let yMid = parseInt(e.top) + parseInt(e.height / 2)

            const newGroup = {}
            const newChildren = []
            const selectedComponentArr = []

            const allComponentCoords =
                Object.values(stateRefForComponentStore.current) || []
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
                    if (
                        item.componentType === 'pencil' &&
                        Array.isArray(item.metadata)
                    ) {
                        newMetadata = item.metadata.map((vert, index) => {
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
                                        parseInt(vert.x - item.metadata[0].x),
                                    y:
                                        relativeY +
                                        parseInt(vert.y - item.metadata[0].y),
                                    ...lwProp,
                                }
                            }
                        })
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
                            (child) => child?.elementData?.id === item.id
                        )
                        // Arrow factory adds line as first child (line, pointCircle1Group, pointCircle2Group)
                        const line = arrowShape?.children?.[0]
                        if (line?.vertices?.length >= 2) {
                            obj.x1 = parseInt(line.vertices[0].x)
                            obj.y1 = parseInt(line.vertices[0].y)
                            obj.x2 = parseInt(line.vertices[1].x)
                            obj.y2 = parseInt(line.vertices[1].y)
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

            twoJSInstance.scene.children.forEach((child) => {
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
        const onUndoRedoKeyDown = (evt) => {
            if (
                evt.key.toLowerCase() === 'z' &&
                (evt.ctrlKey || evt.metaKey)
            ) {
                evt.preventDefault()
                if (evt.shiftKey) {
                    redoLastAction()
                } else {
                    undoLastAction()
                }
            }
        }

        const onTextModeKeyDown = (evt) => {
            if (evt.key !== 't' && evt.key !== 'T') return
            if (evt.ctrlKey || evt.metaKey || evt.altKey) return
            const tag = document.activeElement?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return
            if (
                localStorage.getItem(TEXT_DRAW_MODE_KEY) === 'true' ||
                localStorage.getItem(ARROW_DRAW_MODE_KEY) === 'true' ||
                localStorage.getItem(RUBBER_MODE_KEY) === 'true' ||
                localStorage.getItem(PENCIL_MODE_KEY) === 'TRUE' ||
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

    const setOnGroupHandler = (obj) => {
        setOnGroup(obj)
    }

    const handleSetComponentsToRender = (currentComponents) => {
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
                        `./components/elements/${item.componentType}.js`
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
                    const ElementToRender = React.lazy(() => moduleLoader())
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
        const handleElementRemoved = (e) => {
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
        }
        window.addEventListener('elementRemoved', handleElementRemoved)
        return () => {
            window.removeEventListener('elementRemoved', handleElementRemoved)
        }
    }, [])

    const updateToGlobalState = (newShapeData, oldShapeData) => {
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

    const updateComponentVertices = (id, x, y) => {
        updateComponentVerticesInLocalStore(id, x, y)
        document.getElementById('show-click-anywhere-btn').style.opacity = 0
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
