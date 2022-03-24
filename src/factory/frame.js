import Main from './main'
import { color_blue } from 'utils/constants'

export default class FrameFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { fill, width, height, stroke, linewidth } = this.properties

        // Implement core element

        const rectangle = two.makeRectangle(0, 0, width || 210, height || 110)

        if (stroke && linewidth) {
            rectangle.stroke = stroke
            rectangle.linewidth = linewidth
        } else {
            rectangle.stroke = '#000'
            rectangle.linewidth = 1
            // rectangle.noStroke()
        }

        rectangle.fill = 'transparent'
        rectangle.stroke = '#000'
        rectangle.linewidth = 2

        console.log('rectangle', rectangle.getBoundingClientRect())

        const group = two.makeGroup(rectangle)

        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)

        return { group, rectangle }
    }
}
