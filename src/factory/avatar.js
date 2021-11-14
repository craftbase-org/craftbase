import Icon from 'icons/icons'
import Main from './main'
import { color_blue } from 'utils/constants'

export default class AvatarFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { bgColor } = this.properties

        const circle = two.makeCircle(0, 0, 40)
        circle.fill = bgColor ? bgColor : color_blue

        const svgImage = new DOMParser().parseFromString(
            Icon.ICON_IMAGE_AVATAR_WHITE.data,
            'text/xml'
        )
        //   console.log("svgImage", svgImage, circle.width / 2);
        const externalSVG = two.interpret(svgImage.firstChild)
        externalSVG.scale = 1.5
        externalSVG.center()

        const circleSvgGroup = two.makeGroup(circle, externalSVG)
        const group = two.makeGroup(circleSvgGroup)
        group.center()
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)

        return { group, circleSvgGroup, circle, externalSVG }
    }
}
