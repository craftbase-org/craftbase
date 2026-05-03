# Code style

- Use ES modules (import/export) syntax, not CommonJS (require)
- Destructure imports when possible (eg. import { foo } from 'bar')
- Use `tabWidth:4` for generating code for all the files (.js, .yaml, .md, etc...)

# General guidelines

For example:

- Only use absolute positioning when necessary. Opt for responsive and well structured layouts that use flexbox and grid by default
- Refactor code as you go to keep code clean
- Keep file sizes small and put helper functions and components in their own files.

# Code structure

Below is the craftbase project codemap with different sections talking about overview, architecture, directory structure, technology stack and key files.

## Overview

Craftbase is an minimal virtual whiteboarding tool built with React that uses Two.js for 2D canvas rendering. This document maps the codebase structure to help developers quickly locate and understand different parts of the application.

## Core Architecture

**Rendering Stack**: Board → Canvas → ElementRenderer → Component Element → Component Factory

- **Board**: Main container handling canvas rendering, sidebar, and floating toolbar
- **Canvas**: 2D rendering logic and user interaction controls (mouse, drag, zoom, pan)
- **Component Elements**: React functional components with attached event listeners
- **Component Factories**: Template generators that produce component definitions

The Board component uses React Context (`BoardContext`) to pass state and methods down to child components. This is the primary state management pattern used throughout the application.

## React + Two.js Stale Closure Pattern

**Critical architectural constraint**: `addZUI` in `src/newCanvas.js` is called **once on mount** via `useEffect([], [])`. All DOM event listeners registered inside it (mouse, dblclick, keydown, etc.) close over the initial `props` and local variables — they never see React state updates.

**Rule**: Any Two.js event handler that needs live React state **must** read from a `useRef`, not from `props` or state directly.

Pattern:

```js
const myValueRef = useRef(props.myValue)
useEffect(() => {
    myValueRef.current = props.myValue
}, [props.myValue])
// pass myValueRef into addZUI, read myValueRef.current inside handlers
```

This is because Two.js attaches raw DOM `addEventListener` calls outside React's reconciliation loop — React cannot re-bind them on re-render. The ref object is stable across renders; `.current` always holds the latest value at call time.

## Two.js scene.subtractions Pitfall

**Symptom**: `Uncaught NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is no longer a child of this node.` thrown from `_Group2.render` → `subtractions.forEach(svg.group.removeChild)`.

**Why it happens**:

- `two.remove(element)` does NOT remove SVG nodes immediately. It removes the element from `scene.children` and pushes it into `scene.subtractions`. The actual `parent.removeChild(elem)` happens on the next `two.update()`, inside the renderer's `subtractions.forEach`.
- If between `two.remove(element)` and `two.update()` the element's SVG node is detached by some other path — for example, the element was nested inside another group's SVG element which got removed — then Two.js's tracked `parentNode` no longer matches the actual DOM tree. The `removeChild` call throws.
- `scene.flagReset()` only clears `scene.subtractions` after a successful render. **If the render throws, the array stays populated, and every subsequent `two.update()` retries the same broken operation and crashes again** — this is why the same error keeps reappearing as you fix one trigger after another.

**Common triggers**:

