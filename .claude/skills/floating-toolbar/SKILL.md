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
