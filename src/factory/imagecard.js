import Icon from "icons/icons";
import Main from "./main";

export default class ImageCardFactory extends Main {
  createElement() {
    const two = this.two;
    const prevX = this.x;
    const prevY = this.y;
    const { fill } = this.properties;

    const rectangle = two.makeRectangle(0, 0, 60, 60);
    rectangle.fill = "#000";

    const svgImage = new DOMParser().parseFromString(
      Icon.ICON_IMAGE_1.data,
      "text/xml"
    );
    // console.log("svgImage", svgImage, rectangle.width / 2);
    const externalSVG = two.interpret(svgImage.firstChild);
    // externalSVG.translation.x = -rectangle.width / 8;
    // externalSVG.translation.y = -rectangle.height / 8;
    externalSVG.scale = 1.5;
    externalSVG.center();

    const circleSvgGroup = two.makeGroup(rectangle, externalSVG);

    const group = two.makeGroup(circleSvgGroup);

    group.center();
    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;

    return { group, circleSvgGroup, externalSVG, rectangle };
  }
}
