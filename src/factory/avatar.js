import Icon from 'icons/icons'
import Main from './main'
import { color_blue } from 'utils/constants'

export default class AvatarFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const {
            width = 70,
            height = 70,
            radius,
            fill = color_blue,

            stroke,
            linewidth,
            children = {},
        } = this.properties

        const circle = two.makeCircle(0, 0, 0)
        circle.width = width
        circle.height = height
        circle.radius = parseInt(width / 2)
        circle.fill = fill

        if (stroke && linewidth) {
            circle.stroke = stroke
            circle.linewidth = linewidth
        } else {
            circle.noStroke()
        }

        let iconType = children?.icon?.iconType
            ? children?.icon?.iconType
            : 'ICON_IMAGE_AVATAR_WHITE'
        // creates svg with proper template
        const svgImage = new DOMParser().parseFromString(
            Icon[iconType].data,
            'text/xml'
        )

        const externalSVG = two.interpret(svgImage.firstChild)
        //   console.log("svgImage", svgImage, circle.width / 2);
        externalSVG.scale = children?.icon?.iconScale
            ? children?.icon?.iconScale
            : 1

        const externalSVGGroup = two.makeGroup(externalSVG)
        externalSVGGroup.center()
        const circleSvgGroup = two.makeGroup(circle, externalSVGGroup)

        const group = two.makeGroup(circleSvgGroup)
        group.center()
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)

        return { group, circleSvgGroup, circle, externalSVG, externalSVGGroup }
    }
}
