// First-visit welcome sketch.
//
// Seeded into the local componentStore when a fresh visitor lands on `/` with
// no draft and no prior dismissal. Elements are flagged `metadata.isWelcome`
// so they can be filtered out of draft saves + share-time persistence and
// cleanly removed the moment the user creates their first real element.
//
// Coordinates are computed against the current viewport: the canvas's surface
// origin is anchored at ~(0,0) of the screen at default zoom, so positioning
// elements at negative surface coords would push them off the top-left. We
// take viewport dimensions at build time and place the sketch around the
// visible center, with one anchor near the bottom-left zoom controls.

import { generateUUID } from './misc'
import type { ComponentRecord, ComponentStore } from '../types/board'

const SKETCH_OPACITY = 0.45
const SKETCH_STROKE = '#3A342C'
const SKETCH_TEXT_COLOR = '#3A342C'
const SKETCH_FONT = 'Caveat'

interface WelcomeMetadata {
    [key: string]: unknown
    isWelcome: true
    opacity: number
    // Standalone-text fields (read by NewText factory)
    content?: string
    fontSize?: number
    textFontFamily?: string
    // Rect-with-text fields (read by canvasUtils.applyShapeText)
    hasText?: boolean
    textContent?: string
    textFontSize?: number
    textFill?: string
}

function welcomeMetadata(
    extra: Partial<Omit<WelcomeMetadata, 'isWelcome' | 'opacity'>> = {}
): WelcomeMetadata {
    return { isWelcome: true, opacity: SKETCH_OPACITY, ...extra }
}

function makeText(
    boardId: string,
    x: number,
    y: number,
    content: string,
    fontSize: number
): ComponentRecord {
    return {
        id: generateUUID(),
        componentType: 'newText',
        x,
        y,
        x1: 0,
        x2: 0,
        y1: 0,
        y2: 0,
        width: 220,
        height: 40,
        fill: 'transparent',
        stroke: null,
        linewidth: null,
        strokeType: null,
        radius: null,
        iconStroke: null,
        textColor: SKETCH_TEXT_COLOR,
        boardId,
        boardName: null,
        metadata: welcomeMetadata({
            content,
            fontSize,
            textFontFamily: SKETCH_FONT,
        }),
        children: null,
        isDummy: null,
        updatedBy: null,
        createdAt: null,
    }
}

function makeRect(
    boardId: string,
    x: number,
    y: number,
    width: number,
    height: number
): ComponentRecord {
    return {
        id: generateUUID(),
        componentType: 'rectangle',
        x,
        y,
        x1: 0,
        x2: 0,
        y1: 0,
        y2: 0,
        width,
        height,
        fill: '#ffffff',
        stroke: SKETCH_STROKE,
        linewidth: 2,
        strokeType: 'solid',
        radius: null,
        iconStroke: null,
        textColor: SKETCH_TEXT_COLOR,
        boardId,
        boardName: null,
        metadata: welcomeMetadata(),
        children: null,
        isDummy: null,
        updatedBy: null,
        createdAt: null,
    }
}

/**
 * A `rectangle` carrying inline text via metadata — read by canvasUtils
 * `applyShapeText` (gated on `hasText`). This is how the existing
 * rect-with-text element (the `RECT_WITH_TEXT` set in elementProperties.tsx)
 * is shaped — one component, not a rect + separate text overlay.
 */
function makeRectWithText(
    boardId: string,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    textFontSize: number = 26
): ComponentRecord {
    return {
        id: generateUUID(),
        componentType: 'rectangle',
        x,
        y,
        x1: 0,
        x2: 0,
        y1: 0,
        y2: 0,
        width,
        height,
        fill: '#ffffff',
        stroke: SKETCH_STROKE,
        linewidth: 2,
        strokeType: 'solid',
        radius: null,
        iconStroke: null,
        textColor: SKETCH_TEXT_COLOR,
        boardId,
        boardName: null,
        metadata: welcomeMetadata({
            hasText: true,
            textContent: text,
            textFontFamily: SKETCH_FONT,
            textFontSize,
            textFill: SKETCH_TEXT_COLOR,
        }),
        children: null,
        isDummy: null,
        updatedBy: null,
        createdAt: null,
    }
}

/** Valid strokeType values understood by `strokeTypeToDashes`. */
type StrokeType = 'solid' | 'dashed' | 'dotted'

function makeArrow(
    boardId: string,
    x: number,
    y: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    strokeType: StrokeType = 'solid'
): ComponentRecord {
    return {
        id: generateUUID(),
        componentType: 'arrowLine',
        x,
        y,
        x1,
        x2,
        y1,
        y2,
        width: 0,
        height: 0,
        fill: 'transparent',
        stroke: SKETCH_STROKE,
        linewidth: 2,
        strokeType,
        radius: null,
        iconStroke: null,
        textColor: null,
        boardId,
        boardName: null,
        metadata: welcomeMetadata(),
        children: null,
        isDummy: null,
        updatedBy: null,
        createdAt: null,
    }
}

