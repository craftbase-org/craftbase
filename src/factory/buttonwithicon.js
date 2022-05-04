import Icon from 'icons/icons'
import Main from './main'
import { color_blue } from 'utils/constants'

export default class ButtonWithIconFactory extends Main {
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

        // Implement core element

        const text = two.makeText('Button', -15, 0)
        text.value = children?.text?.value || 'Button'
        text.size = children?.text?.size || '16'
        text.fill = '#fff'
        text.weight = children?.text?.weight || '500'
        // text.baseline = "sub";
        text.alignment = 'right'

        let iconType = children?.icon?.iconType
            ? children?.icon?.iconType
            : 'ICON_IMAGE_PHONE_WHITE'

        // Implement custom svg
        const svgImage = new DOMParser().parseFromString(
            Icon[iconType].data,
            'text/xml'
        )
        // console.log("svgImage", svgImage);
        const externalSVG = two.interpret(svgImage.firstChild)
        // externalSVG.translation.x = -10
        // externalSVG.translation.y = -1
        externalSVG.scale = children?.icon?.iconScale
            ? children?.icon?.iconScale
            : 0.8
        // externalSVG.center()

        let externalSVGGroup = two.makeGroup(externalSVG)
        externalSVGGroup.center()

        let textGroup = two.makeGroup(text)
        // textGroup.center()
        // console.log("textGroup", textGroup, textGroup.id);

        const textSvgGroup = two.makeGroup(externalSVGGroup, textGroup)
        // textSvgGroup.translation.x = -10
        textSvgGroup.center()

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

        const rectTextSvgGroup = two.makeGroup(rectangle, textSvgGroup)
        // rectTextSvgGroup.center()
        rectangle.noStroke()
        const group = two.makeGroup(rectTextSvgGroup)

        // group.center()
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)

        // Implement external layer of rectangle
        // const rectangle = two.makePath(
        //     group.getBoundingClientRect(true).left - 40,
        //     group.getBoundingClientRect(true).top - 10,

        //     group.getBoundingClientRect(true).right + 10,
        //     group.getBoundingClientRect(true).top - 10,

        //     group.getBoundingClientRect(true).right + 10,
        //     group.getBoundingClientRect(true).bottom + 10,

        //     group.getBoundingClientRect(true).left - 40,
        //     group.getBoundingClientRect(true).bottom + 10
        // )
        // rectangle.fill = fill

        // rectangle.linewidth = 8
        // rectangle.join = 'round'

        // if (stroke) {
        //     rectangle.stroke = stroke
        //     // rectangle.linewidth = linewidth
        // } else {
        //     rectangle.noStroke()
        // }
        return {
            group,
            text,
            rectangle,
            textSvgGroup,
            externalSVG,
            rectTextSvgGroup,
        }
    }
}
