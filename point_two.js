var two = new Two({
    fullscreen: true,
    autostart: true,
}).appendTo(document.body)

// ── Stage: everything that zooms/pans normally ───────────────────────────────
var stage = new Two.Group()

// 100 background rectangles
for (var i = 0; i < 100; i++) {
    var x = Math.random() * two.width * 2 - two.width
    var y = Math.random() * two.height * 2 - two.height
    var size = 50
    var rect = new Two.Rectangle(x, y, size, size)
    rect.rotation = Math.random() * Math.PI * 2
    rect.noStroke().fill = '#3a3530'
    stage.add(rect)
}

// Red draggable shape (original)
var shape = new Two.Rectangle(two.width / 2, two.height / 2, 50, 50)
shape.noStroke().fill = '#C4501A'
stage.add(shape)

// ── Pin: lives inside stage so it pans with the world,
//   but we counter-scale it every frame so it resists zoom ──────────────────
var PIN_WORLD_X = two.width / 2 - 120
var PIN_WORLD_Y = two.height / 2 - 80

var pinGroup = new Two.Group()

// Outer ring (fixed amber color)
var pinRing = new Two.Circle(0, 0, 22)
pinRing.fill = 'transparent'
pinRing.stroke = '#E8C87A'
pinRing.linewidth = 3
pinGroup.add(pinRing)

// Inner circle — transparent, just anchors the group size
var pinInner = new Two.Circle(0, 0, 13)
pinInner.fill = 'transparent'
pinInner.noStroke()
pinGroup.add(pinInner)

pinGroup.position.set(PIN_WORLD_X, PIN_WORLD_Y)
stage.add(pinGroup)

// ── DOM SVG pin icon — overlaid on top of canvas, position synced each frame ─
var pinIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
pinIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
pinIcon.setAttribute('viewBox', '0 0 24 24')
pinIcon.setAttribute('width', '20')
pinIcon.setAttribute('height', '20')
pinIcon.style.cssText =
    'position:fixed;pointer-events:none;transform:translate(-50%,-50%)'
// Standard map-pin path
pinIcon.innerHTML =
    '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" fill="#E8C87A"/>'
document.body.appendChild(pinIcon)

two.add(stage)

// ── ZUI setup ───────────────────────────────────────────────────────────────
var scaleBadge = document.getElementById('scale-badge')
var zui,
    currentScale = 1

addZUI()

// ── Counter-scale the pin on every frame ────────────────────────────────────
//
// Goal: at scale=1 (100% zoom) → pin looks normal (scale factor = 1)
//       at scale=0.5 (50% zoom) → other elements are 50% screen size,
//                                  pin should be ~50% screen size too
//                                  (instead of 25% if fully scaled with stage)
//
// Formula: pinScale = 1 / (zuiScale ^ RESIST)
//   RESIST = 0   → pin is fully fixed on screen (ignores zoom completely)
//   RESIST = 0.5 → pin is "half resistant" — shrinks much slower than world
//   RESIST = 1   → pin shrinks exactly with the world (no counter-scaling)
//
// At zuiScale=0.5:
//   RESIST=1   → pinScale = 1/0.5   = 2.0 in group space → 1.0 screen = 10% of original intent
//   RESIST=0.5 → pinScale = 1/0.707 = 1.41 in group space → 0.707 screen size ≈ ~50% visible
//
// We pick RESIST = 0.45 for a good "pin on a map" feel.

var RESIST = 0.9

two.bind('update', function () {
    if (!zui) return
    currentScale = zui.scale
    scaleBadge.textContent = 'scale: ' + currentScale.toFixed(2)

    // Counter-scale: inverse of how much the stage has shrunk, softened by RESIST
    var counterScale = 1 / Math.pow(currentScale, RESIST)
    pinGroup.scale = counterScale

    // Screen position of the pin world coordinate
    var wx = PIN_WORLD_X * zui.scale + stage.translation.x
    var wy = PIN_WORLD_Y * zui.scale + stage.translation.y
    pinIcon.style.left = wx + 'px'
    pinIcon.style.top = wy + 'px'

    // Ring screen radius = pinRing.radius(22) * zui.scale * counterScale
    // Icon is 24x24 viewBox, we want it to fit inside the ring (radius 13 = inner circle)
    // innerCircle screen radius = 13 * zui.scale * counterScale
    // So icon size = 2 * 13 * zui.scale * counterScale = 26 * zui.scale * counterScale
    var screenInnerDiameter = 26 * currentScale * counterScale
    pinIcon.setAttribute('width', screenInnerDiameter)
    pinIcon.setAttribute('height', screenInnerDiameter)
})

