import Main from './main'
import { strokeTypeToDashes } from '../utils/misc'

export interface RectangleProperties {
    fill?: string
    width?: number
    height?: number
    stroke?: string
    linewidth?: number | null
    strokeType?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

export default class RectangleFactory extends Main<RectangleProperties> {
    createElement(): { group: ShapeLike; rectangle: ShapeLike } {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { fill, width, height, stroke, linewidth, strokeType } =
            this.properties

        const rectangle = two.makeRoundedRectangle(
            0,
            0,
            width || 210,
            height || 110,
            3
        )

        rectangle.fill = fill ? fill : '#fff'
        rectangle.stroke = stroke ? stroke : '#3A342C'
        // Preserved verbatim from the JS source. The `||` here looks redundant
        // since both clauses use `!==` against null/undefined — kept as-is to
        // avoid behavior change during the TS migration.
        rectangle.linewidth =
            linewidth !== null || linewidth !== undefined ? linewidth : 1
        rectangle.dashes = strokeTypeToDashes(strokeType)

        const group = two.makeGroup(rectangle)

        group.translation.x = parseInt(String(prevX))
        group.translation.y = parseInt(String(prevY))

        return { group, rectangle }
    }
}
