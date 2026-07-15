/**
 * Batched Two.js render scheduler.
 *
 * `two.update()` is O(scene size): the SVG renderer walks every child on each
 * call. Element components each called it directly in their mount effects, so
 * mounting N elements in one React commit cost N full-scene renders — O(N²) in
 * a single synchronous task. At ~2.4k elements that's a ~10s block, which is
 * exactly what trips Chrome's "Page Unresponsive" dialog.
 *
 * `scheduleRender` coalesces every caller in a frame into ONE `two.update()`,
 * turning the mount storm back into O(N).
 *
 * Callers that need the rendered SVG node (the common
 * `two.update(); document.getElementById(group.id)` pattern) pass an
 * `afterRender` callback — it runs immediately after the single batched update,
 * by which point the node exists.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Two = any

interface PendingRender {
    frame: number | null
    callbacks: Array<() => void>
}

const pending = new WeakMap<Two, PendingRender>()

/**
 * Run `two.update()`, absorbing the scene.subtractions corruption documented in
 * CLAUDE.md: if a render throws mid-teardown, the stale subtraction stays
 * queued and every future update retries the broken removeChild forever.
 */
function safeUpdate(two: Two): void {
    try {
        two.update()
    } catch (_) {
        if (two?.scene) {
            two.scene.subtractions.length = 0
            two.scene._flagSubtractions = false
        }
    }
}

function runCallbacks(entry: PendingRender): void {
    const callbacks = entry.callbacks
    entry.callbacks = []
    for (const cb of callbacks) {
        try {
            cb()
        } catch (_) {
            /* one bad callback must not sink the rest of the batch */
        }
    }
}

/**
 * Request a render on the next animation frame. Any number of calls within the
 * same frame collapse into a single `two.update()`.
 *
 * @param afterRender Optional callback run right after the batched update, when
 *   the element's SVG node is guaranteed to exist in the DOM.
 */
export function scheduleRender(two: Two, afterRender?: () => void): void {
    if (!two) return

    let entry = pending.get(two)
    if (!entry) {
        entry = { frame: null, callbacks: [] }
        pending.set(two, entry)
    }
    if (afterRender) entry.callbacks.push(afterRender)

    if (entry.frame !== null) return

    entry.frame = requestAnimationFrame(() => {
        const current = pending.get(two)
        if (!current) return
        current.frame = null
        safeUpdate(two)
        runCallbacks(current)
    })
}

/**
 * Render synchronously right now, flushing any batch queued for this frame.
 *
 * Use only where the very next statement must read post-render geometry
 * (getBoundingClientRect, worldMatrix). Interactive one-shot paths — a drag
 * tick, a resize handle — are fine to keep synchronous: they render once per
 * event, not once per element.
 */
export function flushRender(two: Two): void {
    if (!two) return

    const entry = pending.get(two)
    if (entry?.frame !== null && entry !== undefined) {
        cancelAnimationFrame(entry.frame as number)
        entry.frame = null
    }
    safeUpdate(two)
    if (entry) runCallbacks(entry)
}
