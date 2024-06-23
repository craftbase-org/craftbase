import Main from './main'

export default class ArrowLineFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { fill, x1, x2, y1, y2 } = this.properties

        // console.log('arrow line factory x1, y1, x2, y2', x1, y1, x2, y2)
        let line = two.makeArrow(x1, y1, x2, y2, 10)
        line.linewidth = 2
        // line.vertices[1].y = 200
        const centerPointCircle = two.makeEllipse(0, 0, 5, 5)
        centerPointCircle.fill = '#FFF'
        centerPointCircle.stroke = '#0052CC'
        centerPointCircle.linewidth = 2

        const pointCircle1 = two.makeEllipse(0, 0, 5, 5)
        pointCircle1.fill = '#FFF'
        pointCircle1.stroke = '#0052CC'
        pointCircle1.linewidth = 2
        // pointCircle1.noStroke()

        const pointCircle2 = two.makeEllipse(0, 0, 5, 5)
        pointCircle2.fill = '#FFF'
        pointCircle2.stroke = '#0052CC'
        pointCircle2.linewidth = 2
        // pointCircle2.noStroke()

        // const resizeLine = two.makeGroup(pointCircle1, pointCircle2)
        // resizeLine.translation.y = 0 - line.linewidth
        // resizeLine.opacity = 0

        let pointCircle1Group = two.makeGroup(pointCircle1)

        let pointCircle2Group = two.makeGroup(pointCircle2)

        let group = two.makeGroup(
            line,
            pointCircle1Group,
            pointCircle2Group,
            centerPointCircle
        )
        // console.log('main group', group.getBoundingClientRect())

        // Overriding the circle point group's coordinate and
        // manipulating it with line's coordinate
        pointCircle1Group.translation.x = line.vertices[0].x - 20
        pointCircle1Group.translation.y = line.vertices[0].y - 0
        pointCircle2Group.translation.x = line.vertices[1].x + 20
        pointCircle2Group.translation.y = line.vertices[1].y - 0

        // const calcX = parseInt(prevX) + (parseInt(rectangle.width / 2) - 10);
        // const calcY = parseInt(prevY) - (parseInt(46) - parseInt(rectangle.height / 2));
        // group.center()
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)

        centerPointCircle.translation.x = line.translation.x
        centerPointCircle.translation.y = line.translation.y

        return {
            group,
            pointCircle1Group,
            pointCircle2Group,
            pointCircle1,
            pointCircle2,
            line,
        }
    }
}
