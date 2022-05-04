import Icon from 'icons/icons'
import Main from './main'
import { color_blue } from 'utils/constants'

export default class LinkWithIconFactory extends Main {
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
        const text = two.makeText('Link', -15, 0)
        text.value = children?.text?.value || 'Button'
        text.size = children?.text?.size || '16'
        text.weight = children?.text?.weight || '500'
        text.decoration = 'underline'
        text.size = 18
        // text.baseline = "sub";
        text.alignment = 'right'

        let iconType = children?.icon?.iconType
            ? children?.icon?.iconType
            : 'ICON_IMAGE_PHONE_WHITE'
        const svgImage = new DOMParser().parseFromString(
            Icon[iconType].data,
            'text/xml'
        )
        // console.log("svgImage", svgImage);
        const externalSVG = two.interpret(svgImage.firstChild)
        // externalSVG.translation.x = -3
        // externalSVG.translation.y = -1
        externalSVG.scale = children?.icon?.iconScale
            ? children?.icon?.iconScale
            : 1.2
        externalSVG.stroke = fill

        let externalSVGGroup = two.makeGroup(externalSVG)
        externalSVGGroup.center()

        let textGroup = two.makeGroup(text)
        const textSvgGroup = two.makeGroup(externalSVGGroup, textGroup)
        textSvgGroup.center()
        textSvgGroup.fill = fill

        const rectangle = two.makeRoundedRectangle(0, 0, 140, 45, 5)
        rectangle.width = width
        rectangle.height = height
        rectangle.fill = 'transparent'
        if (stroke && linewidth) {
            rectangle.stroke = stroke
            rectangle.linewidth = linewidth
        } else {
            rectangle.noStroke()
        }

        const rectTextSvgGroup = two.makeGroup(rectangle, textSvgGroup)
        // rectTextSvgGroup.center()
        rectangle.noStroke()
        // rectTextSvgGroup.fill = fill

        const group = two.makeGroup(rectTextSvgGroup)
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)
        return {
            group,
            externalSVG,
            textSvgGroup,
            rectangle,
            text,
            rectTextSvgGroup,
        }
    }
}
