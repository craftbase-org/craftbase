import { test, expect } from '@playwright/test'
import {
    setupLocalBoard,
    drawShape,
    drawRectangle,
    addTextToRectangle,
    getCanvasBox,
} from './helpers/index.js'

// All shapes are drawn in the lower-right quadrant (65% from left, 60% from top)
// to stay clear of the top toolbar and the Defaults panel on the left.
function safeArea(box) {
    const cx = box.x + box.width * 0.65
    const cy = box.y + box.height * 0.60
    return { cx, cy }
}

test.describe('Copy-paste', () => {
    test.beforeEach(async ({ page }) => {
        await setupLocalBoard(page)
    })

    /**
     * Regression: pasting a rectangle-with-text produced a rectangle with no text.
     *
     * Root cause: group.elementData (read by the copy handler) is set at component
     * mount and never re-synced when metadata.textContent is updated via double-click
     * editing. The copy handler reads stale metadata, so the clone has no text.
     */
    test('pasted rectangle-with-text preserves original text content', async ({
        page,
    }) => {
        const box = await getCanvasBox(page)
        const { cx, cy } = safeArea(box)

        const rectHandle = await drawRectangle(page, {
            startX: cx - 100,
            startY: cy - 60,
            endX: cx + 100,
            endY: cy + 60,
        })

        const TEXT = 'Hello Craftbase'
        await addTextToRectangle(page, rectHandle, TEXT)

        // Click the rectangle to select it
        const rectBox = await rectHandle.boundingBox()
        await page.mouse.click(
            rectBox.x + rectBox.width / 2,
            rectBox.y + rectBox.height / 2
        )

        await page.keyboard.press('Meta+c')

        // Move mouse to an empty area to the left before pasting
        await page.mouse.move(cx - 300, cy)
        await page.keyboard.press('Meta+v')

        await page.waitForFunction(
            () => document.querySelectorAll('[data-component-id]').length >= 2,
            { timeout: 5_000 }
        )

        const originalId = await rectHandle.getAttribute('id')
        const allGroups = await page.$$('[data-component-id]')
        let pastedHandle = null
        for (const group of allGroups) {
            const id = await group.getAttribute('id')
            if (id !== originalId) {
                pastedHandle = group
                break
            }
        }
        expect(pastedHandle).not.toBeNull()

        // The pasted rectangle must contain a <text> SVG node with the original text
        const pastedText = await pastedHandle.$eval('text', (el) => el.textContent)
        expect(pastedText).toBe(TEXT)
    })

    test('pasting a plain rectangle (no text) produces a rectangle with no text node', async ({
        page,
    }) => {
        const box = await getCanvasBox(page)
        const { cx, cy } = safeArea(box)

        const rectHandle = await drawRectangle(page, {
            startX: cx - 100,
            startY: cy - 60,
            endX: cx + 100,
            endY: cy + 60,
        })

        const rectBox = await rectHandle.boundingBox()
        await page.mouse.click(
            rectBox.x + rectBox.width / 2,
            rectBox.y + rectBox.height / 2
        )
        await page.keyboard.press('Meta+c')
        await page.mouse.move(cx - 300, cy)
        await page.keyboard.press('Meta+v')

        await page.waitForFunction(
            () => document.querySelectorAll('[data-component-id]').length >= 2,
            { timeout: 5_000 }
        )

        const originalId = await rectHandle.getAttribute('id')
        const allGroups = await page.$$('[data-component-id]')
        let pastedHandle = null
        for (const group of allGroups) {
            const id = await group.getAttribute('id')
            if (id !== originalId) {
                pastedHandle = group
                break
            }
        }
        expect(pastedHandle).not.toBeNull()

        // No text node expected on a plain rectangle
        const textNode = await pastedHandle.$('text')
        expect(textNode).toBeNull()
    })

    test('pasting a circle preserves fill color', async ({ page }) => {
        const box = await getCanvasBox(page)
        const { cx, cy } = safeArea(box)

        const circleHandle = await drawShape(page, 'circle', {
            startX: cx - 60,
            startY: cy - 60,
            endX: cx + 60,
            endY: cy + 60,
        })

        const originalFill = await circleHandle.$eval(
            'ellipse, path, circle',
            (el) => el.getAttribute('fill')
        )

        const circleBox = await circleHandle.boundingBox()
        await page.mouse.click(
            circleBox.x + circleBox.width / 2,
            circleBox.y + circleBox.height / 2
        )
        await page.keyboard.press('Meta+c')
        await page.mouse.move(cx - 300, cy)
        await page.keyboard.press('Meta+v')

        await page.waitForFunction(
            () => document.querySelectorAll('[data-component-id]').length >= 2,
            { timeout: 5_000 }
        )

        const originalId = await circleHandle.getAttribute('id')
        const allGroups = await page.$$('[data-component-id]')
        let pastedHandle = null
        for (const group of allGroups) {
            const id = await group.getAttribute('id')
            if (id !== originalId) {
                pastedHandle = group
                break
            }
        }
        expect(pastedHandle).not.toBeNull()

        const pastedFill = await pastedHandle.$eval(
            'ellipse, path, circle',
            (el) => el.getAttribute('fill')
        )
        expect(pastedFill).toBe(originalFill)
    })

    /**
     * Regression: copy-paste does not preserve a fill that was changed via the
     * floating toolbar's Background color picker. The pasted clone reverts to
     * the default fill instead of the user-applied color.
     *
     * Flow exercised:
     *   1. Draw circle (default fill #f4f4f2)
     *   2. Click circle → floating toolbar opens
     *   3. Click #FFAB00 swatch in Background section → fill updated in store
     *   4. Cmd+C → Cmd+V on empty area
     *   5. Pasted circle's <ellipse> fill should be #FFAB00, not the default
     */
    test('pasting a circle with user-modified fill preserves the new fill', async ({
        page,
    }) => {
        const NEW_FILL = '#FFAB00'

        const box = await getCanvasBox(page)
        const { cx, cy } = safeArea(box)

        const circleHandle = await drawShape(page, 'circle', {
            startX: cx - 60,
            startY: cy - 60,
            endX: cx + 60,
            endY: cy + 60,
        })

        // Select the circle so the floating toolbar opens
        const circleBox = await circleHandle.boundingBox()
        await page.mouse.click(
            circleBox.x + circleBox.width / 2,
            circleBox.y + circleBox.height / 2
        )

        // Each ColorPicker section in the floating toolbar wraps its picker
        // in a div with data-section ("fill" | "stroke" | "textColor").
        // Scope to data-section="fill" so we don't accidentally click the
        // matching swatch in the Stroke or Text picker.
        const swatch = page.locator(
            `#floating-toolbar [data-section="fill"] [title="${NEW_FILL}"]`
        )
        await swatch.first().click()

        // Wait until the original circle's <ellipse> fill reflects the new color
        const originalId = await circleHandle.getAttribute('id')
        await page.waitForFunction(
            ({ id, color }) => {
                const node = document
                    .getElementById(id)
                    ?.querySelector('ellipse, path, circle')
                return node?.getAttribute('fill') === color
            },
            { id: originalId, color: NEW_FILL },
            { timeout: 5_000 }
        )

        // Click off the shape to deselect, so Cmd+V pastes via the canvas
        // copy/paste handler rather than into a focused toolbar input.
        await page.mouse.click(cx - 350, cy)

        // Re-select the circle (deselect cleared it) and copy
        await page.mouse.click(
            circleBox.x + circleBox.width / 2,
            circleBox.y + circleBox.height / 2
        )
        await page.keyboard.press('Meta+c')

        await page.mouse.move(cx - 300, cy)
        await page.keyboard.press('Meta+v')

        await page.waitForFunction(
            () => document.querySelectorAll('[data-component-id]').length >= 2,
            { timeout: 5_000 }
        )

        const allGroups = await page.$$('[data-component-id]')
        let pastedHandle = null
        for (const group of allGroups) {
            const id = await group.getAttribute('id')
            if (id !== originalId) {
                pastedHandle = group
                break
            }
        }
        expect(pastedHandle).not.toBeNull()

        const pastedFill = await pastedHandle.$eval(
            'ellipse, path, circle',
            (el) => el.getAttribute('fill')
        )
        expect(pastedFill).toBe(NEW_FILL)
    })
})
