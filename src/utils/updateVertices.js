export const updateX1Y1Vertices = (TwoRef, line, x1, y1, pointCircle1, two) => {
    pointCircle1.translation.x = line.vertices[0].x + 0
    pointCircle1.translation.y = line.vertices[0].y + parseInt(line.linewidth)

    // copied code from definition of makeArrow
    let headlen = 10

    let angle = Math.atan2(line.vertices[1].y - y1, line.vertices[1].x - x1)

    let vertices = [
        new TwoRef.Anchor(
            x1,
            y1,
            undefined,
            undefined,
            undefined,
            undefined,
            TwoRef.Commands.move
        ),
        new TwoRef.Anchor(
            line.vertices[1].x,
            line.vertices[1].y,
            undefined,
            undefined,
            undefined,
            undefined,
            TwoRef.Commands.line
        ),
        new TwoRef.Anchor(
            line.vertices[1].x - headlen * Math.cos(angle - Math.PI / 4),
            line.vertices[1].y - headlen * Math.sin(angle - Math.PI / 4),
            undefined,
            undefined,
            undefined,
            undefined,
            TwoRef.Commands.line
        ),

        new TwoRef.Anchor(
            line.vertices[1].x,
            line.vertices[1].y,
            undefined,
            undefined,
            undefined,
            undefined,
            TwoRef.Commands.move
        ),
        new TwoRef.Anchor(
            line.vertices[1].x - headlen * Math.cos(angle + Math.PI / 4),
            line.vertices[1].y - headlen * Math.sin(angle + Math.PI / 4),
            undefined,
            undefined,
            undefined,
            undefined,
            TwoRef.Commands.line
        ),
    ]
    line.vertices = vertices

    two.update()
}

export const updateX2Y2Vertices = (TwoRef, line, x2, y2, pointCircle2, two) => {
    pointCircle2.translation.x =
        line.vertices[1].x < line.vertices[0].x
            ? line.vertices[1].x
            : line.vertices[1].x + 6
    pointCircle2.translation.y = line.vertices[1].y + parseInt(line.linewidth)

    // copied code from definition of makeArrow
    let headlen = 10

    let angle = Math.atan2(y2 - line.vertices[0].y, x2 - line.vertices[0].x)

    let vertices = [
        new TwoRef.Anchor(
            line.vertices[0].x,
            line.vertices[0].y,
            undefined,
            undefined,
            undefined,
            undefined,
            TwoRef.Commands.move
        ),
        new TwoRef.Anchor(
            x2,
            y2,
            undefined,
            undefined,
            undefined,
            undefined,
            TwoRef.Commands.line
        ),
        new TwoRef.Anchor(
            x2 - headlen * Math.cos(angle - Math.PI / 4),
            y2 - headlen * Math.sin(angle - Math.PI / 4),
            undefined,
            undefined,
            undefined,
            undefined,
            TwoRef.Commands.line
        ),

        new TwoRef.Anchor(
            x2,
            y2,
            undefined,
            undefined,
            undefined,
            undefined,
            TwoRef.Commands.move
        ),
        new TwoRef.Anchor(
            x2 - headlen * Math.cos(angle + Math.PI / 4),
            y2 - headlen * Math.sin(angle + Math.PI / 4),
            undefined,
            undefined,
            undefined,
            undefined,
            TwoRef.Commands.line
        ),
    ]
    line.vertices = vertices

    two.update()
}