// ── ZUI + interaction ────────────────────────────────────────────────────────
function addZUI() {
    var domElement = two.renderer.domElement
    zui = new Two.ZUI(stage)
    var mouse = new Two.Vector()
    var touches = {}
    var distance = 0
    var dragging = false

    zui.addLimits(0.06, 8)

    domElement.addEventListener('mousedown', mousedown, false)
    domElement.addEventListener('mousewheel', mousewheel, false)
    domElement.addEventListener('wheel', mousewheel, false)
    domElement.addEventListener('touchstart', touchstart, false)
    domElement.addEventListener('touchmove', touchmove, false)
    domElement.addEventListener('touchend', touchend, false)
    domElement.addEventListener('touchcancel', touchend, false)

    function mousedown(e) {
        mouse.x = e.clientX
        mouse.y = e.clientY
        var rect = shape.getBoundingClientRect()
        dragging =
            mouse.x > rect.left &&
            mouse.x < rect.right &&
            mouse.y > rect.top &&
            mouse.y < rect.bottom
        window.addEventListener('mousemove', mousemove, false)
        window.addEventListener('mouseup', mouseup, false)
    }

    function mousemove(e) {
        var dx = e.clientX - mouse.x
        var dy = e.clientY - mouse.y
        if (dragging) {
            shape.position.x += dx / zui.scale
            shape.position.y += dy / zui.scale
        } else {
            zui.translateSurface(dx, dy)
        }
        mouse.set(e.clientX, e.clientY)
    }

    function mouseup(e) {
        window.removeEventListener('mousemove', mousemove, false)
        window.removeEventListener('mouseup', mouseup, false)
    }

    function mousewheel(e) {
        var dy = (e.wheelDeltaY || -e.deltaY) / 1000
        zui.zoomBy(dy, e.clientX, e.clientY)
    }

    function touchstart(e) {
        switch (e.touches.length) {
            case 2:
                pinchstart(e)
                break
            case 1:
                panstart(e)
                break
        }
    }

    function touchmove(e) {
        switch (e.touches.length) {
            case 2:
                pinchmove(e)
                break
            case 1:
                panmove(e)
                break
        }
    }

    function touchend(e) {
        touches = {}
        var touch = e.touches[0]
        if (touch) {
            mouse.x = touch.clientX
            mouse.y = touch.clientY
        }
    }

    function panstart(e) {
        var touch = e.touches[0]
        mouse.x = touch.clientX
        mouse.y = touch.clientY
    }

    function panmove(e) {
        var touch = e.touches[0]
        var dx = touch.clientX - mouse.x
        var dy = touch.clientY - mouse.y
        zui.translateSurface(dx, dy)
        mouse.set(touch.clientX, touch.clientY)
    }

    function pinchstart(e) {
        for (var i = 0; i < e.touches.length; i++) {
            var touch = e.touches[i]
            touches[touch.identifier] = touch
        }
        var a = touches[0],
            b = touches[1]
        var dx = b.clientX - a.clientX
        var dy = b.clientY - a.clientY
        distance = Math.sqrt(dx * dx + dy * dy)
        mouse.x = dx / 2 + a.clientX
        mouse.y = dy / 2 + a.clientY
    }

    function pinchmove(e) {
        for (var i = 0; i < e.touches.length; i++) {
            var touch = e.touches[i]
            touches[touch.identifier] = touch
        }
        var a = touches[0],
            b = touches[1]
        var dx = b.clientX - a.clientX
        var dy = b.clientY - a.clientY
        var d = Math.sqrt(dx * dx + dy * dy)
        var delta = d - distance
        zui.zoomBy(delta / 250, mouse.x, mouse.y)
        distance = d
    }
}
