import Two from 'two.js'

export default class Selector {
    constructor(instance, group, x1, x2, y1, y2, showCircles) {
        this.two = instance
        this.group = group
        this.area = null
        this.circle1 = null
        this.circle2 = null
        this.circle3 = null
        this.circle4 = null
        this.circleGroup = null
        this.areaGroup = null
        this.showCircles = showCircles
        this.vertices = {
            x1,
            x2,
            y1,
            y2,
        }
    }
    create() {
        const { x1, x2, y1, y2 } = this.vertices
        // console.log("vertices", this.two, x1, x2, y1, y2);

        const area = this.two.makePath(x1, y1, x2, y1, x2, y2, x1, y2)
        area.fill = 'rgba(0,0,0,0)'
        area.opacity = 1
        area.linewidth = 2
        // area.dashes[0] = 6
        area.stroke = '#0052CC'
        // area.curved = true;
        // console.log("area", area);
        this.area = area

        let circleGroup = null
        if (this.showCircles) {
            // console.log("show circles 1", this.showCircles);
            switch (this.showCircles) {
                case 2:
                    // console.log("falls in case 2");
                    const yAxisMidpoint = (y1 + y2) / 2
                    const circleLeft = this.two.makeCircle(x1, yAxisMidpoint, 3)
                    const circleRight = this.two.makeCircle(
                        x2,
                        yAxisMidpoint,
                        3
                    )
                    // const circleGroup = this.two.makeGroup(circle1, circle2, circle3, circle4);
                    this.circle1 = circleLeft
                    this.circle2 = circleRight
                    this.circle3 = null
                    this.circle4 = null
                    circleGroup = this.two.makeGroup(circleLeft, circleRight)
                    // circleGroup.opacity = 1
                    this.circleGroup = circleGroup
                    break
                case 4:
                    const circle1 = this.two.makeCircle(x1, y1, 4)
                    const circle2 = this.two.makeCircle(x2, y1, 4)
                    const circle3 = this.two.makeCircle(x2, y2, 4)
                    const circle4 = this.two.makeCircle(x1, y2, 4)
                    // const circleGroup = this.two.makeGroup(circle1, circle2, circle3, circle4);
                    this.circle1 = circle1
                    this.circle2 = circle2
                    this.circle3 = circle3
                    this.circle4 = circle4
                    circleGroup = this.two.makeGroup(
                        circle1,
                        circle2,
                        circle3,
                        circle4
                    )
                    circleGroup.linewidth = 1.5
                    circleGroup.opacity = 0
                    circleGroup.stroke = '#0052CC'
                    this.circleGroup = circleGroup
                    break

                default:
                    break
            }
        }

        const areaGroup = this.two.makeGroup(area, circleGroup)

        this.areaGroup = areaGroup
        this.group.add(areaGroup)
        this.two.update()

        const clearSelector = () => {
            this.areaGroup.opacity = 0
        }
        window.addEventListener('clearSelector', clearSelector, false)
    }

    show() {
        this.areaGroup.opacity = 1
    }

    hide() {
        this.areaGroup.opacity = 0
    }

    getInstance() {
        return this.areaGroup.id
    }

    update(x1, x2, y1, y2) {
        // console.log("on selector update", x1, x2, y1, y2);
        this.vertices = {
            x1,
            x2,
            y1,
            y2,
        }

        this.area.vertices = [
            new Two.Anchor(x1, y1, null, null, null, null, Two.Commands.line),
            new Two.Anchor(x2, y1, null, null, null, null, Two.Commands.line),

            new Two.Anchor(x2, y2, null, null, null, null, Two.Commands.line),
            new Two.Anchor(x1, y2, null, null, null, null, Two.Commands.line),
        ]

        if (this.showCircles) {
            this.circleGroup.opacity = 1
            // console.log("show circles 2", this.showCircles);
            switch (this.showCircles) {
                case 2:
                    const yAxisMidpoint = (y1 + y2) / 2
                    this.circle1.translation.set(x1, yAxisMidpoint)
                    this.circle2.translation.set(x2, yAxisMidpoint)
                    break
                case 4:
                    this.circle1.translation.set(x1, y1)
                    this.circle2.translation.set(x2, y1)
                    this.circle3.translation.set(x2, y2)
                    this.circle4.translation.set(x1, y2)
                    break
                default:
                    break
            }
        }

        this.areaGroup.opacity = 1
        this.two.update()
    }
}
