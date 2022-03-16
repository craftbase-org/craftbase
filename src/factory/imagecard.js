import Icon from 'icons/icons'
import Main from './main'
import { color_blue } from 'utils/constants'

export default class ImageCardFactory extends Main {
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

        const rectangle = two.makeRectangle(0, 0, 60, 60)
        rectangle.width = width
        rectangle.height = height
        rectangle.fill = fill

        if (stroke && linewidth) {
            rectangle.stroke = stroke
            rectangle.linewidth = linewidth
        } else {
            // rectangle.noStroke()
        }

        let iconType = children?.icon?.iconType
            ? children?.icon?.iconType
            : 'ICON_IMAGE_AVATAR_WHITE'

        const svgImage = new DOMParser().parseFromString(
            Icon[iconType].data,
            'text/xml'
        )
        // console.log("svgImage", svgImage, rectangle.width / 2);
        const externalSVG = two.interpret(svgImage.firstChild)
        externalSVG.scale = children?.icon?.iconScale
            ? children?.icon?.iconScale
            : 1

        const externalSVGGroup = two.makeGroup(externalSVG)
        externalSVGGroup.center()
        const rectSvgGroup = two.makeGroup(rectangle, externalSVGGroup)

        const group = two.makeGroup(rectSvgGroup)
        group.center()
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)

        return { group, rectSvgGroup, externalSVG, externalSVGGroup, rectangle }
    }
}
