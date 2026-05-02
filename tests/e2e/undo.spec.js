import { test, expect } from '@playwright/test'
import {
    setupLocalBoard,
    drawRectangle,
    drawShape,
    drawArrow,
    drawPencilStroke,
    placeText,
    triggerUndoKeyboard,
    clickUndoButton,
    getDraftComponents,
} from './helpers/index.js'

const ANCHOR_COORDS = { startX: 600, startY: 200, endX: 720, endY: 280 }
const RECT_COORDS = { startX: 300, startY: 200, endX: 460, endY: 320 }
const CIRCLE_COORDS = { startX: 300, startY: 200, endX: 420, endY: 320 }
const ARROW_COORDS = { startX: 280, startY: 220, endX: 520, endY: 220 }
const PENCIL_COORDS = { startX: 280, startY: 220, endX: 520, endY: 360 }
const TEXT_COORDS = { x: 360, y: 280 }

const SHAPES = [
    { name: 'rectangle', draw: (page) => drawRectangle(page, RECT_COORDS) },
    { name: 'circle', draw: (page) => drawShape(page, 'circle', CIRCLE_COORDS) },
    { name: 'arrow', draw: (page) => drawArrow(page, ARROW_COORDS) },
    { name: 'pencil', draw: (page) => drawPencilStroke(page, PENCIL_COORDS) },
    { name: 'text', draw: (page) => placeText(page, TEXT_COORDS) },
]

// useLocalDraftPersistence debounces writes by 500ms. Wait long enough that the
// post-create draft has flushed before asserting it contains the new id.
const DRAFT_DEBOUNCE_MS = 700

async function waitForIdRemovedFromDraft(page, id) {
    await page.waitForFunction(
        (cid) => {
            const raw = localStorage.getItem('craftbase_local_draft')
            if (!raw) return true
            const draft = JSON.parse(raw)
            return !draft.components || !draft.components[cid]
        },
        id,
        { timeout: 3_000 }
    )
}

// Text creation records two history entries: ADD (handleTextElement on toolbar
// click) and UPDATE_VERTICES (SCENARIO_TEXT_DRAW positioning the element from
// its off-screen seed coords to where the user clicked). One undo only reverts
// the position update; a second undo pops the ADD and removes the element.
const TEXT_UNDO_COUNT = 2

test.describe('Undo (local mode, keyboard Cmd/Ctrl+Z)', () => {
    for (const { name, draw } of SHAPES) {
        test(`removes ${name} from DOM and localStorage draft`, async ({
            page,
        }) => {
            await setupLocalBoard(page)

            // Anchor rectangle: keeps the component store non-empty after the
            // undo so the debounced localStorage save fires
            // (useLocalDraftPersistence skips saves on an empty store).
            const anchor = await drawRectangle(page, ANCHOR_COORDS)
            const anchorId = await anchor.getAttribute('data-component-id')

            const handle = await draw(page)
            const id = await handle.getAttribute('data-component-id')
            expect(id).toBeTruthy()
            expect(id).not.toBe(anchorId)

            await expect(page.locator('[data-component-id]')).toHaveCount(2)

            await page.waitForTimeout(DRAFT_DEBOUNCE_MS)
            const draftBefore = await getDraftComponents(page)
            expect(draftBefore?.[id]).toBeTruthy()
            expect(draftBefore?.[anchorId]).toBeTruthy()

            const undoPresses = name === 'text' ? TEXT_UNDO_COUNT : 1
            for (let i = 0; i < undoPresses; i++) {
                await triggerUndoKeyboard(page)
            }

            await expect(page.locator('[data-component-id]')).toHaveCount(1)
            await waitForIdRemovedFromDraft(page, id)

            const draftAfter = await getDraftComponents(page)
            expect(draftAfter?.[anchorId]).toBeTruthy()
        })
    }
})

test('Undo button removes the last drawn rectangle', async ({ page }) => {
    await setupLocalBoard(page)

    const anchor = await drawRectangle(page, ANCHOR_COORDS)
    const anchorId = await anchor.getAttribute('data-component-id')

    const handle = await drawRectangle(page, RECT_COORDS)
    const id = await handle.getAttribute('data-component-id')

    await expect(page.locator('[data-component-id]')).toHaveCount(2)

    await page.waitForTimeout(DRAFT_DEBOUNCE_MS)
    const draftBefore = await getDraftComponents(page)
    expect(draftBefore?.[id]).toBeTruthy()
    expect(draftBefore?.[anchorId]).toBeTruthy()

    await clickUndoButton(page)

    await expect(page.locator('[data-component-id]')).toHaveCount(1)
    await waitForIdRemovedFromDraft(page, id)

    const draftAfter = await getDraftComponents(page)
    expect(draftAfter?.[anchorId]).toBeTruthy()
})
