import Main from './main';

export default class RectangleFactory extends Main {
  createElement() {
    const two = this.two;
    const prevX = this.x;
    const prevY = this.y;
    const { fill } = this.properties;

    // Implement core element

    const rectangle = two.makeRectangle(0, 0, 210, 110);
    rectangle.fill = '#36B37E';
    rectangle.noStroke();
    // dashed dotted
    // rectangle.dashes[0] = 0;

    console.log('rectangle', rectangle.getBoundingClientRect());

    const group = two.makeGroup(rectangle);

    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;

    return { group, rectangle };
  }
}
