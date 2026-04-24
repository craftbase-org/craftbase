import React, { useEffect, useState, useRef, Suspense } from 'react'
import Two from 'two.js'

import { ZUI } from 'two.js/extras/jsm/zui'
import { useBoardContext } from 'views/Board/board'
import { useMediaQueryUtils } from 'constants/exportHooks'

import {
    GROUP_COMPONENT,
    componentTypes,
    RUBBER_MODE_KEY,
} from 'constants/misc'
import Spinner from 'components/common/spinner'

const elementModules = import.meta.glob('./components/elements/*.js')

import Loader from 'components/utils/loader'
import SelectionController from 'canvas/selectionController'
import { updateX1Y1Vertices, updateX2Y2Vertices } from 'utils/updateVertices'
import { generateUUID } from 'utils/misc'
import {
    velocityToLinewidth,
    smoothLinewidth,
    simplifyWithLinewidth,
} from 'utils/pencilHelper'

function cloneElementData(src, boardId, newX, newY) {
    const cloned = {
        id: generateUUID(),
        boardId,
        componentType: src.componentType,
        x: newX,
        y: newY,
        x1: src.x1,
        y1: src.y1,
        x2: src.x2,
        y2: src.y2,
        width: src.width,
        height: src.height,
        fill: src.fill,
        stroke: src.stroke,
        strokeType: src.strokeType,
        linewidth: src.linewidth,
        radius: src.radius,
        iconStroke: src.iconStroke,
        textColor: src.textColor,
        metadata: src.metadata ? { ...src.metadata } : {},
        children: src.children
            ? typeof structuredClone === 'function'
                ? structuredClone(src.children)
                : JSON.parse(JSON.stringify(src.children))
            : null,
    }
    if (src.relativeX !== undefined) cloned.relativeX = src.relativeX
    if (src.relativeY !== undefined) cloned.relativeY = src.relativeY
    return cloned
}

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
var pencilStrokeColorValue = '#3A342C'

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
    isPencilModeRef
) {
    // console.log('two.renderer.domElement', two.renderer.domElement)
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
    let pencilRawPoints = []
    let lastPencilPoint = null
    let lastPencilTime = 0
    let lastPencilLinewidth = null

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

    function resolveShapeFromPath(path, two) {
        let shape = null
        let avoidDragging = false

        path.forEach((item) => {
            if (item?.classList?.value?.includes('avoid-dragging')) {
                avoidDragging = true
            }

            if (
                item.tagName === 'g' &&
                item?.classList?.value?.includes('dragger-picker') &&
                shape == null
            ) {
                if (item?.classList?.value?.includes('is-line-circle')) {
                    const parentId = document
                        .getElementById(item.id)
                        .getAttribute('data-parent-id')
                    const lineId = document
                        .getElementById(item.id)
                        .getAttribute('data-line-id')
                    const direction = document
                        .getElementById(item.id)
                        .getAttribute('data-direction')

                    const getParentTwoData = two.scene.children.find(
                        (child) => child.id === parentId
                    )
                    const getChildTwoData = getParentTwoData.children.find(
                        (child) => child.id === item.id
                    )
                    const getSiblingChild = getParentTwoData.children.find(
                        (child) =>
                            child.id !== item.id && child?.children?.length > 0
                    )
                    const getLineTwoData = getParentTwoData.children.find(
                        (child) => child.id === lineId
                    )

                    shape = getChildTwoData
                    shape.lineData = getLineTwoData
                    shape.direction = direction
                    shape.siblingCircle = getSiblingChild
                    shape.opacity = 1
                    shape.siblingCircle.opacity = 1
                    shape.elementData = {
                        isGroupSelector: false,
                        isLineCircle: true,
                        lineData: getLineTwoData,
                        parentData: getParentTwoData,
                    }
                } else {
                    shape = two.scene.children.find(
                        (child) => child.id === item.id
                    )

                    if (shape?.elementData?.componentType === 'arrowLine') {
                        if (shape.children[1]) shape.children[1].opacity = 1
                        if (shape.children[2]) shape.children[2].opacity = 1
                    }
                }
            }
        })

        return { shape, avoidDragging }
    }

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
        console.log('on double click', e)
        shape = null
        mouse.x = e.clientX
        mouse.y = e.clientY
        let avoidDragging = false
        let isGroupSelector = false
        // Hide all arrow endpoint circles before processing the new selection
        two.scene.children.forEach((child) => {
            if (child?.elementData?.componentType === 'arrowLine') {
                if (child.children[1]) child.children[1].opacity = 0
                if (child.children[2]) child.children[2].opacity = 0
            }
        })

        const path = e.path || (e.composedPath && e.composedPath())
        ;({ shape, avoidDragging } = resolveShapeFromPath(path, two))

        if (avoidDragging) {
            shape = {}
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

            const fontSize = twoText.size || 36
            // Use a generous line-height so ascenders/descenders are
            // never clipped. A 1.6× multiplier covers most font metrics.
            const lineH = Math.ceil(fontSize * 1.6)
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
            }

            autoSizeAndCenter()

            // Re-measure on every keystroke so the box grows with the text
            input.addEventListener('input', autoSizeAndCenter)

            // input.onfocus = function () {
            //     const bRect = twoText.getBoundingClientRect(true)
            //     selectorInstance.update(
            //         bRect.left - 4,
            //         bRect.right + 4,
            //         bRect.top - 4,
            //         bRect.bottom + 4
            //     )
            //     selectorInstance.show()
            //     two.update()
            // }

            input.focus()

            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault()
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
                // setTextValue(newContent)
                // textValueRef.current = newContent

                // Reflect change in the Two.js text object
                twoText.value = newContent
                two.update()

                // Recalculate bounds after value update
                const bRect = twoText.getBoundingClientRect(true)
                const newWidth = Math.round(bRect.width || 60)
                const newHeight = Math.round(bRect.height || twoText.size)

                // selectorInstance.update(
                //     bRect.left - 4,
                //     bRect.right + 4,
                //     bRect.top - 4,
                //     bRect.bottom + 4
                // )
                // selectorInstance.hide()
                group.center()
                two.update()

                // this means "rectangle-with-text" is enabled
                if (componentId) {
                    // Use the live elementData.metadata (updated by toolbar ops
                    // like font-size and text-color) rather than the stale
                    // currentMetadata snapshot captured at dblclick time.
                    const latestMeta = group.elementData?.metadata || {}
                    updateComponentBulkPropertiesInLocalStore(componentId, {
                        metadata: {
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
                        },
                    })
                }

                input.remove()
            })
        }

        if (shape !== null && !isPencilModeRef?.current) {
            if (shape.elementData?.componentType === componentTypes.rectangle) {
                const meta = shape.elementData.metadata || {}
                let twoText = shape.children.find(
                    (child) => typeof child.value === 'string'
                )
                if (!twoText) {
                    twoText = two.makeText(meta.textContent || '', 0, 0)
                    twoText.fill = meta.textFill || '#3A342C'
                    twoText.size = meta.textFontSize || 36
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

    const HOVER_THRESHOLD = 15
    let lastHoveredCircleGroup = null

    // Singleton hover indicator — separate from the selection circles
    const hoverCircle = two.makeCircle(0, 0, 6)
    hoverCircle.fill = 'rgba(196, 144, 26, 0.7)'
    hoverCircle.noStroke()
    hoverCircle.opacity = 0

    function hoverDetectMove(e) {
        const isSelectPanMode =
            !isPencilModeRef.current &&
            localStorage.getItem('arrowDrawMode') !== 'true' &&
            localStorage.getItem('textDrawMode') !== 'true' &&
            localStorage.getItem('pendingShapeType') === null &&
            localStorage.getItem(RUBBER_MODE_KEY) !== 'true'

        if (!isSelectPanMode) {
            if (lastHoveredCircleGroup) {
                hoverCircle.opacity = 0
                two.update()
                lastHoveredCircleGroup = null
            }
            return
        }

        const worldPos = zui.clientToSurface(e.clientX, e.clientY)
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
        // console.log('e in ZUI mouse down', e, e.clientX, e.clientY)
        const lastAddedElementId = localStorage.getItem('lastAddedElementId')

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

        const arrowDrawMode = localStorage.getItem('arrowDrawMode')
        const textDrawMode = localStorage.getItem('textDrawMode')
        const pendingShapeType = localStorage.getItem('pendingShapeType')
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
                const surfaceCoords = zui.clientToSurface(e.clientX, e.clientY)
                const arrowId = localStorage.getItem('lastAddedElementId')

                localStorage.removeItem('lastAddedElementId')
                localStorage.removeItem('arrowDrawMode')

                domElement.addEventListener('mousemove', mousemove, false)
                domElement.addEventListener('mouseup', mouseup, false)

                document.getElementById('main-two-root').style.cursor =
                    'crosshair'

                // On first use the arrowLine module loads lazily — poll until the
                // React element appears in the scene before positioning it.
                // mousemove/mouseup already guard on arrowDrawElement being non-null,
                // so they are safe no-ops until this resolves.
                const initArrowElement = (id, capturedCoords, retries = 0) => {
                    const el = two.scene.children.find(
                        (child) => child?.elementData?.id === id
                    )
                    if (el) {
                        arrowDrawElement = el
                        arrowDrawElement.position.x = capturedCoords.x
                        arrowDrawElement.position.y = capturedCoords.y

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
                    } else if (retries < 30) {
                        requestAnimationFrame(() =>
                            initArrowElement(id, capturedCoords, retries + 1)
                        )
                    }
                }
                requestAnimationFrame(() =>
                    initArrowElement(arrowId, surfaceCoords)
                )

                break
            }
            case SCENARIO_TEXT_DRAW: {
                const surfaceCoords = zui.clientToSurface(e.clientX, e.clientY)
                const textId = localStorage.getItem('lastAddedElementId')

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

                localStorage.removeItem('lastAddedElementId')
                localStorage.removeItem('textDrawMode')

                domElement.addEventListener('mouseup', mouseup, false)
                document.getElementById('main-two-root').style.cursor = 'auto'
                break
            }
            case SCENARIO_DRAW_SHAPE: {
                const surfaceCoords = zui.clientToSurface(e.clientX, e.clientY)
                drawOrigin = { x: surfaceCoords.x, y: surfaceCoords.y }
                drawCurrentCoords = { x: surfaceCoords.x, y: surfaceCoords.y }
                drawShapeType = localStorage.getItem('pendingShapeType')
                drawShapeProps = JSON.parse(
                    localStorage.getItem('pendingShapeProps')
                )

                localStorage.removeItem('pendingShapeType')
                localStorage.removeItem('pendingShapeProps')

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
                }

                if (previewShape) {
                    previewShape.fill = drawShapeProps?.fill || '#fff'
                    previewShape.stroke = drawShapeProps?.stroke || '#3A342C'
                    previewShape.linewidth = drawShapeProps?.linewidth || 1
                    previewShape.opacity = 0.6
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
                const clientToSurface = zui.clientToSurface(
                    e.clientX,
                    e.clientY
                )

                let twoJSElement = two.scene.children.find(
                    (child) => child?.elementData?.id === lastAddedElementId
                )

                if (twoJSElement?.position) {
                    twoJSElement.position.x = clientToSurface.x
                    twoJSElement.position.y = clientToSurface.y

                    two.update()

                    updateComponentVertices(
                        lastAddedElementId,
                        clientToSurface.x,
                        clientToSurface.y
                    )

                    lastPlacedElement = twoJSElement
                }

                localStorage.removeItem('lastAddedElementId')

                // remove event listeners for mousemove
                // domElement.removeEventListener('mousemove', mousemove, false)

                domElement.addEventListener('mousemove', mousemove, false)
                domElement.addEventListener('mouseup', mouseup, false)

                document.getElementById('main-two-root').style.cursor = 'auto'
                break
            case SCENARIO_PENCIL_MODE: {
                domElement.addEventListener('mousemove', mousemove, false)
                domElement.addEventListener('mouseup', mouseup, false)

                // Create a group for live preview segments
                pencilGroup = two.makeGroup()
                pencilRawPoints = []
                lastPencilLinewidth = defaultLinewidthValue

                const startCoords = zui.clientToSurface(e.clientX, e.clientY)
                lastPencilPoint = { x: startCoords.x, y: startCoords.y }
                lastPencilTime = performance.now()
                pencilRawPoints.push({
                    x: startCoords.x,
                    y: startCoords.y,
                    lw: lastPencilLinewidth,
                })
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

                // Hide all arrow endpoint circles and hover indicator before processing the new selection
                lastHoveredCircleGroup = null
                hoverCircle.opacity = 0
                two.scene.children.forEach((child) => {
                    if (child?.elementData?.componentType === 'arrowLine') {
                        if (child.children[1]) child.children[1].opacity = 0
                        if (child.children[2]) child.children[2].opacity = 0
                    }
                })

                const path = e.path || (e.composedPath && e.composedPath())
                ;({ shape, avoidDragging } = resolveShapeFromPath(path, two))

                if (avoidDragging) {
                    shape = {}
                }

                // if shape is null, we initialize it with root element

                // console.log('props.selectPanMode', props.selectPanMode)

                // in case if it's a group selector, it falls under below condition
                if (shape === null) {
                    // Clicking empty canvas clears any active selection.
                    lastSelectedShape = null
                    selectionController.detach()
                    // When a text input overlay is active (about to blur),
                    // the click is just dismissing the input — skip creating
                    // the group selector so no orphaned dotted rectangle
                    // is left on the canvas.
                    const activeTextInput =
                        document.querySelector('.temp-input-area')
                    if (activeTextInput) {
                        shape = {}
                        avoidDragging = true
                    } else {
                        // shape = two.scene
                        const { x1, x2, y1, y2 } = {
                            x1: 0,
                            x2: 10,
                            y1: 0,
                            y2: 10,
                        }
                        const area = two.makePath(
                            x1,
                            y1,
                            x2,
                            y1,
                            x2,
                            y2,
                            x1,
                            y2
                        )
                        area.fill = 'rgba(0,0,0,0)'
                        area.opacity = 1
                        area.linewidth = 1
                        area.dashes[0] = 4
                        area.stroke = '#505F79'

                        let newSelectorGroup = two.makeGroup(area)

                        const m = zui.clientToSurface(e.clientX, e.clientY)
                        mouse.copy(m)
                        newSelectorGroup.position.copy(mouse)

                        two.update()
                        shape = newSelectorGroup
                        isGroupSelector = true
                    }
                }

                // Track the last clicked element for copy operations.
                if (!isGroupSelector && shape?.elementData?.id) {
                    lastSelectedShape = shape
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

                    // console.log('on mouse down')
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

                // console.log('shape selected', shape)

                if (
                    !avoidDragging &&
                    !shape.elementData.isGroupSelector &&
                    !controllerHandledSelection
                ) {
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
        // console.log(
        //     'mouse move event',
        //     shape?.elementData,
        //     ' shape lineData',
        //     shape?.lineData,
        //     scenario
        // )
        // console.log('shape in mousemove', e, shape, props.selectPanMode)
        const lastAddedElementId = localStorage.getItem('lastAddedElementId')

        if (
            lastAddedElementId !== null &&
            localStorage.getItem('arrowDrawMode') !== 'true' &&
            localStorage.getItem('textDrawMode') !== 'true'
        ) {
            scenario = SCENARIO_JUST_ADDED_ELEMENT
        }

        switch (scenario) {
            case SCENARIO_ARROW_DRAW:
                if (arrowDrawElement) {
                    const surfaceCoords = zui.clientToSurface(
                        e.clientX,
                        e.clientY
                    )
                    const relX = surfaceCoords.x - arrowDrawElement.position.x
                    const relY = surfaceCoords.y - arrowDrawElement.position.y

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
                const surfaceCoordsMove = zui.clientToSurface(
                    e.clientX,
                    e.clientY
                )
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
            case SCENARIO_JUST_ADDED_ELEMENT:
                // This block falls for the case when there is newly added element and we let user click
                // anywhere to set last added element's position
                const clientToSurface = zui.clientToSurface(
                    e.clientX,
                    e.clientY
                )

                let twoJSElement = two.scene.children.find(
                    (child) => child?.elementData?.id === lastAddedElementId
                )

                if (twoJSElement?.position) {
                    twoJSElement.position.x = clientToSurface.x
                    twoJSElement.position.y = clientToSurface.y

                    two.update()
                }
                break
            case SCENARIO_PENCIL_MODE: {
                const pencilCoords = zui.clientToSurface(e.clientX, e.clientY)

                // Distance throttle: skip if too close to last point
                const pdx = pencilCoords.x - lastPencilPoint.x
                const pdy = pencilCoords.y - lastPencilPoint.y
                const pDist = Math.sqrt(pdx * pdx + pdy * pdy)
                if (pDist < 3) break

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

                // Create a 2-point path segment for live preview
                const segment = two.makePath(
                    lastPencilPoint.x,
                    lastPencilPoint.y,
                    pencilCoords.x,
                    pencilCoords.y
                )
                segment.noFill()
                segment.stroke = pencilStrokeColorValue
                segment.linewidth = smoothedLw
                segment.cap = 'round'
                segment.join = 'round'
                segment.closed = false
                pencilGroup.add(segment)

                // Record point with linewidth
                pencilRawPoints.push({
                    x: pencilCoords.x,
                    y: pencilCoords.y,
                    lw: smoothedLw,
                })

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
                    // console.log('element resize is being performed')
                    isResizeEvent = true
                    domElement.removeEventListener(
                        'mousemove',
                        mousemove,
                        false
                    )
                    domElement.removeEventListener('mouseup', mouseup, false)
                } else if (shape?.id || shape?.elementData) {
                    // console.log('element move operation is being performed')
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
                        // console.log('shape.position', shape)
                        let area = shape.children[0]
                        let x = e.clientX
                        let y = e.clientY

                        const m = zui.clientToSurface(x, y)
                        mouse.copy(m)

                        const width = mouse.x - shape.position.x
                        const height = mouse.y - shape.position.y

                        area.vertices[1].x = width
                        area.vertices[2].x = width
                        area.vertices[2].y = height
                        area.vertices[3].y = height

                        two.update()
                    } else {
                        if (!props.selectPanMode) {
                            // nothing
                        } else {
                            // zui.translateSurface(dx, dy)
                        }
                    }
                    mouse.set(e.clientX, e.clientY)
                    two.update()
                }
        }
    }

    function mouseup(e) {
        // console.log('e in ZUI mouse up', scenario)
        // old school logic here

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

                // TODO: select element here if tool lock is active
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
                // TODO: select element here if tool lock is active
                const pendingSelectionId = finalId
                const waitForNewElement = (id, retries = 0) => {
                    const el = two.scene.children.find(
                        (child) => child?.elementData?.id === id
                    )
                    if (el && el.children?.[0]) {
                        console.log(
                            '[waitForNewElement] found real element for',
                            id,
                            'at retry',
                            retries,
                            '— removing preview'
                        )
                        if (capturedPreview) {
                            two.remove(capturedPreview)
                            two.update()
                        }
                    } else if (retries < 300) {
                        requestAnimationFrame(() =>
                            waitForNewElement(id, retries + 1)
                        )
                    } else {
                        // Element took too long to mount (e.g. slow network).
                        // Remove the preview unconditionally to prevent a ghost
                        // shape lingering on the canvas after the real element loads.
                        console.log(
                            '[waitForNewElement] TIMEOUT (300 retries) for',
                            id,
                            '— force-removing preview'
                        )
                        if (capturedPreview) {
                            two.remove(capturedPreview)
                            two.update()
                        }
                    }
                }
                requestAnimationFrame(() =>
                    waitForNewElement(pendingSelectionId)
                )
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
                // TODO: select element here if tool lock is active
                setSelectedComponentInBoard(null)
                lastPlacedElement = null
                setPointerElement('pointer')
                domElement.removeEventListener('mousemove', mousemove, false)
                domElement.removeEventListener('mouseup', mouseup, false)
                break
            case SCENARIO_PENCIL_MODE: {
                const capturedPencilGroup = pencilGroup
                pencilGroup = null

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

                // Simplify points while preserving lw
                const simplifiedPoints = simplifyWithLinewidth(
                    pencilRawPoints,
                    1.5
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
                    stroke: pencilStrokeColorValue,
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
                const pencilWaitId = pencilId
                const waitForPencilElement = (id, retries = 0) => {
                    const el = two.scene.children.find(
                        (child) => child?.elementData?.id === id
                    )
                    if (el) {
                        if (capturedPencilGroup) {
                            two.remove(capturedPencilGroup)
                            two.update()
                        }
                    } else if (retries < 300) {
                        requestAnimationFrame(() =>
                            waitForPencilElement(id, retries + 1)
                        )
                    } else {
                        // Element took too long to mount (e.g. slow network).
                        // Remove the preview unconditionally to prevent a ghost stroke.
                        if (capturedPencilGroup) {
                            two.remove(capturedPencilGroup)
                            two.update()
                        }
                    }
                }
                requestAnimationFrame(() => waitForPencilElement(pencilWaitId))

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
                if (shape?.elementData?.isGroupSelector) {
                    // check on mouse up if shape's a group selector or not
                    // if yes, then call setOnGroup for adding a group in two.js space
                    let area = shape.children[0]
                    let obj = {
                        x: area.vertices[0].x + shape.translation.x,
                        y: area.vertices[0].y + shape.translation.y,
                        left: area.vertices[0].x + shape.translation.x,
                        right: area.vertices[1].x + shape.translation.x,
                        top: area.vertices[0].y + shape.translation.y,
                        bottom: area.vertices[3].y + shape.translation.y,
                        width: area.vertices[2].x - area.vertices[0].x,
                        height: area.vertices[3].y - area.vertices[0].y,
                    }
                    // console.log('shape group obj', obj)
                    two.remove(shape)
                    setOnGroupHandler(obj)
                    setSelectedComponentInBoard(null)
                } else if (shape?.elementData) {
                    // else shape is not a group selector then update shape's properties
                    if (
                        shape.elementData.x == shape.translation.x &&
                        shape.elementData.y == shape.translation.y
                    ) {
                        // console.log('no need to update')
                    } else {
                        if (shape?.elementData?.isLineCircle === true) {
                            // console.log('Element is a Line Circle')
                            // updating already created two.js scene groups to new x,y set
                            // shape.elementData.x = shape.translation.x
                            // shape.elementData.y = shape.translation.y
                            shape.opacity = 0
                            shape.siblingCircle.opacity = 0

                            oldShapeData = { ...shape.elementData }

                            newShapeData = Object.assign(
                                {},
                                shape.elementData,
                                {
                                    data: {
                                        // x: parseInt(shape.lineData.translation.x),
                                        // y: parseInt(shape.lineData.translation.y),
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
                            // updating already created two.js scene groups to new x,y set
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
            // console.log('shape.elementData.writable', newShapeData)
        }

        // let item = {
        //     elementId: shape.elementData.elementId,
        //     data: { x: shape.translation.x, y: shape.translation.y },
        // }
        // Restore pointer events on all components (may have been disabled during arrow drag)
        document.querySelectorAll('.dragger-picker').forEach((el) => {
            el.style.pointerEvents = ''
        })

        shape = {}
        scenario = null

        two.update()

        domElement.removeEventListener('mousemove', mousemove, false)
        domElement.removeEventListener('mouseup', mouseup, false)

        // reset shape to object or null after mouseup event
    }

    function mousewheel(e) {
        if (e.shiftKey === true || e.metaKey === true) {
            let dy = (e.wheelDeltaY || -e.deltaY) / 1000
            zui.zoomBy(dy, e.clientX, e.clientY)
        } else {
            zui.translateSurface(-e.deltaX, -e.deltaY)
        }

        two.update()
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

                // Clear all existing selectors first — on desktop this happens
                // via blur when focus shifts between elements, but synthetic
                // mouse events don't transfer browser focus on mobile.
                window.dispatchEvent(new CustomEvent('clearSelector', {}))

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
        }

        twoFingerMidX = newMidX
        twoFingerMidY = newMidY
        distance = newDist

        two.update()
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

const ElementRenderWrapper = (
    ElementToRender,
    data,
    deleteComponentFromLocalStore,
    componentStore
) => {
    const RenderElement = () => {
        const [twoJSShape, setTwoJSShape] = useState(null)
        const [componentData, setComponentData] = useState(null)

        // console.log('in render Element', data, getComponentInfoData?.component)

        useEffect(() => {
            // console.log(
            //     'componentStore change in element render wrapper',
            //     componentStore
            // )
            let allComponents = Object.values(componentStore)
            if (allComponents.length > 0) {
                let componentData = allComponents.find(
                    (item) => data.id === item.id
                )
                // console.log('find component from componentStore', componentData)
                componentData && setComponentData(componentData)
            }
        }, [componentStore])

        if (componentData === null) {
            return <></>
        }

        const handleDeleteComponent = (twoJSShape) => {
            deleteComponentFromLocalStore(data.id)
        }

        return data.twoJSInstance ? (
            componentData !== null ? (
                <ElementToRender
                    handleDeleteComponent={handleDeleteComponent}
                    {...data}
                    {...componentData}
                />
            ) : null
        ) : (
            <Spinner />
        )
    }
    return RenderElement
}

const GroupRenderWrapper = (ElementToRender, data) => {
    const RenderGroup = () => {
        // console.log('in render group wrapper', data)

        return data.twoJSInstance ? <ElementToRender {...data} /> : <Spinner />
    }
    return RenderGroup
}

const Canvas = (props) => {
    // console.log('getComponentsForBoardData', getComponentsForBoardData)

    const { isMobile } = useMediaQueryUtils()

    const {
        addToLocalComponentStore,
        deleteComponentFromLocalStore,
        updateComponentVerticesInLocalStore,
        updateComponentBulkPropertiesInLocalStore,
        setTwoJSInstanceInBoard,
        setSelectedComponentInBoard,
        setArrowDrawModeInBoard,
        setTextDrawModeInBoard,
        setCurrentElementInBoard,
        undoLastAction,
    } = useBoardContext()

    const [twoJSInstance, setTwoJSInstance] = useState(null)
    const [lastAddedPathId, setLastAddedPathId] = useState(null)
    const [zuiInstance, setZuiInstance] = useState(null)
    const [prevElements, setPrevElements] = useState([])
    const [onGroup, setOnGroup] = useState(null)
    const [componentsToRender, setComponentsToRender] = useState([])

    const stateRefForComponentStore = useRef()
    const isPencilModeRef = useRef(props.isPencilMode)
    const clipboardRef = useRef(null)
    const lastMouseRef = useRef({ clientX: 0, clientY: 0, hasMoved: false })
    const zuiInstanceRef = useRef(null)

    // useEffect(()=>{},[insertComponentSuccess])

    useEffect(() => {
        // setting pan displacement values to initial

        // console.log('CANVAS CDM', props.selectPanMode)
        const elem = document.getElementById('main-two-root')

        const two = new Two({
            fullscreen: true,
            // width: "auto",
        }).appendTo(elem)

        two.update()

        // console.log('two', two.scene)

        // two.scene.translation.x = -50
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
            isPencilModeRef
        )

        // this.props.getElementsData('CONSTRUCT', arr)
        setZuiInstance(zui_instance)
        setTwoJSInstance(two)
        setTwoJSInstanceInBoard(two)

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

        const boardId = props.boardId
        const tabsOpen = localStorage.getItem(`tabs_open_${boardId}`)
        // console.log(`tabs_open_${boardId}`, tabsOpen)
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
            // listening to the change in components in DB
            // this is especially for capturing INSERT operation
            // where I can assign mousemove event listener to the new component
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
        // console.log('on change props.lastAddedElement')

        if (props.lastAddedElement !== null) {
            let newArr = [
                {
                    ...props.lastAddedElement,
                    isDummy: true,
                },
            ]
            handleSetComponentsToRender(newArr)
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
        defaultLinewidthValue = props.pencilDefaultLinewidth || 1
    }, [props.pencilDefaultLinewidth])

    useEffect(() => {
        defaultStrokeTypeValue = props.pencilDefaultStrokeType || null
    }, [props.pencilDefaultStrokeType])

    useEffect(() => {
        pencilStrokeColorValue = props.pencilStrokeColor || '#3A342C'
    }, [props.pencilStrokeColor])

    // on group select use effect hook
    useEffect(() => {
        // let componentsArr = [...currentComponents]
        if (onGroup) {
            // console.log('on group useeffect', onGroup)
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
            let twoShapesToDelete = []

            // console.log(
            //     'onGroup get componentStore',
            //     stateRefForComponentStore.current
            // )
            // console.log('x1Coord,x2Coord', x1Coord, x2Coord)
            // console.log('y1Coord,y2Coord', y1Coord, y2Coord)
            const allComponentCoords =
                Object.values(stateRefForComponentStore.current) || []
            // console.log(
            //     'area_selection allComponentCoords',
            //     xMid,
            //     yMid,
            //     state.getCoordGraph
            // )
            // console.log('allComponentCoords', allComponentCoords)
            allComponentCoords.forEach((item, index) => {
                if (
                    item.x > x1Coord &&
                    item.x < x2Coord &&
                    item.y > y1Coord &&
                    item.y < y2Coord
                ) {
                    // console.log('inside component coords condition')
                    selectedComponentArr.push(item.id)

                    let relativeX = item.x - xMid
                    let relativeY = item.y - yMid

                    let newMetadata = item.metadata
                    if (item.componentType === 'pencil') {
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
                    // console.log('newMetadata', newMetadata)
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

            // Adding half width/height to x,y coords
            // due to selector rectangle being in inside
            // of selected area portion
            newGroup.x = e.x + e.width / 2
            newGroup.y = e.y + e.height / 2

            newGroup.children = newChildren

            // console.log('newGroup.children', newGroup.children)
            // filter out those selected children (which are now grouped into one) from main current components array
            // that means we dont render those components as seperate rather they
            // are now children of this new group

            twoJSInstance.scene.children.forEach((child) => {
                if (selectedComponentArr.includes(child?.elementData?.id)) {
                    child.opacity = 0
                    twoJSInstance.update()
                }
            })

            handleSetComponentsToRender([newGroup])
        }
    }, [onGroup])

    // Track the last cursor position in client coords so paste can land at
    // the mouse location. Window-level so it stays current even when the
    // cursor is over an overlay.
    useEffect(() => {
        const onMove = (e) => {
            lastMouseRef.current = {
                clientX: e.clientX,
                clientY: e.clientY,
                hasMoved: true,
            }
        }
        window.addEventListener('mousemove', onMove)
        return () => window.removeEventListener('mousemove', onMove)
    }, [])

    useEffect(() => {
        zuiInstanceRef.current = zuiInstance
    }, [zuiInstance])

    useEffect(() => {
        const onCopyEvent = (evt) => {
            if (evt.key !== 'c' || !(evt.ctrlKey || evt.metaKey)) return
            console.log('on copy')
            const tag = document.activeElement?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return

            const zuiInst = zuiInstanceRef.current
            const liveGroup = zuiInst?.getSelectedGroup?.()
            if (!liveGroup?.elementData?.id) return
            if (!twoJSInstance) return
            evt.preventDefault()

            const originX = liveGroup.translation.x
            const originY = liveGroup.translation.y
            const elementData = liveGroup.elementData

            let payload
            if (elementData.componentType === GROUP_COMPONENT) {
                const children = Array.isArray(elementData.children)
                    ? elementData.children
                    : []
                payload = {
                    kind: 'group',
                    origin: { x: originX, y: originY },
                    width: elementData.width,
                    height: elementData.height,
                    items: children.map((child) => ({ ...child })),
                }
            } else {
                const item = {
                    ...elementData,
                    relativeX: 0,
                    relativeY: 0,
                }
                // For arrowLine, read live vertex coords (elementData can be stale).
                if (elementData.componentType === 'arrowLine') {
                    const line = liveGroup.children?.[0]
                    if (line?.vertices?.length >= 2) {
                        item.x1 = parseInt(line.vertices[0].x)
                        item.y1 = parseInt(line.vertices[0].y)
                        item.x2 = parseInt(line.vertices[1].x)
                        item.y2 = parseInt(line.vertices[1].y)
                    }
                }
                // For newText, elementData is set once at mount; read live Two.js
                // text object values so edits made after mounting are captured.
                if (elementData.componentType === 'newText') {
                    const twoText = liveGroup.children?.[0]
                    if (twoText && typeof twoText.value === 'string') {
                        item.textColor = twoText.fill || item.textColor
                        item.metadata = {
                            ...item.metadata,
                            content: twoText.value,
                            fontSize: twoText.size || item.metadata?.fontSize,
                            textFontFamily:
                                twoText.family || item.metadata?.textFontFamily,
                        }
                    }
                }
                payload = {
                    kind: 'single',
                    origin: { x: originX, y: originY },
                    items: [item],
                }
            }
            clipboardRef.current = payload
        }
        window.addEventListener('keydown', onCopyEvent)
        return () => window.removeEventListener('keydown', onCopyEvent)
    }, [twoJSInstance])

    useEffect(() => {
        const onPasteEvent = (evt) => {
            if (evt.key !== 'v' || !(evt.ctrlKey || evt.metaKey)) return
            const tag = document.activeElement?.tagName
            console.log('on paste', tag, clipboardRef.current)
            if (tag === 'INPUT' || tag === 'TEXTAREA') return

            const clipboard = clipboardRef.current
            if (!clipboard || !clipboard.items?.length) return

            const zuiInst = zuiInstanceRef.current
            if (!zuiInst?.zui) return
            evt.preventDefault()

            // Resolve paste origin in canvas coords. If the cursor hasn't
            // moved since load, fall back to viewport center.
            let clientX = lastMouseRef.current.clientX
            let clientY = lastMouseRef.current.clientY
            if (!lastMouseRef.current.hasMoved) {
                const rect = document
                    .getElementById('main-two-root')
                    ?.getBoundingClientRect()
                if (rect) {
                    clientX = rect.left + rect.width / 2
                    clientY = rect.top + rect.height / 2
                }
            }
            const surface = zuiInst.zui.clientToSurface(clientX, clientY)
            const px = surface.x
            const py = surface.y

            if (clipboard.kind === 'single') {
                const src = clipboard.items[0]
                const newItem = cloneElementData(src, props.boardId, px, py)
                // Normalize arrow so its tail (vertex 0) lands exactly at the
                // cursor. The arrowLine factory treats x1/y1 as local offsets
                // from the group origin; keeping them at 0 avoids any drift.
                if (src.componentType === 'arrowLine') {
                    const dx = (src.x2 ?? 0) - (src.x1 ?? 0)
                    const dy = (src.y2 ?? 0) - (src.y1 ?? 0)
                    newItem.x1 = 0
                    newItem.y1 = 0
                    newItem.x2 = dx
                    newItem.y2 = dy
                }
                addToLocalComponentStore(
                    newItem.id,
                    newItem.componentType,
                    newItem
                )
                return
            }

            if (clipboard.kind === 'group') {
                const newChildren = clipboard.items.map((child) => {
                    const rX = child.relativeX ?? 0
                    const rY = child.relativeY ?? 0
                    // Children use LOCAL coords relative to the group origin.
                    // GroupedObjectWrapper sets coreObject.translation = item.x/y
                    // inside a group already at (px, py), so passing rX/rY keeps
                    // scene position at (px + rX, py + rY).
                    const cloned = cloneElementData(
                        child,
                        props.boardId,
                        rX,
                        rY
                    )
                    cloned.relativeX = rX
                    cloned.relativeY = rY
                    return cloned
                })
                const newGroup = {
                    id: generateUUID(),
                    boardId: props.boardId,
                    componentType: GROUP_COMPONENT,
                    x: px,
                    y: py,
                    width: clipboard.width,
                    height: clipboard.height,
                    fill: null,
                    stroke: null,
                    children: newChildren,
                }
                addToLocalComponentStore(newGroup.id, GROUP_COMPONENT, newGroup)
            }
        }
        window.addEventListener('keydown', onPasteEvent)
        return () => window.removeEventListener('keydown', onPasteEvent)
    }, [props.boardId, addToLocalComponentStore])

    useEffect(() => {
        const onUndoKeyDown = (evt) => {
            if (evt.key === 'z' && (evt.ctrlKey || evt.metaKey)) {
                evt.preventDefault()
                undoLastAction()
            }
        }
        window.addEventListener('keydown', onUndoKeyDown)
        return () => window.removeEventListener('keydown', onUndoKeyDown)
    }, [undoLastAction])

    const setOnGroupHandler = (obj) => {
        setOnGroup(obj)
    }

    const handleSetComponentsToRender = (currentComponents) => {
        let arr = [...prevElements]
        let components = [...componentsToRender]
        if (currentComponents && twoJSInstance) {
            currentComponents.forEach((item, index) => {
                // prevElements is the sole authority on whether a wrapper already exists.
                // We must NOT check existsInScene here: on slow networks the React lazy
                // module may still be loading (no Two.js group yet) when a second shape is
                // drawn, causing existsInScene=false even though a wrapper was already
                // created — which would produce a second wrapper and a duplicate shape.
                // Deletion removes the id from prevElements via the 'elementRemoved' event,
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

                if (prevElements.includes(item.id)) {
                    // do nothing
                } else {
                    arr.push(item.id)
                    const ElementToRender = React.lazy(() => moduleLoader())
                    const data = {
                        twoJSInstance: twoJSInstance,
                        id: item.id,
                        boardId: props.boardId,
                        // childrenArr: item.children,
                        itemData: item,
                    }

                    // Different render wrapper for components and group
                    let component = null
                    // console.log(
                    //     'in current components to render logic',
                    //     currentComponents,
                    //     props.componentStore
                    // )
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
            setComponentsToRender(components)
            twoJSInstance && setPrevElements(arr)
        }
    }

    // When an element is deleted or its ADD is undone, remove it from prevElements
    // so handleSetComponentsToRender can create a fresh wrapper if the element is
    // ever restored (e.g. undo of a delete).
    useEffect(() => {
        const handleElementRemoved = (e) => {
            const { id } = e.detail
            setPrevElements((prev) => prev.filter((eid) => eid !== id))
        }
        window.addEventListener('elementRemoved', handleElementRemoved)
        return () => {
            window.removeEventListener('elementRemoved', handleElementRemoved)
        }
    }, [])

    const updateToGlobalState = (newShapeData, oldShapeData) => {
        const userId = localStorage.getItem('userId')
        // Initial arrow placement: prevX is -9999 (off-screen staging value).
        // The ADD history entry already covers this insertion, so the position
        // updates that follow should not create extra undo steps.
        const isInitialArrowPlacement = newShapeData.prevX === -9999

        // also check that new x,y is updated or not by comparing to prev x,y
        // then only perform mutation
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

    // if (componentsToRender.length === 0) {
    //     return <></>
    // }

    // console.log('componentsToRender', componentsToRender)
    return (
        <>
            {/* <div id="rsz-rect"></div> */}

            <div id="selector-rect"></div>
            <div id="pan-dragger"></div>

            <div id="main-two-root"></div>
            {/* {twoJSInstance && (
                <React.Fragment>{renderElements()}</React.Fragment>
            )} */}
            {componentsToRender.map((Component, index) => (
                <Suspense key={index} fallback={<Loader />}>
                    <Component />
                </Suspense>
            ))}
            {/* <Zoomer sceneInstance={twoJSInstance} /> */}
        </>
    )
}

export default Canvas
