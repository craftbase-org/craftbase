import Main from './main'
import Two from 'two.js'
import { chaikinSmooth } from 'utils/pencilHelper'
import { strokeTypeToDashes } from 'utils/misc'

export default class PencilFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { stroke, linewidth, metadata, strokeType } = this.properties

        // Chaikin smoothing rounds the polyline without overshoot. Matches
        // the smoothing applied during live preview in newCanvas.js.
        const smoothed =
            metadata.length > 2 ? chaikinSmooth(metadata, 2) : metadata

        const path = two.makePath()
        smoothed.forEach((point) => {
            path.vertices.push(
                new Two.Anchor(point.x - prevX, point.y - prevY)
            )
        })
        path.noFill()
        path.stroke = stroke || '#3A342C'
        path.closed = false
        path.cap = 'round'
        path.join = 'round'
        path.linewidth = linewidth ? linewidth : 1
        path.dashes = strokeTypeToDashes(strokeType)

        this.path = path
        const group = two.makeGroup(path)
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)
        this.group = group
        return { group: this.group, path }
    }
}
