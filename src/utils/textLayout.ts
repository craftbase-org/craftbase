import { LINE_HEIGHT_MULTIPLIER } from '../constants/misc'

// Shared text wrapping + measurement used by the shape components, the canvas
// text editor, and the resize controller so a single algorithm decides how a
// string breaks into visual lines.
//
// IMPORTANT: an SVG <text> node renders on one line (Two.js does
// `elem.textContent = value`, and SVG collapses `\n`). Multiline text is
// therefore a vertical stack of one Two.Text per line — this module decides
// what those lines are; `canvasUtils.renderShapeTextLayer` renders them.

export interface FontSpec {
    family: string
    size: number
    weight?: string | number
}

// Build a CSS `font` shorthand for a 2D canvas context. Kept in sync with the
// editor's measure-span styling in newCanvas.tsx (weight family at `size`px).
export function buildCssFont({ family, size, weight }: FontSpec): string {
    return `${weight ?? 'normal'} ${size}px ${family || 'Caveat'}`
}

// Line height (surface units) for a given font size. Reused for the editor
// textarea and the rendered Two.Text stack so they stay visually aligned.
export function lineHeightFor(fontSize: number): number {
    return Math.ceil(fontSize * LINE_HEIGHT_MULTIPLIER)
}

// ── Offscreen measurement ──
// A single cached 2D context. `measureText` scales linearly with font size, so
// measuring at the Two.js surface `size` yields widths in surface units —
// directly comparable to a shape's surface-unit width.
let measureCtx: CanvasRenderingContext2D | null = null

function getMeasureCtx(): CanvasRenderingContext2D | null {
    if (measureCtx) return measureCtx
    if (typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    measureCtx = canvas.getContext('2d')
    return measureCtx
}

export function measureTextWidth(str: string, font: FontSpec): number {
    const ctx = getMeasureCtx()
    if (!ctx) return str.length * font.size * 0.6 // coarse fallback
    ctx.font = buildCssFont(font)
    return ctx.measureText(str).width
}

// Break a single word that is itself wider than maxWidth into character
// chunks. Guarantees >= 1 character per line (the `cur === ''` branch always
// accepts the first character even if one glyph exceeds maxWidth).
function charWrap(
    word: string,
    maxWidth: number,
    font: FontSpec
): string[] {
    const chunks: string[] = []
    let cur = ''
    for (const ch of word) {
        const cand = cur + ch
        if (cur === '' || measureTextWidth(cand, font) <= maxWidth) {
            cur = cand
        } else {
            chunks.push(cur)
            cur = ch
        }
    }
    if (cur !== '') chunks.push(cur)
    return chunks
}

/**
 * Wrap `raw` into visual lines.
 *
 * - Hard newlines (`\n`, the user's Shift+Enter) always start a new line.
 * - Each paragraph is greedily word-wrapped to `maxWidthPx`.
 * - A word longer than `maxWidthPx` is character-wrapped, down to a minimum
 *   of one character per line.
 * - If `maxWidthPx` is `null`/`<= 0` (standalone newText: no reflow), only
 *   hard newlines are honored.
 */
export function wrapText(
    raw: string,
    maxWidthPx: number | null,
    font: FontSpec
): string[] {
    const paragraphs = (raw ?? '').split('\n')

    if (maxWidthPx == null || maxWidthPx <= 0) {
        return paragraphs.length > 0 ? paragraphs : ['']
    }

    const lines: string[] = []
    for (const paragraph of paragraphs) {
        const words = paragraph.split(' ')
        let current = ''
        for (const word of words) {
            const candidate = current === '' ? word : `${current} ${word}`
            if (current === '') {
                if (measureTextWidth(word, font) > maxWidthPx) {
                    const chunks = charWrap(word, maxWidthPx, font)
                    for (let i = 0; i < chunks.length - 1; i++) {
                        lines.push(chunks[i] as string)
                    }
                    current = chunks[chunks.length - 1] ?? ''
                } else {
                    current = candidate
                }
            } else if (measureTextWidth(candidate, font) <= maxWidthPx) {
                current = candidate
            } else {
                lines.push(current)
                if (measureTextWidth(word, font) > maxWidthPx) {
                    const chunks = charWrap(word, maxWidthPx, font)
                    for (let i = 0; i < chunks.length - 1; i++) {
                        lines.push(chunks[i] as string)
                    }
                    current = chunks[chunks.length - 1] ?? ''
                } else {
                    current = word
                }
            }
        }
        // Always emit the trailing line so an empty paragraph (a blank line
        // from a double Shift+Enter) still produces one empty visual line.
        lines.push(current)
    }
    return lines.length > 0 ? lines : ['']
}

// Width (surface units) of the single widest character in `raw`. Used by the
// resize min-clamp so a shape can be squeezed until each line holds just one
// character — never narrower than the widest glyph it must show.
export function widestCharWidth(raw: string, font: FontSpec): number {
    let max = 0
    for (const ch of raw ?? '') {
        if (ch === '\n' || ch === ' ') continue
        const w = measureTextWidth(ch, font)
        if (w > max) max = w
    }
    // Fall back to an em-ish width when the string is empty/whitespace only.
    return max > 0 ? max : font.size * 0.6
}
