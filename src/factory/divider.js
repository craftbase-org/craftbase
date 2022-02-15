import Main from './main'

export default class DividerFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { fill, x1, x2, y1, y2 } = this.properties

        let line = two.makeLine(x1, y1, x2, y2)
        line.linewidth = 4

        const pointCircle1 = two.makeEllipse(0, 0, 5, 5)
        pointCircle1.fill = '#FFF'
        pointCircle1.stroke = '#0052CC'
        // pointCircle1.noStroke()

        const pointCircle2 = two.makeEllipse(10, 0, 5, 5)
        pointCircle2.fill = '#FFF'
        pointCircle2.stroke = '#0052CC'
        // pointCircle2.noStroke()

        const resizeLine = two.makeGroup(pointCircle1, pointCircle2)
        resizeLine.translation.y = -line.linewidth + 1
        resizeLine.opacity = 1

        let group = two.makeGroup(line, resizeLine)
        console.log('main group', group.getBoundingClientRect())

        // Overriding the circle point group's coordinate and
        // manipulating it with line's coordinate
        pointCircle1.translation.x = line.vertices[0].x - 4
        pointCircle1.translation.y =
            line.vertices[0].y + parseInt(line.linewidth / 2)
        pointCircle2.translation.x = line.vertices[1].x + 4
        pointCircle2.translation.y =
            line.vertices[1].y + parseInt(line.linewidth / 2)

        // const calcX = parseInt(prevX) + (parseInt(rectangle.width / 2) - 10);
        // const calcY = parseInt(prevY) - (parseInt(46) - parseInt(rectangle.height / 2));
        group.center()
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)

        return { group, pointCircle1, pointCircle2, resizeLine, line }
    }
}
