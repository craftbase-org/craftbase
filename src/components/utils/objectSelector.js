import Two from "two.js";

export default class Selector {
  constructor(instance, group, x1, x2, y1, y2, showCircles) {
    this.two = instance;
    this.group = group;
    this.area = null;
    this.circle1 = null;
    this.circle2 = null;
    this.circle3 = null;
    this.circle4 = null;
    this.circleGroup = null;
    this.showCircles = showCircles;
    this.vertices = {
      x1,
      x2,
      y1,
      y2,
    };
  }
  create() {
    const { x1, x2, y1, y2 } = this.vertices;
    console.log("vertices", this.two, x1, x2, y1, y2);

    const area = this.two.makePath(
      x1,
      y1,
      x2,
      y1,

      x2,
      y2,
      x1,
      y2
    );
    area.fill = "rgba(0,0,0,0)";
    area.opacity = 0;
    area.linewidth = 1;
    // area.dashes[0] = 4;
    area.stroke = "#505F79";
    // area.curved = true;
    console.log("area", area);
    this.area = area;

    let circleGroup = null;
    if (this.showCircles) {
      const circle1 = this.two.makeCircle(x1, y1, 3);
      const circle2 = this.two.makeCircle(x2, y1, 3);
      const circle3 = this.two.makeCircle(x2, y2, 3);
      const circle4 = this.two.makeCircle(x1, y2, 3);
      // const circleGroup = this.two.makeGroup(circle1, circle2, circle3, circle4);
      this.circle1 = circle1;
      this.circle2 = circle2;
      this.circle3 = circle3;
      this.circle4 = circle4;
      circleGroup = this.two.makeGroup(circle1, circle2, circle3, circle4);
      circleGroup.opacity = 0;
      this.circleGroup = circleGroup;
    }

    const areaGroup = this.two.makeGroup(area, circleGroup);
    this.group.add(areaGroup);
    // this.two.udpate();
  }
  show() {
    this.area.opacity = 1;
    if (this.circleGroup) this.circleGroup.opacity = 1;
  }
  hide() {
    this.area.opacity = 0;
    if (this.circleGroup) this.circleGroup.opacity = 0;
  }
  getInstance() {
    return this.area.id;
  }
  update(x1, x2, y1, y2) {
    // console.log("on selector update", x1, x2, y1, y2);
    this.vertices = {
      x1,
      x2,
      y1,
      y2,
    };
    this.area.vertices = [
      new Two.Anchor(x1, y1, null, null, null, null, Two.Commands.line),
      new Two.Anchor(x2, y1, null, null, null, null, Two.Commands.line),

      new Two.Anchor(x2, y2, null, null, null, null, Two.Commands.line),
      new Two.Anchor(x1, y2, null, null, null, null, Two.Commands.line),
    ];
    if (this.showCircles) {
      this.circle1.translation.set(x1, y1);
      this.circle2.translation.set(x2, y1);
      this.circle3.translation.set(x2, y2);
      this.circle4.translation.set(x1, y2);
      this.circleGroup.opacity = 1;
    }

    this.area.opacity = 1;
  }
}
