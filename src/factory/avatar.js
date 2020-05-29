import Icon from "icons/icons";
import Main from "./main";

export default class AvatarFactory extends Main {
  createElement() {
    const two = this.two;
    const prevX = this.x;
    const prevY = this.y;
    const { fill } = this.properties;

    const circle = two.makeCircle(0, 0, 40);
    circle.fill = "#000";

    const svgImage = new DOMParser().parseFromString(
      Icon.ICON_IMAGE_1.data,
      "text/xml"
    );
    //   console.log("svgImage", svgImage, circle.width / 2);
    const externalSVG = two.interpret(svgImage.firstChild);
    externalSVG.scale = 1.5;
    externalSVG.center();

    const circleSvgGroup = two.makeGroup(circle, externalSVG);
    const group = two.makeGroup(circleSvgGroup);
    group.center();
    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;

    return { group, circleSvgGroup, circle, externalSVG };
  }
}
