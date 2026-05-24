import Main from './main'
import Two from 'two.js'
import { strokeTypeToDashes } from '../utils/misc'
import type { GeoVertex } from './area'

export interface RouteProperties {
    stroke?: string
    linewidth?: number
    strokeType?: string | null
    // Absolute vertex coords (same convention as pencil); the factory makes
    // them relative to the group origin (x, y).
    metadata: GeoVertex[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

export default class RouteFactory extends Main<RouteProperties> {
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

        // closed = false → open polyline (route)
        const path = new (Two as ShapeLike).Path(anchors, false, false)
        path.noFill()
        path.stroke = stroke || '#3B82F6'
        path.linewidth = linewidth ? linewidth : 2.5
        path.cap = 'round'
        path.join = 'round'
        path.dashes = strokeTypeToDashes(strokeType)

        this.path = path
        const group = two.makeGroup(path)
        group.translation.x = parseInt(String(prevX))
        group.translation.y = parseInt(String(prevY))
        this.group = group
        return { group: this.group, path }
    }
}
