import Main from './main'
import { strokeTypeToDashes } from '../utils/misc'

export interface CircleProperties {
    fill?: string
    width?: number
    height?: number
    radius?: number
    stroke?: string
    linewidth?: number
    strokeType?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

export default class CircleFactory extends Main<CircleProperties> {
    circle?: ShapeLike
    group?: ShapeLike

    createElement(): { group: ShapeLike; circle: ShapeLike } {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { fill, width, height, stroke, linewidth, strokeType } =
            this.properties

        const circle = two.makeEllipse(0, 0, 0, 0)
        circle.width = width || 100
        circle.height = height || 100
        circle.fill = fill ? fill : '#fff'

        circle.stroke = stroke ? stroke : '#3A342C'
        circle.linewidth = linewidth ? linewidth : 1
        circle.dashes = strokeTypeToDashes(strokeType)

        this.circle = circle

        const group = two.makeGroup(circle)
        group.translation.x = parseInt(String(prevX))
        group.translation.y = parseInt(String(prevY))
        this.group = group
        return { group: this.group, circle: this.circle }
    }
}
