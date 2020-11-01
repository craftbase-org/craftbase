import Icon from 'icons/icons';
import Main from './main';

export default class ButtonWithIconFactory extends Main {
  createElement() {
    const two = this.two;
    const prevX = this.x;
    const prevY = this.y;
    const { fill } = this.properties;

    // Implement core element

    const text = two.makeText('Button', 10, 0);
    text.size = '16';
    text.weight = '400';
    // ;
    text.size = 18;
    text.fill = '#fff';
    // text.baseline = "sub";
    text.alignment = 'left';

    // Implement custom svg
    const svgImage = new DOMParser().parseFromString(
      Icon.ICON_IMAGE_1.data,
      'text/xml'
    );
    // console.log("svgImage", svgImage);
    const externalSVG = two.interpret(svgImage.firstChild);
    externalSVG.translation.x = -3;
    externalSVG.translation.y = -1;
    externalSVG.scale = 1.2;
    externalSVG.center();

    let textGroup = two.makeGroup(externalSVG, text);
    textGroup.center();
    // console.log("textGroup", textGroup, textGroup.id);

    const group = two.makeGroup(textGroup);

    // group.center();
    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;

    // Implement external layer of rectangle
    const rectangle = two.makePath(
      group.getBoundingClientRect(true).left - 40,
      group.getBoundingClientRect(true).top - 10,

      group.getBoundingClientRect(true).right + 10,
      group.getBoundingClientRect(true).top - 10,

      group.getBoundingClientRect(true).right + 10,
      group.getBoundingClientRect(true).bottom + 10,

      group.getBoundingClientRect(true).left - 40,
      group.getBoundingClientRect(true).bottom + 10
    );
    rectangle.fill = '#36B37E';
    rectangle.stroke = '#36B37E';
    rectangle.linewidth = 8;
    rectangle.join = 'round';

    const rectTextGroup = two.makeGroup(rectangle, textGroup);
    // rectangle.noStroke();

    group.add(rectangle);

    return { group, text, rectangle, textGroup, externalSVG, rectTextGroup };
  }
}
