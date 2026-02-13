Currently the arrow functionality (when selected from sidebar) works as

- arrowLine gets x=-9999, y=-9999 — places the element off-screen so the user doesn't see a stray default arrow before they draw
- Sets localStorage.arrowDrawMode = 'true' — signals the canvas to handle the next mousedown as a draw operation
- Overrides cursor to 'crosshair' — visual feedback that draw mode is active
- Skips "Click anywhere" banner — that UX prompt no longer applies for arrowLine

SCENARIO_ARROW_DRAW in newCanvas component:

    SCENARIO_ARROW_DRAW with three phases:
    ┌───────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
    │ Event │ What happens │
    ├───────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
    │ mousedown │ Finds the pending arrow, sets group position to cursor (surface coords), resets both line vertices to 0,0, removes localStorage flags, starts listening for mousemove/mouseup │
    ├───────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
    │ mousemove │ Converts cursor to surface coords relative to group origin, calls updateX2Y2Vertices to stretch the arrowhead to follow the cursor │
    ├───────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
    │ mouseup │ Reads final vertices, calls updateToGlobalState to persist x,y,x1,y1,x2,y2 to the store and DB, resets cursor to auto │
    └───────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
    The pre-mousedown mousemove guard (arrowDrawMode !== 'true') prevents the stale element at -9999 from being moved to follow the cursor before the user clicks.
