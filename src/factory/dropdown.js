import Main from './main'

export default class DropdownFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { fill } = this.properties

        // Implement core element
        const circle = two.makeEllipse(0, 0, 70, 70)
        circle.fill = fill ? fill : '#EBECF0'
        circle.noStroke()
        this.circle = circle

        // Create group and take children elements as a parameter
        const group = two.makeGroup(circle)
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)
        this.group = group
        return { group: this.group, circle: this.circle }
    }
}
