import Main from './main'
import Two from 'two.js'
import { strokeTypeToDashes, strokeToAreaFill } from '../utils/misc'

export interface GeoVertex {
    x: number
    y: number
}

export interface AreaProperties {
    stroke?: string
    linewidth?: number
    strokeType?: string | null
    // Absolute vertex coords (same convention as pencil); the factory makes
    // them relative to the group origin (x, y).
    metadata: GeoVertex[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

export default class AreaFactory extends Main<AreaProperties> {
    path?: ShapeLike
    group?: ShapeLike

    createElement(): { group: ShapeLike; path: ShapeLike } {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { stroke, linewidth, strokeType, metadata } = this.properties

        const vertices = Array.isArray(metadata) ? metadata : []
        const anchors = vertices.map(
            (p) => new (Two as ShapeLike).Anchor(p.x - prevX, p.y - prevY)
        )

        // closed = true → filled polygon (area)
        const path = new (Two as ShapeLike).Path(anchors, true, false)
        const strokeColor = stroke || '#A32D2D'
        path.stroke = strokeColor
        // Fill is always derived from stroke @ 0.7 — never persisted.
        path.fill = strokeToAreaFill(strokeColor)
        path.linewidth = linewidth ? linewidth : 2
        path.dashes = strokeTypeToDashes(strokeType)

        this.path = path
        const group = two.makeGroup(path)
        group.translation.x = parseInt(String(prevX))
        group.translation.y = parseInt(String(prevY))
        this.group = group
        return { group: this.group, path }
    }
}
