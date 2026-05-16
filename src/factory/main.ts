// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any

// Generic base class for shape factories. Subclasses bind a concrete
// `properties` shape; this lets `this.properties.fill` etc. be typed without
// every factory casting.
export default class Main<P = unknown> {
    two: TwoLike
    x: number
    y: number
    properties: P

    constructor(instance: TwoLike, x: number, y: number, properties: P) {
        this.two = instance
        this.x = x === 0 ? 500 : x
        this.y = y === 0 ? 200 : y
        this.properties = properties
    }
}
