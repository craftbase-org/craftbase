import Main from './main'
import { color_blue } from 'utils/constants'

export default class RectangleFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { bgColor } = this.properties

        // Implement core element

        const rectangle = two.makeRectangle(0, 0, 210, 110)
        rectangle.fill = bgColor ? bgColor : color_blue
        rectangle.noStroke()
        // dashed dotted
        // rectangle.dashes[0] = 0;

        console.log('rectangle', rectangle.getBoundingClientRect())

        const group = two.makeGroup(rectangle)

        group.translation.x = parseInt(prevX) || 500
        group.translation.y = parseInt(prevY) || 200

        return { group, rectangle }
    }
}
