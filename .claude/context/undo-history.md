# Undo / History System

## Overview

Board mutations are tracked in a stack (`historyLog`) that powers Ctrl+Z undo. Every function that modifies component state **must** call `recordToHistoryLog` before touching the store or DB.

All history state lives in `src/hooks/useComponentHistory.js`. The hook is called in `src/views/Board/board.js` and its returned values (`recordToHistoryLog`, `undoLastAction`, `clearHistory`) are spread into `BoardContext`.

`applyPropertyToTwoJSGroup` is a module-level helper function in `useComponentHistory.js` (not exported — used internally by `undoLastAction` to mutate Two.js shape properties when reversing an `UPDATE_BULK` action).

## State

```js
const [historyLog, setHistoryLog] = useState([])
const historyLogRef = useRef([])   // always kept in sync with historyLog state
```

`historyLogRef` is the authoritative copy used inside callbacks to avoid stale closure issues.

## Recording an action

```js
recordToHistoryLog(entry)
```

Appends `{ ...entry, timestamp: Date.now() }` to the stack. Called at the top of each mutating function, **before** any store or DB change.

### Entry shapes by action type

| action | extra fields | recorded by |
|---|---|---|
| `ADD` | `id`, `componentInfo` | `addToLocalComponentStore` |
| `DELETE` | `id`, `prevState` (full component snapshot) | `deleteComponentFromLocalStore` |
| `UPDATE_BULK` | `id`, `prevProps` (only changed keys), `bulkObj` | `updateComponentBulkPropertiesInLocalStore` |
| `UPDATE_VERTICES` | `id`, `prevX`, `prevY` | `updateComponentVerticesInLocalStore` |

## Reversing an action — `undoLastAction()`

**This is the canonical rollback function. Always use it instead of manually manipulating store/Two.js state.**

It pops the last entry, then reverses it completely:

| action | what it does |
|---|---|
| `ADD` | Removes Two.js shape from scene, deletes from component store, calls `deleteComponent` mutation if persisted |
| `DELETE` | Re-inserts into component store, calls `insertComponent` mutation if persisted |
| `UPDATE_VERTICES` | Restores previous `x`/`y` in store and Two.js translation, calls `updateComponentInfo` |
| `UPDATE_BULK` | Restores previous property values in store and Two.js shape, calls `updateComponentInfo` |

Store is always updated **before** Two.js visuals to keep `stateRefForComponentStore` correct even if rendering fails. Canvas is flushed with `requestAnimationFrame(() => two?.update())`.

## Rule: use `undoLastAction()` for any rollback

If an async operation (e.g. a GQL mutation) fails and the local state needs to be reverted, call `undoLastAction()` — do not manually delete from the store or remove from the Two.js scene. This ensures:
- `historyLog` stays consistent (no orphan entries)
- Two.js scene, React state, and the ref stay in sync
- Server-side compensating mutations (e.g. `deleteComponent` after a failed `insertComponent`) are fired correctly

Example — permission error on insert:
```js
insertComponent({ variables: { object: componentInfo } }).catch((error) => {
    const isPermissionError = error.graphQLErrors?.some(
        (e) => e.extensions?.code === 'permission-error'
    )
    if (isPermissionError) {
        undoLastAction()   // reverses the ADD cleanly
        setShowPermissionErrorModal(true)
    }
})
```
