import Main from './main'

export default class DividerFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { fill } = this.properties

        let line = two.makeLine(100, 100, 400, 100)
        line.linewidth = 2

        const pointCircle1 = two.makeEllipse(0, 0, 5, 5)
        pointCircle1.fill = '#0052CC'
        pointCircle1.noStroke()

        const pointCircle2 = two.makeEllipse(10, 0, 5, 5)
        pointCircle2.fill = '#0052CC'
        pointCircle2.noStroke()

        const resizeLine = two.makeGroup(pointCircle1, pointCircle2)
        resizeLine.translation.y = -line.linewidth + 1
        resizeLine.opacity = 1

        let group = two.makeGroup(line, resizeLine)
        console.log('main group', group.getBoundingClientRect())

        // Overriding the circle point group's coordinate and
        // manipulating it with line's coordinate
        pointCircle1.translation.x = line.getBoundingClientRect().left
        pointCircle1.translation.y = line.getBoundingClientRect().bottom
        pointCircle2.translation.x = line.getBoundingClientRect().right
        pointCircle2.translation.y = line.getBoundingClientRect().bottom

        // const calcX = parseInt(prevX) + (parseInt(rectangle.width / 2) - 10);
        // const calcY = parseInt(prevY) - (parseInt(46) - parseInt(rectangle.height / 2));
        group.center()
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)

        return { group, pointCircle1, pointCircle2, resizeLine, line }
    }
}
