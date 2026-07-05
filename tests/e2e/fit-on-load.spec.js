import { test, expect } from './helpers/test.js'

// Verifies the fallback zoom-to-fit on board load:
//  - On /board/:id opened with no seeded/saved viewport, content drawn far from
//    origin is framed into view (fixes "had to zoom out to find it").
//  - On / (local board) the fallback must NOT fire.

const BOARD_ID = '11111111-1111-1111-1111-111111111111'

// Two rectangles placed far from the origin (well outside a default 1280x800
// viewport at scale 1). Without the fit fallback these render off-screen.
const FAR_COMPONENTS = [
    {
        id: '22222222-2222-2222-2222-222222222222',
        componentType: 'rectangle',
        objectClass: null,
        children: null,
        metadata: {},
        x: 4000, x1: 100, x2: 400, y: 3000, y1: 100, y2: 100,
        fill: '#f4f4f2', width: 200, height: 150,
        iconStroke: null, stroke: '#000', linewidth: 2, strokeType: null,
        textColor: '#000', opacity: 1, position: 0,
        tailShapeId: null, tailEdge: null, headShapeId: null, headEdge: null,
        tailPortIndex: null, headPortIndex: null,
    },
    {
        id: '33333333-3333-3333-3333-333333333333',
        componentType: 'rectangle',
        objectClass: null,
        children: null,
        metadata: {},
        x: 7000, x1: 100, x2: 400, y: 5000, y1: 100, y2: 100,
        fill: '#f4f4f2', width: 200, height: 150,
        iconStroke: null, stroke: '#000', linewidth: 2, strokeType: null,
        textColor: '#000', opacity: 1, position: 1,
        tailShapeId: null, tailEdge: null, headShapeId: null, headEdge: null,
        tailPortIndex: null, headPortIndex: null,
    },
]

const MOCKS = {
    getComponentTypes: {
        componentTypes: [
            { label: 'rectangle', width: 120, height: 120, fill: '#f4f4f2', textColor: '#000', metadata: {}, logo: null },
        ],
    },
    updateUserRevisitCount: {
        update_users_user_revisits_by_pk: { count: 1, user_id: 'test-user-id' },
    },
    getComponentsForBoard: { components: FAR_COMPONENTS },
}

const mockGraphql = async (page) => {
    await page.route('**/v1/graphql', async (route) => {
        let data = {}
        try {
            const body = JSON.parse(route.request().postData() || '{}')
            data = MOCKS[body.operationName] ?? {}
        } catch (_) {}
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data }),
        })
    })
    await page.addInitScript(() => {
        localStorage.setItem('userId', 'test-user-id')
        localStorage.setItem('craftbase_welcome_dismissed', '1')
    })
}

const sceneScale = (page) =>
    page.evaluate(() => {
        const g = document
            .getElementById('main-two-root')
            ?.querySelector('svg > g')
        const m = (g?.getAttribute('transform') || '').match(/matrix\(([^)]+)\)/)
        if (!m) return null
        return m[1].split(/[ ,]+/).map(Number)[0]
    })

test.describe('Fit-to-content on board load', () => {
    test('frames far-away content when opening /board/:id', async ({ page }) => {
        await mockGraphql(page)
        await page.goto(`/board/${BOARD_ID}`)
        await page.waitForSelector('#main-two-root svg')
        // Elements mount, then the fit poll settles and frames them.
        await expect(page.locator('[data-component-id]')).toHaveCount(2)

        // The fit must bring at least one element inside the viewport.
        await expect
            .poll(
                async () => {
                    const box = await page
                        .locator('[data-component-id]')
                        .first()
                        .boundingBox()
                    if (!box) return false
                    const vw = page.viewportSize().width
                    const vh = page.viewportSize().height
                    // Any part of the element overlaps the viewport rectangle.
                    return (
                        box.x < vw &&
                        box.y < vh &&
                        box.x + box.width > 0 &&
                        box.y + box.height > 0
                    )
                },
                { timeout: 8000 }
            )
            .toBe(true)

        // And the camera actually zoomed out (fit scale < default 1).
        const scale = await sceneScale(page)
        expect(scale).not.toBeNull()
        expect(scale).toBeLessThan(0.99)
    })

    test('does NOT fire on / (local board)', async ({ page }) => {
        await mockGraphql(page)
        await page.goto('/')
        await page.waitForSelector('#main-two-root svg')
        await page.waitForTimeout(6000)
        // Default camera untouched — scale stays at 1.
        const scale = await sceneScale(page)
        expect(scale).not.toBeNull()
        expect(Math.abs(scale - 1)).toBeLessThan(0.01)
    })
})
