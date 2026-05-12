import { SHAPE_DEFAULT_STROKE } from '../constants/misc'
import { generateUUID } from './misc'

// Two.js scene/shape objects in the codebase carry extra bookkeeping fields
// (elementData, _renderer, etc.) that aren't part of the published types. Keep
// these parameters loose; Stages 7–9 will install canonical scene types.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZUILike = any

interface MouseLikeEvent {
    clientX: number
    clientY: number
}

interface ShapeStyleUpdate {
    fill?: string
    stroke?: string | null
    linewidth?: number
    opacity?: number
}

// Show or hide the endpoint circles on an arrowLine group.
// children[1] and children[2] are the endpoint handle groups.
export function setArrowEndpointsVisible(
    shape: ShapeLike,
    visible: boolean
): void {
    const opacity = visible ? 1 : 0
    if (shape?.children?.[1]) shape.children[1].opacity = opacity
    if (shape?.children?.[2]) shape.children[2].opacity = opacity
}

// Convert a mouse event's client coords to Two.js surface coords via ZUI.
export function clientToSurface(
    zui: ZUILike,
    e: MouseLikeEvent
): { x: number; y: number } {
    return zui.clientToSurface(e.clientX, e.clientY)
}

// Apply visual style properties to a Two.js shape.
export function applyShapeStyle(
    shape: ShapeLike,
    { fill, stroke, linewidth, opacity }: ShapeStyleUpdate = {}
): void {
    if (fill !== undefined) shape.fill = fill
    if (stroke !== undefined) shape.stroke = stroke || SHAPE_DEFAULT_STROKE
    if (linewidth !== undefined) shape.linewidth = linewidth
    if (opacity !== undefined) shape.opacity = opacity
}

// Component-row shape passed into cloneElementData. Loose-but-honest mapping
// over the DB schema; full ComponentRecord shape lives in src/types/board.ts
// but cloneElementData also handles canvas-only fields (relativeX/Y), hence
// the local interface.
interface ElementCloneSource {
    componentType: string
    x1: number
    y1: number
    x2: number
    y2: number
    width: number
    height: number
    fill: string
    stroke: string | null
    strokeType: string | null
    linewidth: number | null
    radius: number | null
    iconStroke: string | null
    textColor: string | null
    metadata: unknown
    children: unknown
    relativeX?: number
    relativeY?: number
}

interface ClonedElement extends ElementCloneSource {
    id: string
    boardId: string
    x: number
    y: number
}

// Deep-clone a canvas element's data for copy/paste, assigning a new UUID
// and positioning at (newX, newY).
export function cloneElementData(
    src: ElementCloneSource,
    boardId: string,
    newX: number,
    newY: number
): ClonedElement {
    const cloned: ClonedElement = {
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
            ? src.metadata.map((p: unknown) =>
                  typeof p === 'object' && p !== null ? { ...p } : p
              )
            : src.metadata
              ? { ...(src.metadata as Record<string, unknown>) }
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

interface ResolveResult {
    shape: ShapeLike | null
    avoidDragging: boolean
}

// Walk the DOM event path to find the Two.js group and determine drag behavior.
export function resolveShapeFromPath(
    path: Element[],
    two: TwoLike
): ResolveResult {
    let shape: ShapeLike | null = null
    let avoidDragging = false

    path.forEach((item) => {
        const classList = (item as HTMLElement)?.classList
        if (classList?.value?.includes('avoid-dragging')) {
            avoidDragging = true
            if (item.tagName === 'g' && shape == null) {
                shape =
                    two.scene.children.find(
                        (child: ShapeLike) => child.id === item.id
                    ) ?? null
            }
        }

        if (
            item.tagName === 'g' &&
            classList?.value?.includes('dragger-picker') &&
            shape == null
        ) {
            if (classList.value.includes('is-line-circle')) {
                const el = document.getElementById(item.id)
                const parentId = el?.getAttribute('data-parent-id')
                const lineId = el?.getAttribute('data-line-id')
                const direction = el?.getAttribute('data-direction')

                const getParentTwoData = two.scene.children.find(
                    (child: ShapeLike) => child.id === parentId
                )
                const getChildTwoData = getParentTwoData.children.find(
                    (child: ShapeLike) => child.id === item.id
                )
                const getSiblingChild = getParentTwoData.children.find(
                    (child: ShapeLike) =>
                        child.id !== item.id && child?.children?.length > 0
                )
                const getLineTwoData = getParentTwoData.children.find(
                    (child: ShapeLike) => child.id === lineId
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
                    (child: ShapeLike) => child.id === item.id
                )
                if (shape?.elementData?.componentType === 'arrowLine') {
                    setArrowEndpointsVisible(shape, true)
                }
            }
        }
    })

    return { shape, avoidDragging }
}

interface PollOptions {
    condition?: (el: ShapeLike) => boolean
    maxRetries?: number
    onTimeout?: () => void
}

/**
 * Poll `two.scene.children` for an element with the given id, calling
 * `onFound(el)` once the element (and optional extra condition) is present.
 * Falls back to `onTimeout()` after `maxRetries` animation frames.
 */
export function pollUntilElement(
    two: TwoLike,
    id: string,
    onFound: (el: ShapeLike) => void,
    { condition = () => true, maxRetries = 300, onTimeout }: PollOptions = {}
): void {
    const attempt = (retries: number): void => {
        const el = two.scene.children.find(
            (child: ShapeLike) => child?.elementData?.id === id
        )
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