1. Removing a parent group via `two.remove([parentGroup])`. Two.js detaches the parent's SVG node from the DOM, taking nested SVG nodes with it. Any element whose Two.js bookkeeping still says "I'm a child of scene.\_renderer.elem" is now lying.
2. Multiple `two.update()` calls firing in close succession from different sources (an event handler, an element component's cleanup, a `requestAnimationFrame` callback). Each can put the SVG in a half-reconciled state that the next one trips over.
3. React component cleanup effects calling `two.remove(group)` after we've already manually removed the same group elsewhere — double subtraction.

**Rules to avoid it**:

- **Don't compete with the element components for Two.js cleanup.** Each shape component (e.g. `rectangle.js`, `circle.js`) calls `two.remove(group)` in its `useEffect` cleanup. If you also call `two.remove` on the same elements from a parent component, you get a double-subtract. Pick one owner: either remove manually and let the cleanup be a no-op (Two.js's `Group.remove` safely skips ids it doesn't own), or do nothing and let the cleanup own it.
- **Don't call `two.update()` inside a Two.js DOM event handler that fires synchronously during another `two.update()`** (notably `blur`, which fires when Two.js detaches a focused SVG node). The outer update is mid-reconciliation; calling `two.update()` again corrupts the SVG tree.
- **If `two.update()` might throw during a tear-down path, wrap it in `try/catch` AND clear `two.scene.subtractions.length = 0; two.scene._flagSubtractions = false`** in the catch. Otherwise the bad subtraction sticks around and every future `two.update()` repeats the crash.

**Where the source lives** (when you need to verify behavior):

- `node_modules/two.js/src/renderers/svg.js` — `svg.group.removeChild` (has a `parentNode != this.elem` early-return check) and `svg.group.render` (calls `subtractions.forEach`).
- `node_modules/two.js/src/group.js` — `subtractions`/`additions` arrays, `flagReset()` clearing logic, the `splice()` helper that pushes into `subtractions` when a child is detached.

**Reference**: `src/components/elements/groupobject.js` `handleOnDeleteGroupElements` is the canonical example of cleanly tearing down a group with a `try/catch` + subtraction reset.

## Directory Structure

### `/src/views`

Top-level page views/routes.

- **`Board/`**: Main whiteboard page
    - `board.js` - Board component with `BoardContext` provider, GraphQL operations
    - `index.js` - Entry point with error boundary
    - `errorBoundary.js` - Error boundary wrapper

- **`Home/`**: Marketing/landing page (served at `/home`, no longer the default route)

### `/src/components`

Reusable React UI components.

- **`elements/`**: Whiteboard element components (shapes, controls, UI widgets)
    - Shape components: `circle.js`, `rectangle.js`, `frame.js`
    - Arrow components: `arrowLine.js`, `divider.js`
    - Drawing: `pencil.js`
    - Text components: `newText.js`
    - Other: `groupobject.js`

- **`sidebar/`**: Left sidebar UI
    - `primary.js` - Main sidebar component
    - `defaults.js` - Defaults section sidebar (where default stroke width and stroke type can be applied)
    - `shareLinkPopup.js` - Share functionality popup
    - `userDetailsPopup.js` - User information popup

- **`common/`**: Shared utility components
    - `button.js` - Base button component
    - `modal.js`, `modalContainer.js` - Modal system
    - `portal.js` - React portal wrapper
    - `spinner.js`, `spinnerWithSize.js` - Loading indicators

- **`utils/`**: Component-specific utility functions
    - `elementRenderWrappers.js` - `ElementRenderWrapper` and `GroupRenderWrapper` factory functions used by Canvas to lazily mount element components

- **`modals/`**: Standalone modal components
    - `PermissionErrorModal.js` - Permission error modal (extracted from board.js)
    - `StorageLimitModal.js` - Storage quota exceeded modal (extracted from board.js)

- **`floatingToolbar.js`**: Floating toolbar for quick actions (every time when a user clicks component, this floating toolbar gets visible and invisible when the focus is moved away from component)

### `/src/factory/`

Component factory classes (.js file under /src/factory) that generate template definitions for each element type. Each factory corresponds to a component element.

Example of factory-component relation:

- Factories (`/src/factory/`): `arrowLine.js`, `circle.js`, `divider.js`, `pencil.js`, `rectangle.js`, `newText.js`
- Component (`/src/components/elements/`): `arrowLine.js`, `circle.js`, `divider.js`, `pencil.js`,`rectangle.js`, `newText.js`

### `/src/store` (not in use)

Legacy Redux store files (currently unused in the project).

- **`actions/`**: Redux action creators (not in use)
- **`reducers/`**: Redux reducers (not in use)

### `/src/schema`

GraphQL schema definitions for backend communication (Hasura).

- **`queries/`**: GraphQL query definitions
- **`mutations/`**: GraphQL mutation definitions
- **`subscriptions/`**: GraphQL subscription definitions for real-time updates

### `/src/constants`

Application constants and configuration.

- `elementSchema.js` - Element schema definitions
- `misc.js` - Miscellaneous constants
- `exportHooks.js` - Custom hook exports

### `/src/hooks`

Custom React hooks extracted from board.js and newCanvas.js.

- `useDrawingModes.js` - Draw mode state (`isPencilMode`, `isArrowDrawMode`, `isTextDrawMode`, pointer toggle)
- `usePencilDefaults.js` - Pencil/stroke defaults (`defaultLinewidth`, `defaultStrokeType`, `pencilStrokeColor`) and their setters
- `useMobileToolbarPanels.js` - Mobile panel visibility state with useEffect-based auto-close logic
- `useLocalDraftPersistence.js` - localStorage draft save/restore + storage-quota modal state
- `useComponentHistory.js` - Undo/history stack (`historyLog`, `recordToHistoryLog`, `undoLastAction`, `clearHistory`)
- `useCanvasClipboard.js` - Copy (Ctrl+C) and paste (Ctrl+V) logic for canvas elements

### `/src/utils`

Utility functions and helpers.

- `constants.js` - Shared constants
- `misc.js` - Miscellaneous utilities
- `updateVertices.js` - Vertex update utilities
- `canvasUtils.js` - Pure Two.js canvas helpers: `setArrowEndpointsVisible`, `applyShapeStyle`, `cloneElementData`, `resolveShapeFromPath`, `pollUntilElement`
- `drawModeUtils.js` - localStorage draw mode helpers: `getArrowDrawMode`, `isSelectPanMode`, `clearAllDrawModes`

### `/src/icons`

SVG icon components.

### `/src/assets`

Static assets (images, fonts, etc.).

### `/src/wireframeAssets`

Wireframe-related assets.

### `/src/styles`

Global stylesheets.

## Key Files

### Root Level (`/src`)

- **`App.js`**: Root application component with routing (`/` → Board, `/board/:id` → Board, `/home` → Marketing)
- **`newCanvas.js`**: Main canvas rendering logic using Two.js
- **`routes.js`**: Application routes configuration
- **`index.js`**: Application entry point
- **`serviceWorker.js`**: PWA service worker

## Data Flow

1. **User Interaction** → Canvas event listeners (mouse, drag, zoom)
2. **Component Creation** → Factory generates template → Element renderer creates Two.js object
3. **State Updates** → React Context (BoardContext) + local component state → Component re-renders
4. **Backend Sync** → GraphQL mutations fire only when `isPersisted` is true. In local mode (`/`), state lives in React + localStorage draft only.

## React Context

The **BoardContext** (created in `src/views/Board/board.js`) provides:

- Component store state
- Selected component state
- Two.js instance
- Pencil mode state (from `useDrawingModes` hook)
- Toolbar visibility (from `useMobileToolbarPanels` hook)
- Pencil/stroke defaults (from `usePencilDefaults` hook)
- Undo/history functions — `recordToHistoryLog`, `undoLastAction` (from `useComponentHistory` hook)
- GraphQL mutation functions
- `boardId`, `isPersisted`, `persistBoard`, `backgroundBoardId` (canvas-first UX)
- Other board-level state and handlers

Child components access this context via `useContext(BoardContext)`.

### Hook composition in board.js

`board.js` composes several custom hooks in this order (order matters — each may depend on the previous):

1. `useDrawingModes()` — draw mode state and setters
2. `useMobileToolbarPanels({ isPencilMode, isMobile, selectedComponent })` — panel visibility
3. `usePencilDefaults({ toggleToolbar, setSelectedComponent })` — defaults and their setters
4. `useLocalDraftPersistence({ ..., onStorageLimitRef })` — draft persistence + quota modal
5. `useComponentHistory({ ... })` — undo stack

## Technology Stack

- **UI Framework**: React (^18.3.1)
- **Canvas Rendering**: Two.js
- **State Management**: React Context (BoardContext) + local component state
- **Backend**: GraphQL (Hasura)
- **GraphQL Client**: Apollo Client
- **Styling**: CSS + Tailwind CSS
- **Build Tool**: Vite
- **Package manager**: Yarn (v1.22.22)

# Workflow

- Be sure to typecheck when you're done making a series of code changes
- Prefer running single tests, and not the whole test suite, for performance

## Mobile testing on local network

When testing on a real mobile device (laptop and phone on same WiFi):

1. Replace `localhost` with the laptop's LAN IP (e.g. `10.151.106.95`) in `.env`:
    ```
    VITE_GRAPHQL_ENDPOINT=http://<LAN_IP>:8080/v1/graphql
    VITE_WS_GRAPHQL_ENDPOINT=ws://<LAN_IP>:8080/v1/graphql
    ```
2. Ensure `vite.config.mjs` has `host: true` and `allowedHosts: ['<LAN_IP>']` (no `http://` prefix).
3. Restart the dev server, then open `http://<LAN_IP>:5173` on mobile.
4. **Revert `.env` before committing** — or use `.env.local` for the override so it stays out of git.

# Feature Context

See detailed notes in `.claude/context/` for feature-specific implementation details:

- `.claude/context/floating-toolbar.md` - Floating toolbar activation and structure
- `.claude/context/undo-history.md` - Undo/history stack: action entry shapes, `recordToHistoryLog`, and `undoLastAction()` as the canonical rollback for any failed mutation
- `.claude/context/responsive-design.md` - When to use Tailwind responsive prefixes vs `useMediaQueryUtils` hook; breakpoint values for both; the core decision rule
- `.claude/context/font-guide.md` - Font system: Geist (UI chrome), Fraunces (branding/headings), Caveat (canvas sketch); CSS variables, Tailwind config, and usage rules per area

### Component schema (from DB)

```
{
  id: uuid, // primary key, unique, default: gen_random_uuid()
  componentType: text,
  x: integer, // default: 0
  y: integer, // default: 0
  x1: integer, // default: 100
  x2: integer, // default: 400
  y1: integer, // default: 100
  y2: integer, // default: 100
  width: integer, // default: 120
  height: integer, // default: 120
  fill: text, // default: '#f4f4f2'
  stroke: text | null,
  linewidth: integer | null,
  strokeType: text | null,
  radius: integer | null,
  iconStroke: text | null,
  textColor: text | null,
  boardId: text | null,
  boardName: text | null,
  metadata: jsonb | null,
  children: jsonb | null,
  isDummy: boolean | null,
  updatedBy: text | null,
  createdAt: bigint | null, // default: epoch()
}
```
