import Main from './main'
import { color_blue } from 'utils/constants'

export default class ButtonFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const {
            width = 70,
            height = 70,
            fill = color_blue,

            stroke,
            linewidth,
            children = {},
        } = this.properties

        const rectangle = two.makeRoundedRectangle(0, 0, 140, 45, 5)
        rectangle.width = width
        rectangle.height = height
        rectangle.fill = fill
        if (stroke && linewidth) {
            rectangle.stroke = stroke
            rectangle.linewidth = linewidth
        } else {
            rectangle.noStroke()
        }

        const text = two.makeText('Button', 10, 0)

        text.value = children?.text?.value || 'Button'
        text.size = children?.text?.size || '16'
        text.fill = children?.text?.fill || '#fff'
        text.weight = children?.text?.weight || '500'

        const textGroup = two.makeGroup(text)
        textGroup.center()
        const rectGroup = two.makeGroup(rectangle)
        const rectTextGroup = two.makeGroup(rectGroup, textGroup)

        const group = two.makeGroup(rectTextGroup)
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)

        return { group, rectTextGroup, text, textGroup, rectangle }
    }
}
