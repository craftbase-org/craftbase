// Module augmentation for two.js. @types/two.js covers the public API but the
// codebase reaches into a handful of internals (notably the subtractions
// reconciliation path documented in CLAUDE.md's "Two.js scene.subtractions
// Pitfall" section). Declare them here so consumers don't need `any` casts.
//
// Add entries as we discover them during migration. Keep this file the single
// source of truth for "internal Two.js fields we touch."

import 'two.js'

declare module 'two.js' {
    interface Group {
        // Pending-removal queue populated by `two.remove(element)`. Cleared on
        // successful render via `flagReset()`. Manually clear when a render
        // throws to avoid the same bad subtraction retrying forever.
        subtractions: import('two.js').Element[]
        // Flag toggled when `subtractions` is non-empty; renderer reads it to
        // decide whether to walk the queue.
        _flagSubtractions: boolean
    }

    interface Scene extends Group {}

    // Two.js stores the SVG renderer's root <g> element here. Some teardown
    // paths need to compare against it to detect a detached parent.
    interface Renderer {
        elem: SVGElement
    }

    interface Two {
        // Internal renderer handle. The published types expose `renderer` but
        // not always with the `elem` field we read in cleanup paths.
        renderer: Renderer
    }
}

// ZUI (Zoomable User Interface) is an optional Two.js extension used by
// `addZUI` in src/newCanvas.js. It is not part of @types/two.js. Declare a
// minimal shape covering what the codebase actually calls. Expand as needed.
declare module 'two.js/extras/jsm/zui' {
    import type { Two } from 'two.js'

    export class ZUI {
        constructor(group: Two['scene'], domElement?: HTMLElement)
        scale: number
        translateSurface(x: number, y: number): void
        zoomBy(byF: number, clientX: number, clientY: number): void
        zoomSet(scale: number, clientX: number, clientY: number): void
        clientToSurface(x: number, y: number): { x: number; y: number }
        surfaceToClient(v: { x: number; y: number }): { x: number; y: number }
        addLimits(min: number, max: number): this
        reset(): void
    }
}
