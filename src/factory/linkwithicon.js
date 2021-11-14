import Icon from 'icons/icons'
import Main from './main'

export default class LinkWithIconFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { fill } = this.properties

        // Implement core element
        const text = two.makeText('Link', 10, 0)
        text.size = '16'
        text.weight = '400'
        text.decoration = 'underline'
        text.size = 18
        // text.baseline = "sub";
        text.alignment = 'left'

        const svgImage = new DOMParser().parseFromString(
            Icon.ICON_IMAGE_1.data,
            'text/xml'
        )
        // console.log("svgImage", svgImage);
        const externalSVG = two.interpret(svgImage.firstChild)
        externalSVG.translation.x = -3
        externalSVG.translation.y = -1
        externalSVG.scale = 1.2
        externalSVG.center()

        let textGroup = two.makeGroup(externalSVG, text)
        textGroup.fill = '#0052CC'

        const group = two.makeGroup(textGroup)
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)
        return { group, textGroup, externalSVG, text }
    }
}
