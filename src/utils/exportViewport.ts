// Export the current canvas viewport as a PNG.
//
// Two.js runs the SVG renderer in fullscreen mode (see src/newCanvas.tsx), so
// the live <svg> element IS the viewport: any scene content panned/zoomed
// outside the window sits outside the SVG's 0..W / 0..H box and is clipped for
// free when we rasterize at viewport size. We therefore never touch the live
// scene — we clone the SVG, re-create the CSS-only dotted background, embed the
// web font(s) used on canvas (the rasterizer has no access to document fonts),
// stamp a screen-space watermark, then draw the SVG onto a <canvas> and
// download it as PNG.

import { SVG_NS, embedFonts } from './svgExportShared'

const CANVAS_BG = '#f5f0e8' // --color-canvas (App.css)
const DOT_COLOR = '#c4b89a' // radial-gradient dot color (App.css)
const DOT_TILE = 24 // background-size: 24px 24px (App.css)
const WATERMARK_TEXT = 'Made with craftbase.org'
const MAX_DPR = 2 // cap device-pixel scaling to bound output file size

/**
 * Download the currently-visible viewport as a PNG. Resolves once the download
 * has been triggered; rejects if the SVG can't be found or rasterization fails.
 * Font embedding failures are non-fatal (image still produced, text may fall
 * back to a system font).
 */
export async function downloadViewportAsImage(): Promise<void> {
    const svg = document.querySelector<SVGSVGElement>('#main-two-root svg')
    if (!svg) throw new Error('Canvas SVG element not found')

    const rect = svg.getBoundingClientRect()
    const width = Math.round(rect.width)
    const height = Math.round(rect.height)
    if (width === 0 || height === 0) {
        throw new Error('Canvas has zero size; nothing to export')
    }

    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', SVG_NS)
    clone.setAttribute('width', String(width))
    clone.setAttribute('height', String(height))
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`)

    injectBackground(clone, width, height)
    await embedFonts(clone)
    appendWatermark(clone, width, height)

    const svgString = new XMLSerializer().serializeToString(clone)
    await rasterizeAndDownload(svgString, width, height)
}

/** Re-create the CSS-only dotted canvas background as SVG content. */
function injectBackground(
    svg: SVGSVGElement,
    width: number,
    height: number
): void {
    const defs = document.createElementNS(SVG_NS, 'defs')
    const pattern = document.createElementNS(SVG_NS, 'pattern')
    pattern.setAttribute('id', 'cb-dots')
    pattern.setAttribute('width', String(DOT_TILE))
    pattern.setAttribute('height', String(DOT_TILE))
    pattern.setAttribute('patternUnits', 'userSpaceOnUse')
    const dot = document.createElementNS(SVG_NS, 'circle')
    dot.setAttribute('cx', '1')
    dot.setAttribute('cy', '1')
    dot.setAttribute('r', '1')
    dot.setAttribute('fill', DOT_COLOR)
    pattern.appendChild(dot)
    defs.appendChild(pattern)

    const solid = document.createElementNS(SVG_NS, 'rect')
    solid.setAttribute('x', '0')
    solid.setAttribute('y', '0')
    solid.setAttribute('width', String(width))
    solid.setAttribute('height', String(height))
    solid.setAttribute('fill', CANVAS_BG)

    const dots = document.createElementNS(SVG_NS, 'rect')
    dots.setAttribute('x', '0')
    dots.setAttribute('y', '0')
    dots.setAttribute('width', String(width))
    dots.setAttribute('height', String(height))
    dots.setAttribute('fill', 'url(#cb-dots)')

    // First children → rendered behind the scene content.
    svg.insertBefore(dots, svg.firstChild)
    svg.insertBefore(solid, svg.firstChild)
    svg.insertBefore(defs, svg.firstChild)
}

/** Bottom-right, screen-space watermark (fixed regardless of zoom/pan). */
function appendWatermark(
    svg: SVGSVGElement,
    width: number,
    height: number
): void {
    const text = document.createElementNS(SVG_NS, 'text')
    text.setAttribute('x', String(width - 16))
    text.setAttribute('y', String(height - 14))
    text.setAttribute('text-anchor', 'end')
    text.setAttribute('font-family', 'Caveat')
    text.setAttribute('font-size', '20')
    text.setAttribute('fill', '#8C7E6A')
    text.setAttribute('fill-opacity', '0.8')
    text.textContent = WATERMARK_TEXT
    // Last child → drawn on top of everything.
    svg.appendChild(text)
}

/** Draw the serialized SVG onto a HiDPI canvas and trigger a PNG download. */
function rasterizeAndDownload(
    svgString: string,
    width: number,
    height: number
): Promise<void> {
    return new Promise((resolve, reject) => {
        const svgBlob = new Blob([svgString], {
            type: 'image/svg+xml;charset=utf-8',
        })
        const svgUrl = URL.createObjectURL(svgBlob)
        const img = new Image()

        img.onload = (): void => {
            try {
                const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
                const canvas = document.createElement('canvas')
                canvas.width = Math.round(width * dpr)
                canvas.height = Math.round(height * dpr)
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    URL.revokeObjectURL(svgUrl)
                    reject(new Error('Could not get 2D canvas context'))
                    return
                }
                ctx.scale(dpr, dpr)
                ctx.drawImage(img, 0, 0, width, height)
                URL.revokeObjectURL(svgUrl)

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Canvas export produced no data'))
                        return
                    }
                    const pngUrl = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = pngUrl
                    a.download = `craftbase-${Date.now()}.png`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(pngUrl)
                    resolve()
                }, 'image/png')
            } catch (err) {
                URL.revokeObjectURL(svgUrl)
                reject(err instanceof Error ? err : new Error(String(err)))
            }
        }

        img.onerror = (): void => {
            URL.revokeObjectURL(svgUrl)
            reject(new Error('Failed to rasterize SVG'))
        }

        img.src = svgUrl
    })
}
