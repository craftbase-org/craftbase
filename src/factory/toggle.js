import Main from "./main";

export default class ToggleFactory extends Main {
  createElement() {
    const two = this.two;
    const prevX = this.x;
    const prevY = this.y;
    const { fill } = this.properties;

    // Implement outer rectangle
    const rect = two.makeRoundedRectangle(0, 0, 55, 30, 16);
    rect.fill = "#0747A6";
    rect.noStroke();

    const calcCirclePointX = parseInt(rect.width / 4);
    // Implement circle shape control
    const circle = two.makeCircle(calcCirclePointX, 0, 10);
    circle.noStroke();

    const rectCircleGroup = two.makeGroup(rect, circle);
    const group = two.makeGroup(rectCircleGroup);

    // const calcX = parseInt(prevX) + (parseInt(rect.width / 2) - 10);
    // const calcY = parseInt(prevY) - (parseInt(46) - parseInt(rect.height / 2));
    // group.center();
    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;

    return { group, circle, rectCircleGroup, rect };
  }
}
