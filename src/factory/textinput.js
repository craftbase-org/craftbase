import Main from './main'

export default class TextInputFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { fill } = this.properties

        const text = two.makeText('Text input', -30, 0)
        text.size = '14'
        text.weight = '400'
        text.fill = '#B3BAC5'
        // text.baseline = "sub";
        text.alignment = 'left'

        let textGroup = two.makeGroup(text)
        textGroup.center()
        console.log('textGroup', textGroup, textGroup.id)

        const group = two.makeGroup(textGroup)

        // group.center();
        group.translation.x = parseInt(prevX) || 500
        group.translation.y = parseInt(prevY) || 200

        console.log('text bounding initial', text.getBoundingClientRect(true))

        // Shifting order of objects in group to reflect "z-index alias" mechanism for text box

        const rectangle = two.makePath(
            group.getBoundingClientRect(true).left - 10,
            group.getBoundingClientRect(true).top - 10,

            group.getBoundingClientRect(true).right + 80,
            group.getBoundingClientRect(true).top - 10,

            group.getBoundingClientRect(true).right + 80,
            group.getBoundingClientRect(true).bottom + 10,

            group.getBoundingClientRect(true).left - 10,
            group.getBoundingClientRect(true).bottom + 10
        )

        rectangle.fill = '#fff'
        rectangle.stroke = '#B3BAC5'
        rectangle.linewidth = 1
        rectangle.join = 'round'

        // rectangle.noStroke();

        const rectTextGroup = two.makeGroup(rectangle, textGroup)
        group.add(rectangle)

        return { group, textGroup, rectTextGroup, rectangle, text }
    }
}
