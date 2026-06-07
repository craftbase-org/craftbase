// Geometry for connection ports. Given a shape group and an edge, returns the
// surface-space anchor at that edge's midpoint — the point a connector arrow's
// tail (or head) pins to, and re-anchors to whenever the shape moves/resizes.

// Two.js scene groups carry codebase-specific bookkeeping outside the published
// types; stay loose here (matches selectionController/newCanvas convention).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GroupLike = any

// Edge names mirror the resize-handle naming used by the selection controller.
export type PortEdge = 'n-resize' | 'e-resize' | 's-resize' | 'w-resize'

// `gap` (surface units) pushes the anchor outward past the edge so the tail
// lands on the floated selection port instead of flush against the edge.
export function getShapePortPoint(
    group: GroupLike,
    edge: string,
    gap = 0
): { x: number; y: number } {
    const shape = group?.children?.[0]
    const w = shape?.width ?? group?.elementData?.width ?? 0
    const h = shape?.height ?? group?.elementData?.height ?? 0
    const cx = group?.translation?.x ?? 0
    const cy = group?.translation?.y ?? 0

    let ox = 0
    let oy = 0
    switch (edge) {
        case 'n-resize':
            oy = -(h / 2 + gap)
            break
        case 's-resize':
            oy = h / 2 + gap
            break
        case 'e-resize':
            ox = w / 2 + gap
            break
        case 'w-resize':
            ox = -(w / 2 + gap)
            break
        default:
            break
    }

    // Honour shape rotation so the port tracks a rotated edge midpoint.
    const rot = group?.rotation || 0
    if (rot) {
        const cos = Math.cos(rot)
        const sin = Math.sin(rot)
        const rx = ox * cos - oy * sin
        const ry = ox * sin + oy * cos
        ox = rx
        oy = ry
    }

    return { x: cx + ox, y: cy + oy }
}
