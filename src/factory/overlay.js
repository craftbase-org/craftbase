import Main from "./main";

export default class OverlayFactory extends Main {
  createElement() {
    const two = this.two;
    const prevX = this.x;
    const prevY = this.y;
    const { fill } = this.properties;

    const rectangle = two.makeRectangle(0, 0, 210, 110);
    rectangle.fill = "#6d6d6d";
    rectangle.opacity = 0.5;
    rectangle.noStroke();

    // console.log("rectangle", rectangle.getBoundingClientRect());

    const group = two.makeGroup(rectangle);

    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;

    return { group, rectangle };
  }
}
