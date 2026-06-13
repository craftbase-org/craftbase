// Single source of truth for the lazily-loaded whiteboard element components.
//
// Each file under components/elements/*.tsx is its own dynamic chunk — Vite
// code-splits non-eager `import.meta.glob` — and is mounted via React.lazy in
// newCanvas.tsx. On a fresh page the FIRST draw of a given shape type pays a
// network fetch + parse of that chunk before React can mount it; that is the
// "freshly drawn shape sits dimmed for a couple seconds" cost on prod.
//
// Lives at the src root so the glob path (and therefore the produced keys,
// e.g. './components/elements/circle.tsx') matches newCanvas's original glob
// verbatim — newCanvas keys into this map with that exact string.

import { perfLog } from './utils/perfLog'

export const elementModules = import.meta.glob('./components/elements/*.tsx')

// Idempotent prefetch: kicks off (and caches) the dynamic import for a shape
// type so its chunk is warm before React.lazy needs it. Calling it repeatedly
// reuses the in-flight/resolved promise, and the browser dedupes the import,
// so the real mount path (React.lazy) resolves instantly once warmed.
const inFlight = new Map<string, Promise<unknown>>()

export function prefetchElementModule(componentType: string): void {
    const key = `./components/elements/${componentType}.tsx`
    const loader = elementModules[key]
    if (!loader) return
    if (inFlight.has(key)) {
        // [perf] Already warming/warm — the mount will be instant.
        perfLog(`prefetch: ${componentType} chunk already warm`)
        return
    }
    // [perf] Cold chunk — fetch starts now. On prod this is the network hit
    // that, before prefetching, blocked the post-mouseup mount.
    perfLog(`prefetch: ${componentType} chunk fetch START`)
    const p = loader()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((m: any) => {
            // [perf] Chunk is now cached; React.lazy will resolve immediately.
            perfLog(`prefetch: ${componentType} chunk fetch DONE (warm)`)
            return m
        })
        // Best-effort warm-up — the real load path surfaces genuine failures
        // via its own Suspense/error boundary, so swallow here.
        .catch(() => undefined)
    inFlight.set(key, p)
}
