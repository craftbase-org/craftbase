import Main from "./main";

export default class TextAreaFactory extends Main {
  createElement() {
    const two = this.two;
    const prevX = this.x;
    const prevY = this.y;
    const { fill } = this.properties;

    const text = two.makeText("Enter something here", -30, 0);
    text.size = "14";
    text.weight = "400";
    text.fill = "#B3BAC5";
    // text.baseline = "sub";
    text.alignment = "left";

    let textGroup = two.makeGroup(text);
    textGroup.center();
    // console.log("textGroup", textGroup, textGroup.id);

    const group = two.makeGroup(textGroup);
    // group.center();
    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;

    // console.log("text bounding initial", text.getBoundingClientRect(true));

    // Shifting order of objects in group to reflect "z-index alias" mechanism for text box

    const rectangle = two.makePath(
      group.getBoundingClientRect(true).left - 10,
      group.getBoundingClientRect(true).top - 10,

      group.getBoundingClientRect(true).right + 80,
      group.getBoundingClientRect(true).top - 10,

      group.getBoundingClientRect(true).right + 80,
      group.getBoundingClientRect(true).bottom + 10,

      group.getBoundingClientRect(true).left - 10,
      group.getBoundingClientRect(true).bottom + 10
    );

    rectangle.fill = "#fff";
    rectangle.stroke = "#B3BAC5";
    rectangle.linewidth = 1;
    rectangle.join = "round";

    // rectangle.noStroke();

    group.add(rectangle);
    return { group, rectangle, textGroup, text, rectangle };
  }
}
