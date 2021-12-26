import Main from './main'
import { color_blue } from 'utils/constants'

export default class CircleFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { fill, width, height, radius } = this.properties

        // Implement core element
        const circle = two.makeCircle(0, 0, radius)
        circle.fill = fill ? fill : color_blue
        circle.noStroke()
        this.circle = circle

        // Create group and take children elements as a parameter
        const group = two.makeGroup(circle)
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)
        this.group = group
        console.log('group.id circle', group.id)
        return { group: this.group, circle: this.circle }
    }
}
