import Main from './main'
import { strokeTypeToDashes } from '../utils/misc'

export interface DividerProperties {
    fill?: string
    x1: number
    x2: number
    y1: number
    y2: number
    strokeType?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

export default class DividerFactory extends Main<DividerProperties> {
    createElement(): {
        group: ShapeLike
        pointCircle1: ShapeLike
        pointCircle2: ShapeLike
        resizeLine: ShapeLike
        line: ShapeLike
    } {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { x1, x2, y1, y2, strokeType } = this.properties

        const line = two.makeLine(x1, y1, x2, y2)
        line.linewidth = 3
        line.dashes = strokeTypeToDashes(strokeType)

        const pointCircle1 = two.makeEllipse(0, 0, 5, 5)
        pointCircle1.fill = '#FFF'
        pointCircle1.stroke = '#0052CC'

        const pointCircle2 = two.makeEllipse(10, 0, 5, 5)
        pointCircle2.fill = '#FFF'
        pointCircle2.stroke = '#0052CC'

        const resizeLine = two.makeGroup(pointCircle1, pointCircle2)
        resizeLine.translation.y = 0 - line.linewidth
        resizeLine.opacity = 0

        const group = two.makeGroup(line, resizeLine)
        console.log('main group', group.getBoundingClientRect())

        pointCircle1.translation.x = line.vertices[0].x - 0
        pointCircle1.translation.y = line.vertices[0].y - 0
        pointCircle2.translation.x = line.vertices[1].x + 0
        pointCircle2.translation.y = line.vertices[1].y - 0

        group.center()
        group.translation.x = parseInt(String(prevX))
        group.translation.y = parseInt(String(prevY))

        return { group, pointCircle1, pointCircle2, resizeLine, line }
    }
}
