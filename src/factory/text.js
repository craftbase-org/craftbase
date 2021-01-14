import Main from './main';

export default class TextFactory extends Main {
  createElement() {
    const two = this.two;
    const prevX = this.x;
    const prevY = this.y;
    const { fill } = this.properties;

    const rectangle = two.makeRoundedRectangle(0, 0, 140, 45, 5);
    rectangle.fill = 'rgba(0,0,0,0)';
    rectangle.noStroke();

    const rectTextGroup = two.makeGroup(rectangle);

    const group = two.makeGroup(rectTextGroup);
    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;

    two.update();
    console.log(
      'rectTextGroup init',
      rectTextGroup.getBoundingClientRect(true)
    );
    const svgElem = rectTextGroup._renderer.elem;
    svgElem.innerHTML = `
    <foreignObject x=${rectTextGroup.getBoundingClientRect(true).left} y=${
      rectTextGroup.getBoundingClientRect(true).top
    } width=${140} height=${50}>
        <div>This is HTML gregre reyreyyre yryeyer</div>
    </foreignObject>
    `;
    rectTextGroup.center();

    two.update();

    return { group, rectTextGroup, svgElem, rectangle };
  }
}