export interface WelcomeSketchViewport {
    width: number
    height: number
    /**
     * When true, lay out for the mobile UI (shapes toolbar bottom-left, no
     * zoom controls, no left-side property panel). Default false renders the
     * laptop/desktop/tablet layout — those three share the same surrounding
     * UI (toolbar top-center, zoom bottom-left, panel left) and so share the
     * same sketch layout.
     */
    isMobile?: boolean
}

/**
 * Mobile layout: shapes toolbar lives at the bottom-left (see
 * `shapesToolbar.tsx`), there are no zoom controls, and viewport width is
 * tight (~360-420px). The sketch stacks vertically, scales fonts down, and
 * points "Pick a shape" arrow down-left at the bottom toolbar.
 */
function buildMobileWelcomeSketch(
    boardId: string,
    width: number,
    height: number
): ComponentStore {
    const cx = Math.round(width / 2)

    const elements: ComponentRecord[] = [
        // Subhead — two compact lines near the top, centered.
        makeText(boardId, cx - 110, 60, 'A minimal whiteboard.', 22),
        makeText(boardId, cx - 80, 95, 'Start drawing →', 20),

        // Rect-with-text centered. "Tap me" since drag-on-touch is two-finger.
        makeRectWithText(boardId, cx, 220, 150, 80, 'Tap me', 22),

        // Standalone label below the rect.
        makeText(boardId, cx - 110, 290, 'Double-tap anywhere to add text', 18),

        // Arrow pointing straight DOWN to the bottom shapes toolbar.
        // Group origin centered horizontally; arrowhead lands just above the
        // toolbar row.
        makeArrow(boardId, cx, height - 250, 0, 0, 0, 170, 'dashed'),
        makeText(boardId, cx - 60, height - 280, '↓ Pick a shape', 18),
    ]

    return Object.fromEntries(elements.map((el) => [el.id, el]))
}

/**
 * Large-screen layout (tablet / laptop / desktop): shapes toolbar top-center,
 * zoom controls bottom-left. The tablet end (~768px) is the tightest case for
 * this layout but still has enough horizontal room since the rect sits left of
 * center and the arrow + label sit right of center.
 */
function buildLargeWelcomeSketch(
    boardId: string,
    width: number,
    height: number
): ComponentStore {
    const cx = Math.round(width / 2)
    const cy = Math.round(height / 2)

    const elements: ComponentRecord[] = [
        // Subhead — two-line sketch text near the visible center.
        makeText(boardId, cx - 160, cy - 220, 'A minimal whiteboard.', 32),
        makeText(boardId, cx - 140, cy - 180, 'Start drawing →', 28),

        // Rect-with-text: the rectangle carries its "Drag me" label via
        // metadata (hasText + textContent), matching the existing
        // RECT_WITH_TEXT element kind. One component, not a rect + overlay.
        makeRectWithText(boardId, cx - 200, cy + 20, 180, 100, 'Drag me', 26),

        // Arrow pointing UP toward the top shapes toolbar + label below it.
        // Group anchored to the right of the rect; arrowhead lands near the
        // toolbar row (~y=80 in screen space).
        makeArrow(boardId, cx + 120, cy - 100, 0, 0, 0, -(cy - 180), 'dashed'),
        makeText(boardId, cx + 60, cy - 80, '↑ Pick a shape', 24),

        // Standalone label — no arrow. Double-click is a canvas-wide action.
        makeText(
            boardId,
            cx + 60,
            cy + 100,
            'Double-click anywhere to add text',
            24
        ),

        // Arrow toward the bottom-left zoom controls + label above it.
        // Zoom controls sit at roughly (80, H-40); arrowhead lands just above.
        makeArrow(boardId, 240, height - 180, 0, 0, -150, 110, 'dashed'),
        makeText(
            boardId,
            250,
            height - 210,
            '↙ Zoom in / out with button OR "Cmd/Ctrl" + "Scroll" ',
            22
        ),
    ]

    return Object.fromEntries(elements.map((el) => [el.id, el]))
}

export function buildWelcomeSketch(
    boardId: string,
    viewport: WelcomeSketchViewport
): ComponentStore {
    const { width, height, isMobile } = viewport
    if (isMobile) {
        return buildMobileWelcomeSketch(boardId, width, height)
    }
    return buildLargeWelcomeSketch(boardId, width, height)
}

/**
 * True when a component is part of the welcome sketch (and should be filtered
 * out of draft saves, share-time persistence, and history).
 */
export function isWelcomeComponent(comp: ComponentRecord | undefined): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!(comp?.metadata as any)?.isWelcome
}
