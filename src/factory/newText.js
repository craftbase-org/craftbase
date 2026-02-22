import Main from './main'

export default class NewTextFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { textColor } = this.properties || {}
        const { content = 'Text', fontSize = 16 } =
            this.properties?.metadata || {}

        // Use native Two.js text instead of a foreignObject wrapper
        const twoText = two.makeText(content || 'Text', 0, 0)
        twoText.fill = textColor || '#000000'
        twoText.size = fontSize
        twoText.alignment = 'left'
        twoText.baseline = 'middle'
        twoText.family = 'sans-serif'

        const group = two.makeGroup(twoText)
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)

        two.update()

        return { group, twoText }
    }
}
