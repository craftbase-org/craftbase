// Vertex math for arrow lines. The Two.js types we need (Anchor, Commands) come
// off the constructor namespace. Parameters are intentionally typed loosely
// here because the calling sites pass through scene-bookkeeping shapes that get
// fully typed in Stages 7–9 (canvas / newCanvas).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoRefLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LineLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PointCircleLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any

export const updateX1Y1Vertices = (
    TwoRef: TwoRefLike,
    line: LineLike,
    x1: number,
    y1: number,
    pointCircle1: PointCircleLike,
    two: TwoLike
): void => {
    // Plain lines carry `noArrowhead` (set by the line factory) — rebuild as a
    // bare 2-anchor segment so dragging the tail never sprouts an arrowhead.
    if (line?.noArrowhead === true) {
        line.vertices = [
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
        ]
        pointCircle1.translation.x = line.vertices[0].x
        pointCircle1.translation.y = line.vertices[0].y
        two.update()
        return
    }

    const headlen = 10
    const angle = Math.atan2(line.vertices[1].y - y1, line.vertices[1].x - x1)

    const vertices = [
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

    pointCircle1.translation.x = line.vertices[0].x
    pointCircle1.translation.y = line.vertices[0].y

    two.update()
}

export const updateX2Y2Vertices = (
    TwoRef: TwoRefLike,
    line: LineLike,
    x2: number,
    y2: number,
    pointCircle2: PointCircleLike,
    two: TwoLike
): void => {
    // Plain lines (see updateX1Y1Vertices) stay a bare 2-anchor segment.
    if (line?.noArrowhead === true) {
        line.vertices = [
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
        ]
        pointCircle2.translation.x = line.vertices[1].x
        pointCircle2.translation.y = line.vertices[1].y
        two.update()
        return
    }

    const headlen = 10
    const angle = Math.atan2(y2 - line.vertices[0].y, x2 - line.vertices[0].x)

    const vertices = [
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

    pointCircle2.translation.x = line.vertices[1].x
    pointCircle2.translation.y = line.vertices[1].y

    two.update()
}
