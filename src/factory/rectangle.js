import Main from './main'
import { color_blue } from 'utils/constants'

export default class RectangleFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { fill, width, height, stroke, linewidth } = this.properties

        // Implement core element

        const rectangle = two.makeRectangle(0, 0, width || 210, height || 110)
        rectangle.fill = fill ? fill : color_blue

        if (stroke && linewidth) {
            rectangle.stroke = stroke
            rectangle.linewidth = linewidth
        } else {
            rectangle.stroke = '#fff'
            rectangle.linewidth = 0
            // rectangle.noStroke()
        }

        // console.trace('rectangle trace')
        console.log('rectangle', rectangle.getBoundingClientRect())

        const group = two.makeGroup(rectangle)

        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)

        return { group, rectangle }
    }
}
