### Plan: Draw-to-Place Shape Interaction

Context

Currently, clicking a shape (circle/rectangle) in the sidebar immediately creates and saves the element, then makes it follow the mouse until the user clicks to place it. The goal is to replace this
with a draw-to-place UX: the user clicks on the canvas to define the starting corner, drags to resize the shape in real time, then releases to finalize. This mirrors how shapes work in Figma/Sketch and
is only needed for circle and rectangle (not arrow, text, frame, etc.).

---

Key Files

- src/components/sidebar/primary.js — triggers shape creation
- src/newCanvas.js — all canvas mouse event handling (addZUI())
- src/factory/circle.js — creates Two.js ellipse, uses width/height props
- src/factory/rectangle.js — creates Two.js rounded rect, uses width/height props

---

Implementation Steps

1.  src/components/sidebar/primary.js

Define the draw-shape types at the top of the file:
const DRAW_SHAPE_TYPES = ['circle', 'rectangle']

In addElement(), inside the default case, branch on whether the label is a draw-shape type:

For draw-shape types (circle, rectangle):

- Do NOT call addToLocalComponentStore() or updateLastAddedElement()
- Do NOT set localStorage.setItem('lastAddedElementId', ...)
- Instead, after building shapeData, store it in localStorage:
  localStorage.setItem('pendingShapeType', label)
  localStorage.setItem('pendingShapeProps', JSON.stringify(shapeData))
- Set cursor to crosshair on #main-two-root
- Update the hint tooltip text to "Click and drag to draw shape" (update the hardcoded text in the JSX at the show-click-anywhere-btn element, or set it via a state variable hintText)

For all other shapes (text, frame, etc.): keep existing behavior unchanged.

---

2.  src/newCanvas.js — inside addZUI()

A. New scenario constant and state vars (add near other scenario constants, ~line 87):

let SCENARIO_DRAW_SHAPE = 'drawShape'
let drawOrigin = null // { x, y } in surface coords at mousedown
let drawCurrentCoords = null // latest surface coords from mousemove
let previewShape = null // temporary Two.js shape shown during drag
let drawShapeType = null // 'circle' | 'rectangle'
let drawShapeProps = null // pendingShapeProps parsed from localStorage

B. mousedown — detect pending shape and enter draw mode (add before lastAddedElementId check, ~line 136):

const pendingShapeType = localStorage.getItem('pendingShapeType')
if (pendingShapeType !== null) {
scenario = SCENARIO_DRAW_SHAPE
} else if (lastAddedElementId !== null) {
scenario = SCENARIO_JUST_ADDED_ELEMENT
}

Add case SCENARIO_DRAW_SHAPE: to the switch:
case SCENARIO_DRAW_SHAPE: {
const surfaceCoords = zui.clientToSurface(e.clientX, e.clientY)
drawOrigin = { x: surfaceCoords.x, y: surfaceCoords.y }
drawCurrentCoords = { x: surfaceCoords.x, y: surfaceCoords.y }
drawShapeType = localStorage.getItem('pendingShapeType')
drawShapeProps = JSON.parse(localStorage.getItem('pendingShapeProps'))

     // Clean up localStorage immediately
     localStorage.removeItem('pendingShapeType')
     localStorage.removeItem('pendingShapeProps')

     // Create preview shape at origin with zero size
     if (drawShapeType === 'circle') {
         previewShape = two.makeEllipse(surfaceCoords.x, surfaceCoords.y, 0, 0)
     } else if (drawShapeType === 'rectangle') {
         previewShape = two.makeRoundedRectangle(surfaceCoords.x, surfaceCoords.y, 0, 0, 5)
     }

     if (previewShape) {
         previewShape.fill = drawShapeProps?.fill || '#fff'
         previewShape.stroke = drawShapeProps?.stroke || '#000'
         previewShape.linewidth = drawShapeProps?.linewidth || 1
         previewShape.opacity = 0.6
         two.update()
     }

     domElement.addEventListener('mousemove', mousemove, false)
     domElement.addEventListener('mouseup', mouseup, false)
     document.getElementById('main-two-root').style.cursor = 'crosshair'
     break

}

C. mousemove — resize preview shape in SCENARIO_DRAW_SHAPE:

case SCENARIO_DRAW_SHAPE: {
const surfaceCoords = zui.clientToSurface(e.clientX, e.clientY)
drawCurrentCoords = { x: surfaceCoords.x, y: surfaceCoords.y }

     const width = Math.abs(surfaceCoords.x - drawOrigin.x)
     const height = Math.abs(surfaceCoords.y - drawOrigin.y)
     const centerX = (surfaceCoords.x + drawOrigin.x) / 2
     const centerY = (surfaceCoords.y + drawOrigin.y) / 2

     if (previewShape) {
         previewShape.translation.x = centerX
         previewShape.translation.y = centerY
         previewShape.width = width
         previewShape.height = height
         two.update()
     }
     break

}

D. mouseup — finalize and persist shape in SCENARIO_DRAW_SHAPE:

case SCENARIO_DRAW_SHAPE: {
const MIN_SIZE = 20
const endCoords = drawCurrentCoords || drawOrigin
const finalWidth = Math.max(Math.abs(endCoords.x - drawOrigin.x), MIN_SIZE)
const finalHeight = Math.max(Math.abs(endCoords.y - drawOrigin.y), MIN_SIZE)
const finalCenterX = (drawOrigin.x + endCoords.x) / 2
const finalCenterY = (drawOrigin.y + endCoords.y) / 2

     // Remove preview
     if (previewShape) {
         two.remove(previewShape)
         previewShape = null
         two.update()
     }

     // Persist the final element
     const finalId = generateUUID()
     const finalShapeData = {
         ...drawShapeProps,
         id: finalId,
         x: finalCenterX,
         y: finalCenterY,
         width: finalWidth,
         height: finalHeight,
     }

     addToLocalComponentStore(finalId, drawShapeType, finalShapeData)

     // Clean up state
     drawOrigin = null
     drawCurrentCoords = null
     drawShapeType = null
     drawShapeProps = null
     document.getElementById('main-two-root').style.cursor = 'auto'
     domElement.removeEventListener('mousemove', mousemove, false)
     domElement.removeEventListener('mouseup', mouseup, false)
     break

}

---

Coordinate System Notes

- Two.js makeEllipse(x, y, rx, ry) places the center at (x, y). Setting .width and .height on the shape (as the factory does) is equivalent to setting rx = width/2, ry = height/2.
- Two.js makeRoundedRectangle(x, y, w, h, r) places the center at (x, y).
- Both shapes use .translation.x/.y for repositioning after creation.
- zui.clientToSurface() handles zoom/pan coordinate conversion consistently with the rest of the canvas code.

---

Verification

1.  Click circle in sidebar → cursor changes to crosshair, no shape added to canvas yet
2.  Click and drag on canvas → a preview ellipse appears and resizes in real time
3.  Release mouse → preview disappears, final ellipse appears at the correct position/dimensions
4.  Confirm shape is saved to DB (check network tab for GraphQL mutation)
5.  Same flow for rectangle
6.  Confirm other shapes (text, frame, arrowLine) still use the old click-to-place flow
7.  Confirm the placed shape can be moved by subsequent mousedown/drag (existing move logic)
8.  Edge case: click without dragging → shape appears with minimum size (20×20)
