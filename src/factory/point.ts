import Main from './main'
import Two from 'two.js'
import {
    DEFAULT_PIN_SVG,
    DEFAULT_GEO_RING_RADIUS,
} from '../constants/misc'
import { TRANSPARENT_FILL } from '../utils/constants'

export interface PointProperties {
    stroke?: string
    metadata?: {
        svgIcon?: string
        resist?: number
        ringRadius?: number
    } | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

// Read viewBox so we can center the interpreted icon inside the ring. Defaults
// to a 24x24 box (the standard icon viewport) when absent.
function parseViewBox(svg: string): { x: number; y: number; w: number; h: number } {
    const m = /viewBox\s*=\s*["']([^"']+)["']/i.exec(svg)
    if (m && m[1]) {
        const p = m[1].split(/[\s,]+/).map(Number)
        if (p.length === 4 && p.every((n) => Number.isFinite(n))) {
            return { x: p[0]!, y: p[1]!, w: p[2]!, h: p[3]! }
        }
    }
    return { x: 0, y: 0, w: 24, h: 24 }
}

// Recolor only the icon paths that have no meaningful color of their own
// (the default pin uses fill="currentColor"). User-supplied SVGs with explicit
// colors are left untouched.
function recolorIcon(node: ShapeLike, color: string): void {
    if (!node) return
    if (Array.isArray(node.children) && node.children.length) {
        node.children.forEach((c: ShapeLike) => recolorIcon(c, color))
        return
    }
    const f = node.fill
    if (
        f === undefined ||
        f === null ||
        f === 'none' ||
        String(f).toLowerCase() === 'currentcolor'
    ) {
        node.fill = color
    }
}

export default class PointFactory extends Main<PointProperties> {
    ring?: ShapeLike
    group?: ShapeLike

    createElement(): { group: ShapeLike; ring: ShapeLike } {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { stroke } = this.properties
        const meta = this.properties.metadata || {}
        const ringRadius = meta.ringRadius ?? DEFAULT_GEO_RING_RADIUS
        const strokeColor = stroke || '#3A342C'

        const group = two.makeGroup()

        // Outer ring — transparent fill keeps the disc clickable.
        const ring = new (Two as ShapeLike).Circle(0, 0, ringRadius)
        ring.fill = TRANSPARENT_FILL
        ring.stroke = strokeColor
        ring.linewidth = 3
        group.add(ring)
        this.ring = ring

        // Embedded SVG icon (default "pin", overridable via metadata.svgIcon).
        const svgString = meta.svgIcon || DEFAULT_PIN_SVG
        try {
            const doc = new DOMParser().parseFromString(
                svgString,
                'image/svg+xml'
            )
            const svgNode = doc.documentElement as unknown as SVGElement
            const icon = two.interpret(svgNode, false, false)
            if (icon) {
                recolorIcon(icon, strokeColor)
                const vb = parseViewBox(svgString)
                const s = (ringRadius * 1.4) / Math.max(vb.w, vb.h)
                icon.scale = s
                icon.translation.set(
                    -(vb.x + vb.w / 2) * s,
                    -(vb.y + vb.h / 2) * s
                )
                group.add(icon)
            }
        } catch {
            // Bad SVG → keep the ring only.
        }

        group.translation.x = parseInt(String(prevX))
        group.translation.y = parseInt(String(prevY))
        this.group = group
        return { group: this.group, ring: this.ring }
    }
}
