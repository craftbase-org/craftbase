// ── Shape-draw perf tracing ──
// Temporary instrumentation to diagnose the "freshly drawn shape sits at
// reduced opacity / flickers for a couple seconds before committing" issue.
//
// It traces the full lifecycle of a single shape placement:
//   toolbar select → addElement() arms pending shape → mousedown preview →
//   mouseup commit → addToLocalComponentStore() → setComponentStore() →
//   React mounts the element component → group enters two.scene → two.update()
//   → pollUntilElement finds it → finishPlacement (preview removed + selected)
//
// Every line is tagged `[perf]` so it's trivial to grep and strip later.
// Flip PERF_LOG to false (or delete this file + its imports) to silence.

const PERF_LOG = true

let startTs: number | null = null
let lastTs: number | null = null

// Reset the timeline. Call this at the very first user action (toolbar select)
// so every subsequent perfLog reports both cumulative and per-step elapsed time.
export function perfStart(label: string): void {
    if (!PERF_LOG) return
    startTs = performance.now()
    lastTs = startTs
    // eslint-disable-next-line no-console
    console.log(
        `[perf] ▶ ${label} — timeline start @ ${startTs.toFixed(1)}ms`
    )
}

// Log a milestone with elapsed-since-start and elapsed-since-previous deltas.
export function perfLog(label: string, data?: Record<string, unknown>): void {
    if (!PERF_LOG) return
    const now = performance.now()
    const sinceStart = startTs != null ? (now - startTs).toFixed(1) : '—'
    const sinceLast = lastTs != null ? (now - lastTs).toFixed(1) : '—'
    lastTs = now
    // eslint-disable-next-line no-console
    console.log(
        `[perf] ${label}  ·  +${sinceStart}ms total / +${sinceLast}ms step`,
        data ?? ''
    )
}
