export default class Main {
    constructor(instance, x, y, properties) {
        this.two = instance
        this.x = x === 0 ? 500 : x
        this.y = y === 0 ? 200 : y
        this.properties = properties
    }
}
