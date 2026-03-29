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

**1. Initial creation — factories**

`src/factory/rectangle.js:24`, `circle.js:20` etc. set the initial linewidth on shape creation.

**2. Default stroke width — defaults sidebar**

`defaultLinewidth` is board-level state in `board.js` (`useState(2)`). The defaults sidebar renders a stroke-width selector; selecting a value calls `setDefaultLinewidthInBoard(value)`.

`setDefaultLinewidthInBoard` (board.js) does the following:

- Updates the default for future elements (`setDefaultLinewidth(val)`).
- Calls `toggleToolbar(false)` to dismiss the floating toolbar.
- If an element is currently selected (`selectedComponent != null`), mutates `selectedComponent.shape.data.linewidth` (guarded by `shape?.data?.stroke` being truthy, matching the floating toolbar's guard) and calls `updateComponentBulkPropertiesInLocalStore` to persist to DB and record undo history. Then calls `twoJSInstanceRef.current?.update()`.

`updateComponentBulkPropertiesInLocalStore`, after updating the local store, also calls `setDefaultLinewidth` when `linewidth` is present in `bulkObj` — so the defaults sidebar stays in sync with any property change regardless of which UI triggered it (floating toolbar, defaults sidebar, or undo).

**3. Live editing — floatingToolbar.js:479-484**

`onChangeBorderWidth` updates `state.linewidth` and directly mutates `componentState.shape.data.linewidth` (guarded by `shape?.data?.stroke`), then calls `updateComponent('linewidth', width)` to persist to DB via `updateComponentBulkPropertiesInLocalStore`.

**4. Undo — board.js UPDATE_BULK path**

*Visual (Two.js)*: `applyPropertyToTwoJSGroup` handles `'linewidth'` via `shape[name] = value`.

*UI state sync*: After the visual update, the undo path calls `setDefaultLinewidth(prevProps.linewidth)` so the defaults sidebar reflects the restored value, and increments `toolbarRefreshKey` to force the floating toolbar's sync useEffect to re-fire. Since `selectedComponent` is the same object reference after undo, the floating toolbar's `useEffect([componentState, refreshKey])` would never re-fire on `componentState` alone — `toolbarRefreshKey` is the explicit signal.

**5. Element files**

Individual element files (rectangle.js, circle.js, etc.) only set the initial linewidth at creation time via their factories. The exception is arrowLine.js which has its own useEffect at line 252 that watches `props.linewidth` and reapplies it — arrows have a more complex shape structure that needs special handling on prop changes.

# strokeType

### strokeType property manipulation for any element (shapes/arrow/pencil)

`strokeType` has three possible values stored in the DB: `null` / `'solid'` (both mean solid), `'dashed'`, or `'dotted'`. It maps to Two.js `dashes` arrays via `strokeTypeToDashes()` in `src/utils/misc.js`:

- `'dashed'` → `[8]`
- `'dotted'` → `[4]`
- `null` / `'solid'` → `[]`

An important Two.js quirk: setting `dashes = []` does NOT remove the `stroke-dasharray` SVG attribute — it just leaves the old one in place. `clearDashesOnTwoJSShape()` (also in `src/utils/misc.js`) directly removes the SVG attributes via `shape._renderer.elem.removeAttribute(...)` to fix this. This must be called whenever reverting to solid.

**1. Initial creation — factories**

All factories (`src/factory/rectangle.js:25`, `circle.js:21`, `arrowLine.js:22`, `pencil.js:35,59`, `divider.js`) call `strokeTypeToDashes(strokeType)` and assign the result to `shape.dashes` (or `path.dashes` for pencil paths) immediately on shape creation.

**2. Default stroke type — defaults sidebar + newCanvas**

`defaultStrokeType` is a board-level state in `board.js:95` (`useState(null)`). The defaults sidebar (`src/components/sidebar/defaults.js:76-108`) renders a stroke-type selector; selecting a type calls `setDefaultStrokeTypeInBoard(value === 'solid' ? null : value)`.

`setDefaultStrokeTypeInBoard` (board.js) does the following:

- Updates the default for future elements (`setDefaultStrokeType(val)`).
- Calls `toggleToolbar(false)` to dismiss the floating toolbar.
- If an element is currently selected (`selectedComponent != null`), immediately applies the change to it: mutates `selectedComponent.shape.data.dashes`, calls `clearDashesOnTwoJSShape` when reverting to solid, updates `selectedComponent.group.data.elementData.strokeType`, and calls `updateComponentBulkPropertiesInLocalStore` to persist to DB and record undo history. Then calls `twoJSInstanceRef.current?.update()`.

This default is threaded through `BoardContext` and consumed by:

- `src/components/sidebar/primary.js:83,139,217` — injects `strokeType: defaultStrokeType` into shape data when placing any new shape/arrow/frame.
- `src/newCanvas.js:1169` — injects `strokeType: defaultStrokeTypeValue` into pencil component data on draw complete. The module-level var `defaultStrokeTypeValue` is kept in sync via a `useEffect` at `newCanvas.js:1603-1604` watching `props.defaultStrokeType`.
- `src/components/pencilToolbar.js:25` — reads `defaultStrokeType ?? 'solid'` to display the current type in the pencil toolbar UI.

**3. Live editing — floatingToolbar.js:436-455**

`onChangeStrokeType` in the floating toolbar's `BorderStyleBox`:

1. Updates local toolbar state (`draft.strokeType = type === 'solid' ? null : type`).
2. Directly mutates the Two.js shape: `componentState.shape.data.dashes = strokeTypeToDashes(type)`, and calls `clearDashesOnTwoJSShape` if reverting to solid.
3. Updates in-memory element data: `componentState.group.data.elementData.strokeType = type === 'solid' ? 'solid' : type`.
4. Calls `updateComponent('strokeType', type === 'solid' ? 'solid' : type)` to persist to DB.

Note the asymmetry: DB/elementData stores `'solid'` for solid, but local toolbar state stores `null`. Both are treated as solid downstream.

`updateComponent` in the floating toolbar routes through `updateComponentBulkProperties` (which is `updateComponentBulkPropertiesInLocalStore` from board.js). That function, after updating the local store, also calls `setDefaultStrokeType` when `strokeType` is present in `bulkObj` — so the defaults sidebar stays in sync with any strokeType change regardless of which UI triggered it.

**4. Undo — board.js UPDATE_BULK path**

*Visual (Two.js)*: `applyPropertyToTwoJSGroup` handles `'strokeType'` by calling `shape.dashes = strokeTypeToDashes(value)` and `clearDashesOnTwoJSShape(shape)` when value is falsy or `'solid'`.

*UI state sync*: After the visual update, the undo path also:
- Calls `setDefaultStrokeType` so the defaults sidebar reflects the restored value.
- Updates `selectedComponent.group.data.elementData.strokeType` in-memory — necessary because `applyPropertyToTwoJSGroup` only updates the Two.js shape dashes, not `elementData`. The floating toolbar reads `componentState.group.data.elementData.strokeType`, so without this it would re-read a stale value.
- Increments `toolbarRefreshKey` to force the floating toolbar's sync useEffect to re-fire (see linewidth section for details on `toolbarRefreshKey`).

**5. Prop-change useEffect in element files (real-time sync)**

All element files have a `useEffect` watching `props.strokeType` to handle subscription updates from other users (as well as any changes on it coming down from top level component board):

- `rectangle.js:321-326` — `internalState.shape.data.dashes = strokeTypeToDashes(props.strokeType)` then `two.update()`.
- `circle.js:339-344` — same pattern as rectangle.
- `pencil.js:193-201` — iterates over all children of the group: `internalState.group.data.children.forEach(child => { child.dashes = dashes })` then `two.update()`. This is different because pencil is a Two.js Group, not a single shape.
- `arrowLine.js:248-256` — shares a useEffect with `props.stroke` and `props.linewidth`, applying all three together: `lineInstance.dashes = strokeTypeToDashes(props.strokeType)`.

Unlike `fill`, none of these useEffects call `clearDashesOnTwoJSShape` when reverting to solid — the SVG attribute cleanup is only done in the live-edit (floatingToolbar) and undo (board.js) paths.
