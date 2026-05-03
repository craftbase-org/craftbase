import Main from './main'

export default class NewTextFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { textColor } = this.properties || {}
        const {
            content = '',
            fontSize = 36,
            textFontFamily = 'Caveat',
        } = this.properties?.metadata || {}

        // Use native Two.js text instead of a foreignObject wrapper
        const twoText = two.makeText(content || '', 0, 0)
        twoText.fill = textColor || '#3A342C'
        twoText.size = fontSize
        twoText.alignment = 'left'
        twoText.baseline = 'middle'
        twoText.family = textFontFamily

        const group = two.makeGroup(twoText)
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)

        two.update()

        return { group, twoText }
    }
}
