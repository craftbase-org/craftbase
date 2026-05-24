const wrap = document.getElementById('canvas-wrap')
const btnDraw = document.getElementById('btn-draw')
const btnClear = document.getElementById('btn-clear')
const statusEl = document.getElementById('status')
const polyCountEl = document.getElementById('poly-count')

const two = new Two({
    type: Two.Types.canvas,
    width: wrap.clientWidth,
    height: wrap.clientHeight,
    autostart: true,
}).appendTo(wrap)

const canvas = wrap.querySelector('canvas')
canvas.style.position = 'absolute'
canvas.style.top = '0'
canvas.style.left = '0'

let drawing = false
let currentVertices = []
let currentDots = []
let currentLines = []
let previewLine = null
let routes = []

const STROKE = '#3B82F6'
const STROKE_W = 2.5
const DOT_R = 5

function setStatus(msg) {
    statusEl.textContent = msg
}
function updateCount() {
    const n = routes.length
    polyCountEl.textContent = n + ' route' + (n !== 1 ? 's' : '')
}

function startDrawing() {
    drawing = true
    currentVertices = []
    currentDots.forEach((d) => d.remove())
    currentDots = []
    currentLines.forEach((l) => l.remove())
    currentLines = []
    if (previewLine) {
        previewLine.remove()
        previewLine = null
    }
    wrap.classList.remove('idle')
    btnDraw.classList.add('active')
    btnDraw.setAttribute('aria-pressed', 'true')
    setStatus('Drawing… click to add points, Esc to finish')
}

function finishDrawing() {
    if (!drawing) return
    drawing = false
    wrap.classList.add('idle')
    btnDraw.classList.remove('active')
    btnDraw.setAttribute('aria-pressed', 'false')

    if (previewLine) {
        previewLine.remove()
        previewLine = null
    }

    if (currentVertices.length < 2) {
        currentDots.forEach((d) => d.remove())
        currentLines.forEach((l) => l.remove())
        currentDots = []
        currentLines = []
        setStatus('Need at least 2 points. Click "Draw route" to try again.')
        return
    }

    currentDots.forEach((d) => d.remove())
    currentLines.forEach((l) => l.remove())
    currentDots = []
    currentLines = []

    const anchors = currentVertices.map((v) => new Two.Anchor(v.x, v.y))
    // closed = false → open path (route, not area)
    const path = new Two.Path(anchors, false, false)
    path.noFill()
    path.stroke = STROKE
    path.linewidth = STROKE_W
    path.cap = 'round'
    path.join = 'round'
    path.opacity = 1
    two.add(path)
    routes.push(path)

    currentVertices = []
    updateCount()
    setStatus('Route drawn. Click "Draw route" to add another.')
}

function addPoint(x, y) {
    if (!drawing) return
    currentVertices.push({ x, y })

    const dot = two.makeCircle(x, y, DOT_R)
    dot.fill = STROKE
    dot.noStroke()
    currentDots.push(dot)

    if (currentVertices.length >= 2) {
        const prev = currentVertices[currentVertices.length - 2]
        const line = two.makeLine(prev.x, prev.y, x, y)
        line.stroke = STROKE
        line.linewidth = STROKE_W
        line.opacity = 0.6
        currentLines.push(line)
    }

    const n = currentVertices.length
    setStatus(
        'Drawing… ' +
            n +
            ' point' +
            (n !== 1 ? 's' : '') +
            ' added. Esc to finish.'
    )
}

function updatePreview(mx, my) {
    if (!drawing || currentVertices.length === 0) return
    const last = currentVertices[currentVertices.length - 1]
    if (previewLine) {
        previewLine.vertices[0].set(last.x, last.y)
        previewLine.vertices[1].set(mx, my)
    } else {
        previewLine = two.makeLine(last.x, last.y, mx, my)
        previewLine.stroke = STROKE
        previewLine.linewidth = STROKE_W
        previewLine.opacity = 0.35
    }
}

function getPos(e) {
    const r = wrap.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
}

wrap.addEventListener('click', (e) => {
    if (!drawing) return
    const p = getPos(e)
    addPoint(p.x, p.y)
})

wrap.addEventListener('mousemove', (e) => {
    if (!drawing) return
    const p = getPos(e)
    updatePreview(p.x, p.y)
})

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawing) finishDrawing()
})

btnDraw.addEventListener('click', () => {
    if (drawing) {
        finishDrawing()
    } else {
        startDrawing()
    }
})

btnClear.addEventListener('click', () => {
    if (drawing) {
        drawing = false
        wrap.classList.add('idle')
        btnDraw.classList.remove('active')
        btnDraw.setAttribute('aria-pressed', 'false')
        if (previewLine) {
            previewLine.remove()
            previewLine = null
        }
        currentDots.forEach((d) => d.remove())
        currentLines.forEach((l) => l.remove())
        currentDots = []
        currentLines = []
        currentVertices = []
    }
    routes.forEach((p) => p.remove())
    routes = []
    updateCount()
    setStatus('Cleared. Click "Draw route" to start.')
})

const ro = new ResizeObserver(() => {
    two.width = wrap.clientWidth
    two.height = wrap.clientHeight
    canvas.width = wrap.clientWidth
    canvas.height = wrap.clientHeight
})
ro.observe(wrap)
