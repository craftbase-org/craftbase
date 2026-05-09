// Mock responses keyed by GraphQL operation name.
// Apollo writes each field it requested into its cache; returning {} causes a
// "Missing field" cache error and can crash components that consume the data.
// Values mirror the components."componentType" seed rows.
const GQL_MOCK_RESPONSES = {
    getComponentTypes: {
        componentTypes: [
            { label: 'rectangle', width: 120, height: 120, fill: '#f4f4f2', textColor: '#000', metadata: {}, logo: null },
            { label: 'circle', width: 120, height: 120, fill: '#f4f4f2', textColor: '#000', metadata: {}, logo: null },
            { label: 'newText', width: 120, height: 120, fill: '#f4f4f2', textColor: '#000', metadata: { content: 'Your text here' }, logo: null },
            { label: 'text', width: 120, height: 120, fill: '#f4f4f2', textColor: '#000', metadata: { content: 'Your text here' }, logo: null },
            { label: 'arrowLine', width: 120, height: 120, fill: '#f4f4f2', textColor: '#000', metadata: {}, logo: null },
            { label: 'pencil', width: 120, height: 120, fill: '#f4f4f2', textColor: '#f4f4f2', metadata: [{}], logo: null },
        ],
    },
    // Revisit-count mutation — return a minimal valid shape so Apollo doesn't error
    updateUserRevisitCount: {
        update_users_user_revisits_by_pk: { count: 1, user_id: 'test-user-id' },
    },
}

/**
 * Sets userId in localStorage and mocks the GraphQL HTTP endpoint before the
 * page loads. Without the userId, AppInit would call insertUser and block
 * rendering. Without proper mock data, Apollo logs cache errors that can
 * crash sidebar components and break canvas interactions.
 */
export async function setupLocalBoard(page) {
    await page.route('**/v1/graphql', async (route) => {
        let responseData = {}
        try {
            const body = JSON.parse(route.request().postData() || '{}')
            responseData = GQL_MOCK_RESPONSES[body.operationName] ?? {}
        } catch (_) {}
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: responseData }),
        })
    })

    await page.addInitScript(() => {
        localStorage.setItem('userId', 'test-user-id')
    })

    await page.goto('/')
    await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
}

/**
 * Returns the bounding box of the canvas SVG. The `#main-two-root` div itself
 * has height 0 because the Two.js SVG is absolutely positioned, so callers
 * MUST measure off the SVG, not the wrapper div.
 */
export async function getCanvasBox(page) {
    return page.locator('#main-two-root svg').boundingBox()
}

// Toolbar aria-labels used to dispatch a draw mode (see staticPrimaryElementData).
const SHAPE_TOOLBAR_LABEL = {
    rectangle: 'Rectangle / Square',
    circle: 'Circle',
    diamond: 'Diamond',
}

/**
 * Draws a draw-to-place shape (rectangle or circle) on the canvas.
 *
 * Mirrors Path A in tests/workflows/how_shape_gets_drawn.md and crucially goes
 * through the real toolbar click — primary.js writes pendingShapeProps using
 * the live React state (defaultLinewidth, defaultStrokeType, fill from
 * getComponentTypesData), which is what production does. Bypassing the toolbar
 * with hardcoded props would mask any test that depends on those defaults
 * (e.g. the default-stroke-width tests).
 *
 * startX/Y and endX/Y are viewport coordinates. Keep them clear of the top
 * toolbar (~y < 60) and the Defaults panel (~x < 160).
 *
 * Returns an ElementHandle for the resulting SVG group element.
 */
export async function drawShape(page, type, { startX, startY, endX, endY }) {
    const ariaLabel = SHAPE_TOOLBAR_LABEL[type]
    if (!ariaLabel) throw new Error(`Unknown shape type: ${type}`)

    const countBefore = await page.$$eval(
        '[data-component-id]',
        (els) => els.length
    )

    // On mobile, Rectangle/Circle/Diamond live inside a "Shapes" drawer that
    // must be opened first; on desktop they're flattened to top-level buttons
    // (see flattenShapesForDesktop in shapesToolbar.js) and the drawer parent
    // never renders. Click the drawer only if it exists.
    const shapesDrawer = await page.$('[aria-label="Shapes"]')
    if (shapesDrawer) await shapesDrawer.click()
    await page.click(`[aria-label="${ariaLabel}"]`)

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(endX, endY, { steps: 10 })
    await page.mouse.up()

    return waitForNewElement(page, countBefore)
}

