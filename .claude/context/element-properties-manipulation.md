# fill

### Fill property manipulation for any element (shapes/arrow/pencil)

⏺ Fill follows the same three paths as linewidth, but with one key difference — individual element files also react to props.fill via useEffect.

1. Initial creation — factories
   Same as linewidth: rectangle.fill = fill ? fill : '#fff' in the factory, applied once on mount.

2. Live editing — floatingToolbar.js:287-303
   onChangeComplete directly mutates componentState.shape.data.fill = color, then calls updateComponent('fill', color) to persist to DB. Same pattern as linewidth.

3. Undo — board.js:453
   applyPropertyToTwoJSGroup handles 'fill' with shape[name] = value. Same as linewidth.

4. Prop-change useEffect in element files — this is what's different from linewidth

rectangle.js:312-316, circle.js:330-334, and pencil.js:184-188 all have:
shapeInstance.fill = props.fill || shapeInstance.fill
// deps: [props.x, props.y, props.fill, props.width, props.height]

linewidth has no equivalent useEffect in those files (only arrowLine.js watches props.linewidth).

This extra path exists to handle real-time subscription updates — when another user changes a shape's fill, the GraphQL subscription fires, the new fill flows in as a prop, and
the useEffect re-applies it to the Two.js shape instance to keep the canvas in sync.

# linewidth (stroke width)

### linewidth property manipulation for any element (shapes/arrow/pencil)

When user selects "stroke width" from defaults sidebar or floating toolbar, it internally updates element's linewidth property. Stroke width for Visual representation, linewidth for code representation.

Here's how manipulation of linewidth (a.k.a "Stroke width") works

1. src/components/floatingToolbar.js:479-484 — onChangeBorderWidth updates state.linewidth and directly mutates componentState.shape.data.linewidth, then calls
   updateComponent('linewidth', width) to persist to DB. This is the primary live-edit path for all shapes.
2. src/views/Board/board.js:455-461 — applyPropertyToTwoJSGroup handles linewidth as part of the undo system, setting shape[name] = value on the Two.js shape when rewinding
   history.

The individual element files (rectangle.js, circle.js, etc.) only set the initial linewidth at creation time — that happens in their factories (src/factory/rectangle.js:24,
src/factory/circle.js:20).

The exception is arrowLine.js which has its own useEffect at line 252 that watches props.linewidth and reapplies it — but that's because arrows have a more complex shape
structure that needs special handling on prop changes.
