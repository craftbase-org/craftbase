Shape Selection & Placement Flow

Circle & Rectangle (Draw-to-Place)

1. Sidebar click → builds shapeData with default props (fill, stroke, linewidth, etc.) but does not create any element or write to DB. Stores to localStorage:
    - pendingShapeType = "circle" | "rectangle"
    - pendingShapeProps = JSON of the shape data
    - Cursor changes to crosshair. Hint tooltip shows "Click and drag to draw shape"

2. Canvas mousedown (SCENARIO_DRAW_SHAPE in newCanvas.js) →
    - Records drawOrigin (mousedown surface coords)
    - Creates a semi-transparent preview Two.js shape at that point with zero dimensions
    - Clears pendingShapeType/pendingShapeProps from localStorage
    - Attaches mousemove + mouseup listeners

3. Canvas mousemove → resizes the preview in real time:
    - width/height = absolute distance from origin to current cursor
    - center = midpoint between origin and current cursor
    - Calls two.update() on each move

4. Canvas mouseup → finalizes:
    - Removes preview shape from scene
    - Computes final x, y, width, height (all Math.round()-ed to avoid float errors)
    - Enforces a minimum size of 20px
    - Calls addToLocalComponentStore() → persists to DB via GraphQL
    - Resets cursor to auto, hides hint tooltip, clears draw state

---