/**
 * Convenience wrapper for drawing a rectangle.
 */
export async function drawRectangle(page, coords) {
    return drawShape(page, 'rectangle', coords)
}

/**
 * Waits for one new [data-component-id] element to appear (relative to a
 * pre-action count), then returns the most recently added one. Used by the
 * shape-creation helpers that go through the actual toolbar click.
 */
async function waitForNewElement(page, countBefore, { timeout = 5_000 } = {}) {
    await page.waitForFunction(
        (before) =>
            document.querySelectorAll('[data-component-id]').length > before,
        countBefore,
        { timeout }
    )
    const all = await page.$$('[data-component-id]')
    return all[all.length - 1]
}

/**
 * Click the toolbar icon for the given aria-label and wait for the icon's
 * parent button to take its `bg-accent` active state — this confirms
 * setCurrentElementInBoard fired and the corresponding draw mode is armed.
 */
async function clickToolbarShape(page, ariaLabel) {
    await page.click(`[aria-label="${ariaLabel}"]`)
}

// Maps a STROKE_WIDTHS label (see STROKE_WIDTHS in
// src/components/sidebar/elementProperties.js) to the 1-based index of its
// button inside #stroke-width-section.
const STROKE_WIDTH_INDEX_BY_LABEL = { '0': 1, '2': 2, '4': 3, '6': 4 }

/**
 * Clicks the unified element-properties toolbar's Stroke Width button matching
 * the given label ('0' | '2' | '4' | '6'). The buttons are unlabeled visual
 * swatches, so we pick by position within #stroke-width-section. The currently
 * active "set" determines which default is updated:
 *   - SHAPE / ARROW / RECT_WITH_TEXT (idle or shape/arrow draw mode) → defaultLinewidth
 *   - PENCIL (pencil mode active)                                    → pencilDefaultLinewidth
 * Callers who need the pencil default must enter pencil mode first via
 * `clickToolbarButton(page, 'Pencil')`.
 */
export async function setDefaultStrokeWidth(page, label) {
    const idx = STROKE_WIDTH_INDEX_BY_LABEL[label]
    if (!idx)
        throw new Error(
            `Unknown stroke width label: ${label}. Valid: 0, 2, 4, 6.`
        )
    await page.click(`#stroke-width-section button:nth-of-type(${idx})`)
}

/**
 * Clicks any top-level toolbar button by aria-label (e.g. "Pencil", "Pointer",
 * "Eraser"). Used by tests that need to switch the active draw mode so the
 * unified properties toolbar swaps to the matching set before tweaking a
 * default.
 */
export async function clickToolbarButton(page, ariaLabel) {
    await page.click(`[aria-label="${ariaLabel}"]`)
}

/**
 * Draws an arrow on the canvas (Path: arrowDrawMode in workflows doc).
 *   1. Click toolbar Arrow → handleArrowElement adds an arrowLine component
 *      immediately (off-screen at its random x/y) and sets arrowDrawMode.
 *   2. mousedown picks SCENARIO_ARROW_DRAW and positions the element at the
 *      click point.
 *   3. mousemove updates the second endpoint; mouseup finalizes.
 *
 * Returns the arrow's SVG group element handle.
 */
export async function drawArrow(page, { startX, startY, endX, endY }) {
    const countBefore = await page.$$eval(
        '[data-component-id]',
        (els) => els.length
    )

    await clickToolbarShape(page, 'Arrow')

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(endX, endY, { steps: 10 })
    await page.mouse.up()

    return waitForNewElement(page, countBefore)
}

/**
 * Draws a pencil stroke. Pencil mode requires at least 2 raw points to commit
 * a stroke (see SCENARIO_PENCIL_MODE mouseup), so we feed multiple intermediate
 * mouse positions on the way to (endX, endY).
 *
 * Returns the pencil stroke's SVG group element handle.
 */
export async function drawPencilStroke(page, { startX, startY, endX, endY }) {
    const countBefore = await page.$$eval(
        '[data-component-id]',
        (els) => els.length
    )

    await clickToolbarShape(page, 'Pencil')

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    // 20 small steps gives the velocity-based stroke logic enough samples to
    // accept the path as a real stroke.
    await page.mouse.move(endX, endY, { steps: 20 })
    await page.mouse.up()

    return waitForNewElement(page, countBefore)
}

