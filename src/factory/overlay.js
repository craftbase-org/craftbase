import Main from './main'

export default class OverlayFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { fill, width, height, stroke, linewidth } = this.properties

        const rectangle = two.makeRectangle(0, 0, width || 210, height || 110)
        rectangle.fill = fill
        rectangle.opacity = 0.5

        if (stroke && linewidth) {
            rectangle.stroke = stroke
            rectangle.linewidth = linewidth
        } else {
            rectangle.noStroke()
        }

        // console.log("rectangle", rectangle.getBoundingClientRect());

        const group = two.makeGroup(rectangle)

        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)

        return { group, rectangle }
    }
}
