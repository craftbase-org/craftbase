// Convert pasted rich-text HTML (e.g. from Docs/Notion/Notes) into plain text
// that keeps list markers, since the canvas text editor is a plain <textarea>
// whose native paste only takes `text/plain` — and most sources drop the bullet
// glyphs from their plain-text projection of an HTML list.
//
// `<ul>` items become `•`/`◦`/`▪` per nesting depth; `<ol>` items become
// `1.`, `2.`, … Nested lists are indented two spaces per level. Non-list block
// elements (`p`, `div`, headings, `br`) become line breaks so paragraphs keep
// their structure. Returns `null` when the HTML has no list at all, so callers
// can fall back to the browser's default plain-text paste.

const UL_MARKERS = ['•', '◦', '▪']
const BLOCK_TAGS = new Set([
    'p',
    'div',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'section',
    'article',
    'header',
    'footer',
    'tr',
])

const INDENT = '  '

function inlineText(node: Node): string {
    // Text of a node EXCLUDING any nested lists (those are emitted separately).
    let out = ''
    node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
            out += child.textContent ?? ''
        } else if (child.nodeType === Node.ELEMENT_NODE) {
            const tag = (child as Element).tagName.toLowerCase()
            if (tag === 'ul' || tag === 'ol') return
            if (tag === 'br') {
                out += '\n'
                return
            }
            out += inlineText(child)
        }
    })
    return out.replace(/[ \t\f\v]+/g, ' ').trim()
}

function emitList(listEl: Element, depth: number, lines: string[]): void {
    const ordered = listEl.tagName.toLowerCase() === 'ol'
    let index = 1
    listEl.childNodes.forEach((li) => {
        if (
            li.nodeType !== Node.ELEMENT_NODE ||
            (li as Element).tagName.toLowerCase() !== 'li'
        ) {
            return
        }
        const marker = ordered
            ? `${index}.`
            : (UL_MARKERS[depth % UL_MARKERS.length] ?? '•')
        const text = inlineText(li)
        lines.push(`${INDENT.repeat(depth)}${marker} ${text}`.trimEnd())
        index += 1
        // Emit nested lists below the item; the item's own inline text is
        // already in the line above (inlineText excludes nested lists).
        li.childNodes.forEach((sub) => {
            if (sub.nodeType !== Node.ELEMENT_NODE) return
            const subTag = (sub as Element).tagName.toLowerCase()
            if (subTag === 'ul' || subTag === 'ol') {
                emitList(sub as Element, depth + 1, lines)
            }
        })
    })
}

function walk(node: Node, depth: number, lines: string[]): void {
    node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
            const t = (child.textContent ?? '').replace(/\s+/g, ' ').trim()
            if (t) lines.push(t)
            return
        }
        if (child.nodeType !== Node.ELEMENT_NODE) return

        const el = child as Element
        const tag = el.tagName.toLowerCase()

        if (tag === 'ul' || tag === 'ol') {
            emitList(el, depth, lines)
            return
        }

        if (tag === 'br') {
            lines.push('')
            return
        }

        if (BLOCK_TAGS.has(tag)) {
            const before = lines.length
            walk(el, depth, lines)
            // Keep paragraph separation between consecutive block siblings.
            if (lines.length > before) lines.push('')
            return
        }

        // Inline wrapper (span, a, strong, …) — descend without a new line.
        walk(el, depth, lines)
    })
}

export function htmlToBulletText(html: string): string | null {
    if (!html) return null
    const doc = new DOMParser().parseFromString(html, 'text/html')
    if (!doc.querySelector('li')) return null

    const lines: string[] = []
    walk(doc.body, 0, lines)

    return lines
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^\n+|\n+$/g, '')
}
