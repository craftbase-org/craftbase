## Floating toolbar structure

It consists of background color picker, border(stroke) type, border (stroke) width, border (stroke) fill and opacity slider.

## Floating toolbar activation

It toggles on whenever

- a component on the canvas is selected (via mouse event handlers on newCanvas.js)
- fresh new component is placed on the canvas ()

It toggles off when

- user clicks on blank/empty canvas section anywhere but component.

## Persists toolbar changes to DB/cloud (sync)

The updateComponent function in floatingToolbar.js (lines 189-201) has the entire updateComponentInfo mutation call with postToolbarUpdate() (which just calls
two.update() via props handler fn) runs. So fill, border (stroke) color, and border(stroke) width changes (from toolbar) update the canvas visually but also gets persisted to the DB (when mutation is completed).

## Caveat

1. Toolbar hide on shape/arrow creation mouseup — floating toolbar now hides (and selected component is cleared) when mouseup fires after drawing any shape or arrow. Previously it was toggling on after element placement.
2. Toolbar no longer activates on fresh element placement — the "toggles on when fresh new component is placed" behavior was removed. The toolbar only shows on explicit
   click/focus of an element.
3. There is a separate floating toolbar for pencil (pencil mode), i.e. `pencilToolbar.js` which is not separate from `floatingToolbar.js` which is common for all other elements but does not apply to pencil.
