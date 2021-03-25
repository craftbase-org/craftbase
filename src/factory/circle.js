import Main from './main'
import { color_blue } from 'utils/constants'

export default class CircleFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { fill } = this.properties

        // Implement core element
        const circle = two.makeEllipse(0, 0, 30, 30)
        circle.fill = fill ? fill : color_blue
        circle.noStroke()
        this.circle = circle

        // Create group and take children elements as a parameter
        const group = two.makeGroup(circle)
        group.translation.x = parseInt(prevX) || 500
        group.translation.y = parseInt(prevY) || 200
        this.group = group
        console.log('group.id circle', group.id)
        return { group: this.group, circle: this.circle }
    }
}
