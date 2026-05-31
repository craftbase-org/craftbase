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

const SVG_NS = 'http://www.w3.org/2000/svg'
const CANVAS_BG = '#f5f0e8' // --color-canvas (App.css)
const DOT_COLOR = '#c4b89a' // radial-gradient dot color (App.css)
const DOT_TILE = 24 // background-size: 24px 24px (App.css)
const WATERMARK_TEXT = 'Made with craftbase.org'
// Fonts used for canvas text. --font-sketch: 'Caveat' (App.css). Embedded so
// rasterized text matches the screen instead of falling back to a system font.
const FONT_FAMILIES = ['Caveat']
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

/**
 * Inline the Google web font(s) as base64 inside a <style> in the clone. The
 * SVG→<canvas> rasterizer renders in an isolated context with no access to the
 * document's loaded fonts, so without this, canvas text falls back to a system
 * font. Best-effort: any failure leaves the SVG unmodified.
 */
async function embedFonts(svg: SVGSVGElement): Promise<void> {
    try {
        const family = FONT_FAMILIES.map(
            (f) => `family=${encodeURIComponent(f)}:wght@400..700`
        ).join('&')
        const cssUrl = `https://fonts.googleapis.com/css2?${family}&display=swap`
        const cssResp = await fetch(cssUrl)
        if (!cssResp.ok) return
        let css = await cssResp.text()

        const urls = [...css.matchAll(/url\((https:\/\/[^)]+)\)/g)].map(
            (m) => m[1] as string
        )
        const uniqueUrls = [...new Set(urls)]
        await Promise.all(
            uniqueUrls.map(async (url) => {
                const dataUri = await fetchAsDataUri(url)
                if (dataUri) css = css.split(url).join(dataUri)
            })
        )

        const style = document.createElementNS(SVG_NS, 'style')
        style.textContent = css
        svg.insertBefore(style, svg.firstChild)
    } catch (err) {
        // Non-fatal: keep going without embedded fonts.
        console.warn('Font embedding failed; exporting with fallback font', err)
    }
}

/** Fetch a font binary and return a base64 data URI, or null on failure. */
async function fetchAsDataUri(url: string): Promise<string | null> {
    try {
        const resp = await fetch(url)
        if (!resp.ok) return null
        const buf = await resp.arrayBuffer()
        const mime = resp.headers.get('content-type') || 'font/woff2'
        let binary = ''
        const bytes = new Uint8Array(buf)
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i] as number)
        }
        return `data:${mime};base64,${btoa(binary)}`
    } catch {
        return null
    }
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
