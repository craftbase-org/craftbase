// Shared helpers for the SVG-based export flows (viewport PNG export and
// selection SVG export). Two.js runs the SVG renderer, so both flows clone the
// live SVG and need to inline the canvas web font(s) — the SVG→<canvas>
// rasterizer and any standalone .svg consumer have no access to the document's
// loaded fonts, so without embedding, canvas text falls back to a system font.

export const SVG_NS = 'http://www.w3.org/2000/svg'

// Fonts used for canvas text. --font-sketch: 'Caveat' (App.css). Embedded so
// exported text matches the screen instead of falling back to a system font.
const FONT_FAMILIES = ['Caveat']

/**
 * Inline the Google web font(s) as base64 inside a <style> in the given SVG.
 * Best-effort: any failure leaves the SVG unmodified.
 */
export async function embedFonts(svg: SVGSVGElement): Promise<void> {
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
export async function fetchAsDataUri(url: string): Promise<string | null> {
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
