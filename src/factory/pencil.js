import Main from './main'
import { color_blue } from 'utils/constants'
import Two from 'two.js'

export default class PencilFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { fill, width, height, radius, stroke, linewidth, metadata } =
            this.properties

        // let paths = []
        let path = two.makePath()
        if (metadata.length > 0) {
            metadata.forEach(function (point) {
                path.vertices.push(new Two.Vector(point.x, point.y))
            })
            path.noFill()
            path.stroke = '#000'
            two.add(path)
            // paths.push(path)
        }

        path.fill = fill ? fill : color_blue

        path.stroke = stroke ? stroke : '#fff'
        path.linewidth = linewidth ? linewidth : 0

        this.path = path

        // Create group and take children elements as a parameter
        const group = two.makeGroup(path)
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)
        this.group = group
        console.log('group.id pencil', group.id)
        return { group: this.group, path }
    }
}
