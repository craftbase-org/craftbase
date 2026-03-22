### Text Element Flow

1. Creation (Sidebar → Board)

src/components/sidebar/primary.js:109 — handleTextElement()

When the user clicks the text tool in the sidebar:

1. Sets textDrawMode = 'true' in localStorage
2. Stores the new element's ID in localStorage as lastAddedElementId
3. Calls setTextDrawModeInBoard(true) on BoardContext
4. Calls addToLocalComponentStore(...) to register the new component in state
5. Sets cursor to crosshair (waiting for user to click on the canvas)

---

2. Placement (Canvas mousedown/mouseup)

src/newCanvas.js — SCENARIO_TEXT_DRAW

On mousedown: The canvas finds the pending text element by its ID from localStorage and positions it at the clicked surface coordinates.

On mouseup: Fires a `triggerTextInput` custom DOM event with the element's ID, then clears textDrawMode state/localStorage and resets cursor.

---

3. Rendering (Factory + Component)

src/factory/newText.js — NewTextFactory.createElement()

Creates a native Two.js text object (no foreignObject/HTML):

- `twoText` — Two.js text node via `two.makeText()`, with fill, size, alignment, baseline, family set
- `group` — outer group with translation.x/y for positioning
- Returns `{ group, twoText }`

src/components/elements/newText.js — NewText React component:

- Instantiates NewTextFactory in useEffect
- Adds selector via getEditComponents (4 corner circles)
- Sets up interact.js click → show selector + toggleToolbar(true)
- Sets up global mousedown → hide selector + toolbar when clicking outside

---

4. Text Editing

newText.js — showTextInput() (defined inside useEffect)

Triggered on double-click (on either twoText.\_renderer.elem or the outer group), or on first placement via `triggerTextInput` DOM event (with 100ms setTimeout).

1. Hides the Two.js group DOM element (display: none)
2. Derives screen position from `twoText._renderer.elem.getBoundingClientRect()`
3. Creates a native `<textarea>` overlaid at the text center, styled to match font/size/color
4. Uses a hidden `<span>` measurement helper to auto-size the textarea as the user types
5. On blur: restores group visibility, updates `twoText.value`, recalculates bounds, persists via `updateComponentBulkPropertiesInLocalStore`

---

5. Resize (Corner Handles)

newText.js — corner circle mousedown listeners

Distance-based proportional font-size scaling:

1. On mousedown on a corner circle, records the text center and starting distance from cursor to center
2. On mousemove, computes scale = currentDist / startDist, applies `twoText.size = startSize * scale` (clamped 8–300)
3. On mouseup, persists new fontSize, width, height to the store

---

6. Styling Updates

newText.js — props-sync useEffect (runs on props.x, props.y, props.textColor, props.metadata changes)

Since text now uses native Two.js `two.makeText()`, styling is applied directly on the Two.js object:

- `twoText.fill = props.textColor`
- `twoText.size = props.metadata.fontSize`
- `twoText.value = props.metadata.content`

No DOM class manipulation needed (unlike the old foreignObject approach).

---

Key Notes

- Uses native SVG `<text>` via Two.js `makeText()`, NOT foreignObject/HTML. Two.js styling APIs apply directly.
- The floating Toolbar rendered by this component shows only text color and font size (hideColorBackground, hideColorIcon, hideBorderSection are all true; showTextSizeSection is true).
- internalState.shape and internalState.text both point to the same twoText object, so toolbar opacity and color handlers work on the same Two.js node.
- Pointer events are disabled on the group whenever isPencilMode, isArrowDrawMode, isTextDrawMode, or isArrowSelected is active.
