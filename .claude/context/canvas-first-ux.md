## Canvas-First UX & Deferred Persistence

### Philosophy

Craftbase uses a "zero friction to creation" UX pattern. Users land directly on an empty infinite canvas at `/` — no home page gate, no sign-up, no board creation step before drawing.

### Dual-Mode Board: `isPersisted`

The board view (`src/views/Board/board.js`) operates in two modes controlled by a boolean `isPersisted` state:

**Local mode (`isPersisted = false`)** — when user is on `/`:

- All drawing state lives in React state (`componentStore`) + localStorage only
- No GraphQL queries or mutations fire
- An `isPersistedRef` ref mirrors the state for closure safety in mutation wrapper functions

**Persisted mode (`isPersisted = true`)** — when user is on `/board/:id`:

- Standard behavior: components query fires, all mutations sync to DB
- This is the mode after sharing, or when visiting an existing board URL

Detection is based on URL: `boardIdFromUrl = routeParams.id`. If present → persisted mode. If absent → local mode with a client-generated UUID (`localBoardId`).

### Background Board Creation (on first draw)

When the user draws their first element, `ensureBackgroundBoard()` fires in the background (non-blocking):

1. Creates an anonymous user if needed (stores `userId` in localStorage)
2. Calls `CREATE_BOARD` mutation → gets server board ID
3. Stores the ID in `backgroundBoardIdRef` + `backgroundBoardId` state + localStorage key `craftbase_background_board_id`

This is idempotent — guarded by ref checks, only runs once. The board exists in DB but the user stays on `/`. This approach means "number of boards in DB === number of users who interacted at least once" — useful for analytics.

### Share Flow (persistence trigger)

When the user clicks the Share button (`src/components/sidebar/shareLinkPopup.js`):

1. **No background board ID yet (empty canvas):** Modal shows "Nothing to share yet — please create something on the board first" with an "Okay" button
2. **Background board ID exists (user has drawn):** Confirmation modal shows the real shareable URL (`/board/{backgroundBoardId}`) and asks to proceed
3. **User confirms:** `persistBoard()` fires:
    - Uses the already-created background board ID (skips board creation)
    - Bulk-inserts all components via `INSERT_BULK_COMPONENTS` mutation
    - Updates local component store with server board ID
    - Sets `isPersisted = true`
    - Navigates to `/board/{id}` via `navigate(..., { replace: true })`
    - Clears localStorage draft and background board ID
4. **Already persisted:** Existing behavior — shows URL popup with copy button, no modal

### Mutation Gating

All four mutation wrapper functions in board.js gate their GraphQL calls behind `isPersistedRef.current`:

- `addToLocalComponentStore` → gates `insertComponent()`
- `updateComponentBulkPropertiesInLocalStore` → gates `updateComponentInfo()`
- `updateComponentVerticesInLocalStore` → gates `updateComponentInfo()`
- `deleteComponentFromLocalStore` → gates `deleteComponent()`
- `undoLastAction` → gates all mutation calls within each action branch (ADD, DELETE, UPDATE_VERTICES, UPDATE_BULK)

Local React state updates are unaffected — drawing works identically in both modes.

### localStorage Draft Persistence

**Key:** `craftbase_local_draft`

In local mode, `componentStore` is saved to localStorage on every change (debounced 500ms). The draft includes a `timestamp` for expiry checks.

**On mount (local mode):**

- Restores `craftbase_background_board_id` to state/ref if present
- Restores draft from `craftbase_local_draft` if it exists and is less than 30 days old
- Drafts older than 30 days are silently discarded

**Single draft model:** User is always tied to one local draft on `/` (infinite canvas philosophy). No "new canvas" option in local mode.

**Storage limit (QuotaExceededError):**

- Caught via try/catch on `localStorage.setItem`
- Auto-persists the board to DB
- Shows a modal with two options:
    1. "Start New Canvas" — clears localStorage, stays on `/`
    2. "Continue on Saved Board" — navigates to `/board/{id}`

### Routing

| Route        | Renders                 | Mode                      |
| ------------ | ----------------------- | ------------------------- |
| `/`          | `BoardViewContainer`    | Local mode (empty canvas) |
| `/board/:id` | `BoardViewContainer`    | Persisted mode            |
| `/home`      | `HomePageViewContainer` | Marketing/landing page    |

Defined in `src/routes.js`, wired in `src/App.js`.

### localStorage Keys (board-related)

| Key                             | Purpose                                  | Lifetime                         |
| ------------------------------- | ---------------------------------------- | -------------------------------- |
| `craftbase_local_draft`         | Draft componentStore + timestamp         | Until share or 30-day expiry     |
| `craftbase_background_board_id` | Server board ID from background creation | Until share (cleared on persist) |
| `userId`                        | Anonymous user ID                        | Permanent                        |
| `lastOpenBoard`                 | Last visited board ID                    | Permanent                        |

### BoardContext Additions

The following were added to `contextValueForSidebar`:

- `boardId` — resolved board ID (URL param or local UUID)
- `isPersisted` — whether board is in persisted mode
- `persistBoard` — async function to persist board to DB
- `backgroundBoardId` — server board ID from background creation (null if user hasn't drawn yet)

### Important Notes

- The `useEffect` that resets `componentStore` on `boardId` change uses `prevBoardIdRef` to skip the initial mount — otherwise it would wipe the restored draft
- User creation and revisit count updates only run in persisted mode (`isPersisted` guard in useEffect)
- The sidebar (`src/components/sidebar/primary.js`) reads `boardId` from context instead of `routeParams.id`
- "Create Board" button only shows in persisted mode as "New Canvas" (navigates to `/`)
- `newCanvas.js` resets `scenario` to `SCENARIO_DEFAULT` at the start of every mousedown and cleans up orphaned draw state to prevent crashes when mouse is released outside the canvas
