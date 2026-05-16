/**
 * Pencil helper utilities for velocity-based variable stroke width.
 *
 * Slow drawing = thick lines, fast drawing = thin lines.
 */

// Velocity thresholds (px/ms)
const SLOW_VELOCITY = 0.1
const FAST_VELOCITY = 1.5

export interface PencilPoint {
    x: number
    y: number
    lw?: number
}

/**
 * Maps drawing velocity (px/ms) to a linewidth.
 * Slow = thick (baseWidth * 2), fast = thin (baseWidth * 0.5).
 */
export function velocityToLinewidth(velocity: number, baseWidth: number): number {
    const maxWidth = baseWidth * 2.5
    const minWidth = baseWidth * 0.5

    const clampedVelocity = Math.max(
        SLOW_VELOCITY,
        Math.min(FAST_VELOCITY, velocity)
    )

    const t =
        (clampedVelocity - SLOW_VELOCITY) / (FAST_VELOCITY - SLOW_VELOCITY)
    return maxWidth - t * (maxWidth - minWidth)
}

/**
 * Exponential moving average to smooth linewidth transitions.
 */
export function smoothLinewidth(
    prevWidth: number,
    targetWidth: number,
    factor = 0.3
): number {
    return prevWidth + factor * (targetWidth - prevWidth)
}

/**
 * Perpendicular distance from a point to a line segment (for RDP algorithm).
 */
function perpendicularDistance(
    point: PencilPoint,
    lineStart: PencilPoint,
    lineEnd: PencilPoint
): number {
    const dx = lineEnd.x - lineStart.x
    const dy = lineEnd.y - lineStart.y

    if (dx === 0 && dy === 0) {
        return Math.sqrt(
            (point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2
        )
    }

    const t =
        ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
        (dx * dx + dy * dy)
    const clampedT = Math.max(0, Math.min(1, t))
    const projX = lineStart.x + clampedT * dx
    const projY = lineStart.y + clampedT * dy

    return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2)
}

/**
 * Ramer-Douglas-Peucker simplification that preserves {x, y, lw} tuples.
 */
export function simplifyWithLinewidth(
    points: PencilPoint[],
    epsilon: number
): PencilPoint[] {
    if (points.length <= 2) return points

    let maxDist = 0
    let maxIndex = 0

    for (let i = 1; i < points.length - 1; i++) {
        const dist = perpendicularDistance(
            points[i]!,
            points[0]!,
            points[points.length - 1]!
        )
        if (dist > maxDist) {
            maxDist = dist
            maxIndex = i
        }
    }

    if (maxDist > epsilon) {
        const left = simplifyWithLinewidth(
            points.slice(0, maxIndex + 1),
            epsilon
        )
        const right = simplifyWithLinewidth(points.slice(maxIndex), epsilon)
        return left.slice(0, -1).concat(right)
    }

    return [points[0]!, points[points.length - 1]!]
}

/**
 * Groups consecutive points with similar linewidths into longer path segments.
 * Adjacent groups share an overlap point to prevent visual gaps.
 *
 * Returns array of point arrays, each representing one path segment.
 */
export function mergeSegmentsByLinewidth(
    points: PencilPoint[],
    lwTolerance = 0.3
): PencilPoint[][] {
    if (points.length <= 1) return [points]

    const segments: PencilPoint[][] = []
    let currentSegment: PencilPoint[] = [points[0]!]

    for (let i = 1; i < points.length; i++) {
        const prevLw = currentSegment[currentSegment.length - 1]!.lw ?? 1
        const currLw = points[i]!.lw ?? 1

        if (
            Math.abs(currLw - prevLw) / Math.max(prevLw, currLw) <=
            lwTolerance
        ) {
            currentSegment.push(points[i]!)
        } else {
            segments.push(currentSegment)
            currentSegment = [
                currentSegment[currentSegment.length - 1]!,
                points[i]!,
            ]
        }
    }

    if (currentSegment.length > 0) {
        segments.push(currentSegment)
    }

    return segments
}

/**
 * Chaikin's corner-cutting smoothing. Each iteration replaces every interior
 * pair (P, Q) with two points at 1/4 and 3/4 along PQ. Endpoints are kept
 * exact. Result stays inside the original polygon — no overshoot — and gentle
 * curves round out while sharp corners only get a small bevel.
 */
export function chaikinSmooth(
    points: PencilPoint[],
    iterations = 1
): PencilPoint[] {
    if (points.length < 3 || iterations < 1) return points
    let result = points
    for (let iter = 0; iter < iterations; iter++) {
        const next: PencilPoint[] = [result[0]!]
        for (let i = 0; i < result.length - 1; i++) {
            const p = result[i]!
            const q = result[i + 1]!
            next.push({
                x: 0.75 * p.x + 0.25 * q.x,
                y: 0.75 * p.y + 0.25 * q.y,
                lw: p.lw,
            })
            next.push({
                x: 0.25 * p.x + 0.75 * q.x,
                y: 0.25 * p.y + 0.75 * q.y,
                lw: q.lw,
            })
        }
        next.push(result[result.length - 1]!)
        result = next
    }
    return result
}

/**
 * Computes the average linewidth for a segment of points.
 */
export function averageLinewidth(points: PencilPoint[]): number {
    if (points.length === 0) return 1
    const sum = points.reduce((acc, p) => acc + (p.lw ?? 1), 0)
    return sum / points.length
}
