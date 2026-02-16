import Main from './main'
import { color_blue } from 'utils/constants'

export default class RectangleFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { fill, width, height, stroke, linewidth } = this.properties

        // Implement core element

        const rectangle = two.makeRoundedRectangle(
            0,
            0,
            width || 210,
            height || 110,
            5
        )

        rectangle.fill = fill ? fill : '#fff'
        rectangle.stroke = stroke ? stroke : '#000'
        rectangle.linewidth = linewidth ? linewidth : 1

        // console.trace('rectangle trace')
        // console.log('rectangle', rectangle.getBoundingClientRect())

        const group = two.makeGroup(rectangle)

        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)

        return { group, rectangle }
    }
}
