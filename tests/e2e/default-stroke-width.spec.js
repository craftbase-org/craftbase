import { test, expect } from '@playwright/test'
import {
    setupLocalBoard,
    drawShape,
    drawArrow,
    drawPencilStroke,
    setDefaultStrokeWidth,
    clickToolbarButton,
    getCanvasBox,
} from './helpers/index.js'

// The Defaults panel's Stroke Width labels (see src/components/sidebar/defaults.js)
// map 1:1 to the linewidth value stored on the drawn component.
const DEFAULT_LABEL = '4'
const EXPECTED_LINEWIDTH = '4'

/**
 * Each shape component stamps `data-linewidth` on its SVG group at mount
 * (alongside `data-component-id`). We assert against this attribute rather
 * than the rendered `stroke-width`: pencil's per-path stroke-width is
 * velocity-modulated (see velocityToLinewidth in utils/pencilHelper.js), so
 * the SVG attr won't equal the chosen base. The component-level linewidth
 * field, however, is exactly the user-selected default — that's what we test.
 */
async function getLinewidth(handle) {
    return handle.getAttribute('data-linewidth')
}

test.describe('Default stroke width applies to drawn shapes', () => {
    test.beforeEach(async ({ page }) => {
        await setupLocalBoard(page)
    })

    test('drawn rectangle uses default stroke width', async ({ page }) => {
        // Idle (no draw mode active) shows the SHAPE set, so clicking the
        // stroke-width swatch updates `defaultLinewidth`.
        await setDefaultStrokeWidth(page, DEFAULT_LABEL)
        const box = await getCanvasBox(page)
        const cx = box.x + box.width * 0.65
        const cy = box.y + box.height * 0.65

        const handle = await drawShape(page, 'rectangle', {
            startX: cx - 80,
            startY: cy - 50,
            endX: cx + 80,
            endY: cy + 50,
        })

        expect(await getLinewidth(handle)).toBe(EXPECTED_LINEWIDTH)
    })

    test('drawn circle uses default stroke width', async ({ page }) => {
        await setDefaultStrokeWidth(page, DEFAULT_LABEL)
        const box = await getCanvasBox(page)
        const cx = box.x + box.width * 0.65
        const cy = box.y + box.height * 0.65

        const handle = await drawShape(page, 'circle', {
            startX: cx - 60,
            startY: cy - 60,
            endX: cx + 60,
            endY: cy + 60,
        })

        expect(await getLinewidth(handle)).toBe(EXPECTED_LINEWIDTH)
    })

    test('drawn arrow uses default stroke width', async ({ page }) => {
        // Arrows read the same `defaultLinewidth` as shapes (see
        // primary.js:handleArrowElement), so setting it from the idle
        // SHAPE set is sufficient.
        await setDefaultStrokeWidth(page, DEFAULT_LABEL)
        const box = await getCanvasBox(page)
        const cx = box.x + box.width * 0.65
        const cy = box.y + box.height * 0.65

        const handle = await drawArrow(page, {
            startX: cx - 100,
            startY: cy,
            endX: cx + 100,
            endY: cy,
        })

        expect(await getLinewidth(handle)).toBe(EXPECTED_LINEWIDTH)
    })

    test('drawn pencil stroke uses default stroke width', async ({ page }) => {
        // Pencil keeps its own `pencilDefaultLinewidth`, separate from the
        // shape default (so a thick-dashed rectangle doesn't bleed into the
        // next pencil stroke). The unified toolbar reflects the PENCIL set
        // only while pencil mode is active — enter it first, then click the
        // stroke-width swatch.
        await clickToolbarButton(page, 'Pencil')
        await setDefaultStrokeWidth(page, DEFAULT_LABEL)

        const box = await getCanvasBox(page)
        const cx = box.x + box.width * 0.65
        const cy = box.y + box.height * 0.65

        const handle = await drawPencilStroke(page, {
            startX: cx - 80,
            startY: cy - 30,
            endX: cx + 80,
            endY: cy + 30,
        })

        expect(await getLinewidth(handle)).toBe(EXPECTED_LINEWIDTH)
    })
})
