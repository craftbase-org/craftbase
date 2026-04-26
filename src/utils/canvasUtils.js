import { SHAPE_DEFAULT_STROKE } from 'constants/misc'
import { generateUUID } from 'utils/misc'

// Show or hide the endpoint circles on an arrowLine group.
// children[1] and children[2] are the endpoint handle groups.
export function setArrowEndpointsVisible(shape, visible) {
    const opacity = visible ? 1 : 0
    if (shape?.children[1]) shape.children[1].opacity = opacity
    if (shape?.children[2]) shape.children[2].opacity = opacity
}

// Convert a mouse event's client coords to Two.js surface coords via ZUI.
export function clientToSurface(zui, e) {
    return zui.clientToSurface(e.clientX, e.clientY)
}

// Apply visual style properties to a Two.js shape.
export function applyShapeStyle(shape, { fill, stroke, linewidth, opacity } = {}) {
    if (fill !== undefined) shape.fill = fill
    if (stroke !== undefined) shape.stroke = stroke || SHAPE_DEFAULT_STROKE
    if (linewidth !== undefined) shape.linewidth = linewidth
    if (opacity !== undefined) shape.opacity = opacity
}

/**
 * Poll `two.scene.children` for an element with the given id, calling
 * `onFound(el)` once the element (and optional extra condition) is present.
 * Falls back to `onTimeout()` after `maxRetries` animation frames.
 *
 * @param {object} two - Two.js instance
 * @param {string} id - elementData.id to search for
 * @param {function} onFound - called with the matched element
 * @param {object} [opts]
 * @param {function} [opts.condition] - extra predicate beyond element existing
 * @param {number}   [opts.maxRetries=300]
 * @param {function} [opts.onTimeout]
 */
// Deep-clone a canvas element's data for copy/paste, assigning a new UUID
// and positioning at (newX, newY).
export function cloneElementData(src, boardId, newX, newY) {
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
        metadata: Array.isArray(src.metadata)
            ? src.metadata.map((p) => ({ ...p }))
            : src.metadata
              ? { ...src.metadata }
              : {},
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

// Walk the DOM event path to find the Two.js group and determine drag behavior.
export function resolveShapeFromPath(path, two) {
    let shape = null
    let avoidDragging = false

    path.forEach((item) => {
        if (item?.classList?.value?.includes('avoid-dragging')) {
            avoidDragging = true
            if (item.tagName === 'g' && shape == null) {
                shape = two.scene.children.find((child) => child.id === item.id) ?? null
            }
        }

        if (
            item.tagName === 'g' &&
            item?.classList?.value?.includes('dragger-picker') &&
            shape == null
        ) {
            if (item?.classList?.value?.includes('is-line-circle')) {
                const parentId = document.getElementById(item.id).getAttribute('data-parent-id')
                const lineId = document.getElementById(item.id).getAttribute('data-line-id')
                const direction = document.getElementById(item.id).getAttribute('data-direction')

                const getParentTwoData = two.scene.children.find((child) => child.id === parentId)
                const getChildTwoData = getParentTwoData.children.find((child) => child.id === item.id)
                const getSiblingChild = getParentTwoData.children.find(
                    (child) => child.id !== item.id && child?.children?.length > 0
                )
                const getLineTwoData = getParentTwoData.children.find((child) => child.id === lineId)

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
                shape = two.scene.children.find((child) => child.id === item.id)
                if (shape?.elementData?.componentType === 'arrowLine') {
                    setArrowEndpointsVisible(shape, true)
                }
            }
        }
    })

    return { shape, avoidDragging }
}

export function pollUntilElement(two, id, onFound, { condition = () => true, maxRetries = 300, onTimeout } = {}) {
    const attempt = (retries) => {
        const el = two.scene.children.find((child) => child?.elementData?.id === id)
        if (el && condition(el)) {
            onFound(el)
        } else if (retries < maxRetries) {
            requestAnimationFrame(() => attempt(retries + 1))
        } else {
            onTimeout?.()
        }
    }
    requestAnimationFrame(() => attempt(0))
}
