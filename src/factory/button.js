import Main from "./main";

export default class ButtonFactory extends Main {
  createElement() {
    const two = this.two;
    const prevX = this.x;
    const prevY = this.y;
    const { fill } = this.properties;

    const rectangle = two.makeRoundedRectangle(0, 0, 140, 45, 5);
    rectangle.fill = "#0052CC";
    rectangle.noStroke();

    const text = two.makeText("Button", 10, 0);
    text.size = "16";
    text.fill = "#fff";
    text.weight = "500";

    const textGroup = two.makeGroup(text);
    textGroup.center();
    const rectGroup = two.makeGroup(rectangle);
    const rectTextGroup = two.makeGroup(rectGroup, textGroup);

    const group = two.makeGroup(rectTextGroup);
    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;

    return { group, rectTextGroup, text, rectangle };
  }
}