/**
 * Places a text element at (x, y) (Path: textDrawMode).
 *   1. Click toolbar Text → handleTextElement adds a newText component
 *      off-screen and sets textDrawMode.
 *   2. mousedown picks SCENARIO_TEXT_DRAW and positions the element at the
 *      click point.
 *   3. mouseup dispatches the triggerTextInput event (we don't need to type
 *      anything for a smoke test — the element exists in the canvas).
 *
 * Returns the text element's SVG group element handle.
 */
export async function placeText(page, { x, y }) {
    const countBefore = await page.$$eval(
        '[data-component-id]',
        (els) => els.length
    )

    await clickToolbarShape(page, 'Text')

    // The element mounts off-screen on toolbar click; wait for it to show up
    // before dispatching mousedown so SCENARIO_TEXT_DRAW finds it in the scene.
    await waitForNewElement(page, countBefore)

    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.up()

    const all = await page.$$('[data-component-id]')
    return all[all.length - 1]
}

/**
 * Double-clicks a rectangle to open the text input overlay, types the given
 * text, then presses Tab to commit it. Waits until the SVG <text> node appears
 * inside the rectangle group (confirming the text was saved to the store).
 */
/**
 * Reads the localStorage draft and returns the components map (or null if no
 * draft exists). The draft is written by useLocalDraftPersistence with a 500ms
 * debounce, so callers must wait for the debounced flush before reading.
 */
export async function getDraftComponents(page) {
    return page.evaluate(() => {
        const raw = localStorage.getItem('craftbase_local_draft')
        if (!raw) return null
        return JSON.parse(raw).components || {}
    })
}

/**
 * Triggers the undo keyboard shortcut. The handler in newCanvas.js accepts
 * either ctrlKey or metaKey, so Meta+z works on Linux/CI as well as Mac.
 */
export async function triggerUndoKeyboard(page) {
    await page.keyboard.press('Meta+z')
}

/**
 * Clicks the Undo button in the shapes toolbar. The button is a div carrying
 * title="Undo"; the inner SVG also has aria-label="Undo".
 */
export async function clickUndoButton(page) {
    await page.click('[title="Undo"]')
}

/**
 * Triggers redo via keyboard. Cmd/Ctrl+Shift+Z is the redo shortcut; the
 * handler in newCanvas.js accepts either ctrlKey or metaKey alongside shiftKey.
 */
export async function triggerRedoKeyboard(page) {
    await page.keyboard.press('Meta+Shift+z')
}

/**
 * Clicks the Redo button in the shapes toolbar (title="Redo").
 */
export async function clickRedoButton(page) {
    await page.click('[title="Redo"]')
}

/**
 * Switches the toolbar to select/pan (Pointer) mode. Clears any draw-mode
 * flags left over by drawArrow/drawPencilStroke/placeText (they each set
 * localStorage flags during their flow), so the next mousedown on empty canvas
 * is interpreted as the start of a marquee group selection.
 */
export async function clickPointerTool(page) {
    await page.click('[aria-label="Pointer"]')
}

/**
 * Drags an empty marquee rectangle on the canvas (Path: isGroupSelector branch
 * in src/newCanvas.js). Caller must already be in select/pan mode and the
 * (startX, startY) point must land on empty canvas. On mouseup, newCanvas calls
 * setOnGroupHandler which builds a groupobject from any element whose stored
 * (x, y) falls inside the marquee bounds.
 *
 * Returns the ElementHandle for the new groupobject SVG group, identified by
 * data-label="groupobject_coord" set in groupobject.js after Two.js mounts it.
 */
export async function dragSelectArea(
    page,
    { startX, startY, endX, endY },
    { timeout = 5_000 } = {}
) {
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(endX, endY, { steps: 10 })
    await page.mouse.up()

    await page.waitForSelector('[data-label="groupobject_coord"]', { timeout })
    return page.$('[data-label="groupobject_coord"]')
}

export async function addTextToRectangle(page, rectHandle, text) {
    const box = await rectHandle.boundingBox()
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    await page.mouse.dblclick(cx, cy)
    await page.waitForSelector('.temp-input-area', { timeout: 5_000 })
    await page.fill('.temp-input-area', text)
    await page.keyboard.press('Tab')

    // Wait for the Two.js <text> SVG node to appear inside the shape group
    const groupId = await rectHandle.getAttribute('id')
    await page.waitForFunction(
        (id) => document.getElementById(id)?.querySelector('text') !== null,
        groupId,
        { timeout: 5_000 }
    )
}
