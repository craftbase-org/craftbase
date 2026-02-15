## Persists toolbar changes to DB/cloud (sync)

The updateComponent function in floatingToolbar.js (lines 189-201) has the entire updateComponentInfo mutation call with postToolbarUpdate() (which just calls
two.update() via props handler fn) runs. So fill, border (stroke) color, and border(stroke) width changes (from toolbar) update the canvas visually but also gets persisted to the DB (when mutation is completed).
