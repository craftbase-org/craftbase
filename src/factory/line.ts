import Main from './main'
import { strokeTypeToDashes } from '../utils/misc'

export interface LineProperties {
    fill?: string
    stroke?: string
    x1?: number
    x2?: number
    y1?: number
    y2?: number
    linewidth?: number
    strokeType?: string | null
    isMobile?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

// A plain straight line. Structurally identical to the arrow factory (line +
// two draggable endpoint circles) so it reuses the entire arrow-draw and
// endpoint-edit machinery in newCanvas — the only difference is `makeLine`
// (no arrowhead) plus the `noArrowhead` flag that tells the vertex updaters
// (updateX1Y1Vertices/updateX2Y2Vertices) to keep it a bare 2-anchor segment.
export default class LineFactory extends Main<LineProperties> {
    createElement(): {
        group: ShapeLike
        pointCircle1Group: ShapeLike
        pointCircle2Group: ShapeLike
        pointCircle1: ShapeLike
        pointCircle2: ShapeLike
        line: ShapeLike
    } {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const {
            stroke,
            x1 = 20,
            x2 = 100,
            y1 = 10,
            y2 = 10,
            linewidth,
            strokeType,
            isMobile,
        } = this.properties

        const line = two.makeLine(x1, y1, x2, y2)
        line.noArrowhead = true
        line.linewidth = linewidth ? linewidth : 1
        line.dashes = strokeTypeToDashes(strokeType)
        line.cap = 'round'
        line.join = 'round'
        line.fill = 'none'
        if (stroke) line.stroke = stroke

        const circleRadius = isMobile ? 6 : 4

        const pointCircle1 = two.makeCircle(0, 0, circleRadius)
        pointCircle1.fill = '#f4f4f2'
        pointCircle1.stroke = '#3A342C'
        pointCircle1.linewidth = 1.5

        const pointCircle2 = two.makeCircle(0, 0, circleRadius)
        pointCircle2.fill = '#f4f4f2'
        pointCircle2.stroke = '#3A342C'
        pointCircle2.linewidth = 1.5

        const pointCircle1Group = two.makeGroup(pointCircle1)
        const pointCircle2Group = two.makeGroup(pointCircle2)

        const group = two.makeGroup(line, pointCircle1Group, pointCircle2Group)

        pointCircle1Group.translation.x = line.vertices[0].x
        pointCircle1Group.translation.y = line.vertices[0].y
        pointCircle2Group.translation.x = line.vertices[1].x
        pointCircle2Group.translation.y = line.vertices[1].y
        pointCircle1Group.opacity = 0
        pointCircle2Group.opacity = 0

        group.translation.x = parseInt(String(prevX))
        group.translation.y = parseInt(String(prevY))

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
