import Main from './main'

export default class TextFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        console.log('this.properties', this.properties)
        const { fill = 'rgba(0,0,0,0)', content = '' } = this.properties

        // pass width and height here for transparent rectangle container
        const rectangle = two.makeRoundedRectangle(0, 0, 330, 45, 5)
        rectangle.fill = fill
        rectangle.noStroke()

        const rectTextGroup = two.makeGroup(rectangle)

        const group = two.makeGroup(rectTextGroup)
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)

        two.update()
        console.log(
            'rectTextGroup init',
            rectTextGroup.getBoundingClientRect(true)
        )
        const svgElem = rectTextGroup._renderer.elem
        svgElem.innerHTML = `
    <foreignObject x=${rectTextGroup.getBoundingClientRect(true).left} y=${
            rectTextGroup.getBoundingClientRect(true).top
        } width=${rectangle.width} height=${50}>
        <div>${content}</div>
    </foreignObject>
    `
        rectTextGroup.center()

        two.update()

        return { group, rectTextGroup, svgElem, rectangle }
    }
}
