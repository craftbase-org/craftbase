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

src/newCanvas.js:196 — SCENARIO_TEXT_DRAW

On mousedown: The canvas finds the pending text element by its ID from localStorage and positions it at the clicked surface coordinates via textDrawElement.position.x/y.

On mouseup (newCanvas.js:916): Fires a triggerTextInput custom DOM event with the element's ID, then clears textDrawMode state/localStorage and resets cursor.

---

3. Rendering (Factory + Component)

src/factory/text.js — TextFactory.createElement()

Creates the Two.js object tree:

- rectangle — transparent rounded rect (acts as bounding box)
- rectTextGroup — group wrapping the rectangle, holds the <foreignObject> with actual HTML text
- group — outer wrapper with translation.x/y for positioning
- Injects <foreignObject> SVG with a <div class="foreign-text-container-base ..."> for HTML text rendering

src/components/elements/text.js — React component that:

- Instantiates TextFactory in useEffect
- Sets up interact.js for click (show selector + toolbar) and resize (all 4 edges)
- Listens for triggerTextInput event → calls showTextInput()

---

4. Text Editing

text.js:102 — showTextInput()

On double-click or placement trigger:

1. Hides the SVG group element (display: none)
2. Creates a native <textarea> overlaid at the exact DOM position
3. On blur: hides the textarea, updates <foreignObject> innerHTML with the new content, persists size/content via updateComponentBulkPropertiesInLocalStore

---

5. Styling Updates

text.js:57 — updateTextStylingViaDOM()

Since text uses a <foreignObject> (HTML inside SVG), styling is applied directly via DOM class .foreign-text-container-{id} rather than through Two.js properties. Updates color
on the container element.

---

Key Quirk

The text element uses foreignObject (HTML embedded in SVG) for rendering, which means standard Two.js styling APIs don't fully apply — styling must be done via direct DOM
manipulation on the class-named container.
