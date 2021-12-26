import Main from './main'
import { color_blue } from 'utils/constants'

export default class RectangleFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { bgColor, width, height } = this.properties

        // Implement core element

        const rectangle = two.makeRectangle(0, 0, width || 210, height || 110)
        rectangle.fill = bgColor ? bgColor : color_blue
        rectangle.noStroke()
        // dashed dotted
        // rectangle.dashes[0] = 0;

        console.log('rectangle', rectangle.getBoundingClientRect())

        const group = two.makeGroup(rectangle)

        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)

        return { group, rectangle }
    }
}
