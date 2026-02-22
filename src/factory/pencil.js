import Main from './main'
import Two from 'two.js'
import { mergeSegmentsByLinewidth, averageLinewidth } from 'utils/pencilHelper'

export default class PencilFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { fill, width, height, radius, stroke, linewidth, metadata } =
            this.properties

        const hasLwData = metadata.length > 0 && metadata[0].lw !== undefined

        if (hasLwData) {
            // New format: multi-path rendering with variable linewidth
            const segments = mergeSegmentsByLinewidth(metadata)
            const group = two.makeGroup()

            segments.forEach((segmentPoints) => {
                if (segmentPoints.length < 2) return
                const path = two.makePath()
                segmentPoints.forEach((point) => {
                    path.vertices.push(
                        new Two.Vector(point.x - prevX, point.y - prevY)
                    )
                })
                path.noFill()
                path.stroke = stroke || '#000'
                path.closed = false
                path.cap = 'round'
                path.join = 'round'
                path.linewidth = averageLinewidth(segmentPoints)
                group.add(path)
            })

            group.translation.x = parseInt(prevX)
            group.translation.y = parseInt(prevY)
            this.group = group
            return { group: this.group }
        }

        // Legacy format: single path with uniform linewidth (backward compatible)
        let path = two.makePath()
        if (metadata.length > 0) {
            metadata.forEach(function (point) {
                path.vertices.push(
                    new Two.Vector(point.x - prevX, point.y - prevY)
                )
            })
            path.noFill()
            path.stroke = '#000'
            path.closed = false
        }

        path.linewidth = linewidth ? linewidth : 1

        this.path = path
        const group = two.makeGroup(path)
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)
        this.group = group
        return { group: this.group, path }
    }
}
