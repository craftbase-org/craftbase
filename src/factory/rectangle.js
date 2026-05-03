import Main from './main'
import { color_blue } from 'utils/constants'
import { strokeTypeToDashes } from 'utils/misc'

export default class RectangleFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { fill, width, height, stroke, linewidth, strokeType } =
            this.properties

        // Implement core element

        const rectangle = two.makeRoundedRectangle(
            0,
            0,
            width || 210,
            height || 110,
            3
        )

        rectangle.fill = fill ? fill : '#fff'
        rectangle.stroke = stroke ? stroke : '#3A342C'
        rectangle.linewidth =
            linewidth !== null || linewidth !== undefined ? linewidth : 1
        rectangle.dashes = strokeTypeToDashes(strokeType)

        // console.trace('rectangle trace')
        // console.log('rectangle', rectangle.getBoundingClientRect())

        const group = two.makeGroup(rectangle)

        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)

        return { group, rectangle }
    }
}
