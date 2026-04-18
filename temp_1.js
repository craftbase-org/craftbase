import Two from 'https://esm.sh/two.js@latest'

var two = new Two({
    type: Two.Types.svg,
    fullscreen: true,
    autostart: true,
}).appendTo(document.body)

var mouse = new Two.Vector()
var rect

// dummy as element in terms of craftbase
var path = new Two.Star(0, 0, two.height * 0.0625, two.height * 0.33, 9)
path.scale = new Two.Vector(1, 1)
path.position.set(two.width / 2, two.height / 2)
path.closed = true
path.curved = true
path.fill = new Two.LinearGradient(0, 0, 0, 1, [
    new Two.Stop(0, 'orange'),
    new Two.Stop(1, 'red'),
])
path.noStroke()

// dummy for the selector instance skeleton component
var box = new Two.Rectangle(0, 0, 0, 0)
box.stroke = '#00AEFF'
box.noFill()

// the selector instance's corner endpoint dummy
var endpoints = new Two.Points(box.vertices)
endpoints.size = 6
endpoints.fill = '#00AEFF'
endpoints.noStroke()

var stage = new Two.Group()
var ui = new Two.Group()
var text = new Two.Text(`Operation: none`, 0, 0, {
    size: 17,
    baseline: 'bottom',
})

stage.add(path)

// dummy as selector instance as it comprises of box and endpoints
ui.add(box, endpoints)
two.add(stage, ui, text)

two.bind('update', update).bind('resize', resize)

resize()

var domElement = two.renderer.domElement

domElement.addEventListener('pointerdown', pointerdown, false)
domElement.addEventListener('pointermove', pointermove, false)
domElement.addEventListener('pointerup', pointerup, false)

function resize() {
    text.position.x = two.width / 2
    text.position.y = two.height - text.size
}

function update(frameCount) {
    var minX = Infinity
    var minY = Infinity
    var maxX = -Infinity
    var maxY = -Infinity

    for (var i = 0; i < 1; i += 0.01) {
        var v = path.getPointAt(i)
        minX = Math.min(minX, v.x * path.scale.x)
        maxX = Math.max(maxX, v.x * path.scale.x)
        minY = Math.min(minY, v.y * path.scale.y)
        maxY = Math.max(maxY, v.y * path.scale.y)
    }

    box.width = maxX - minX
    box.height = maxY - minY

    ui.position = path.position
    ui.rotation = path.rotation
}

//

var dragging = false,
    scaling = false,
    rotating = false,
    start = new Two.Vector(),
    initialPosition = new Two.Vector(),
    initialRotation = 0

function pointerdown(e) {
    var rect = box.getBoundingClientRect()

    mouse.x = e.clientX
    mouse.y = e.clientY

    dragging = true

    rotating = atCorner(box, mouse)
    if (rotating) {
        initialRotation = path.rotation
        // Store initial distance for proper rotation
        start.set(e.clientX - path.position.x, e.clientY - path.position.y)
    }

    scaling = !rotating && atCorner(box, mouse, 25)
    if (scaling) {
        mouse.scale = path.scale.clone()
        mouse.corner = scaling
        // Store initial values for scaling
        start.copy(mouse)
        mouse.initialWidth = box.width
        mouse.initialHeight = box.height
        // Store path's original position
        initialPosition.copy(path.position)
    }

    // For positioning
    if (!rotating && !scaling && contains(rect, mouse)) {
        mouse.isPositioning = true
    } else {
        mouse.isPositioning = false
    }
}

function pointermove(e) {
    var rect = box.getBoundingClientRect()
    var dx = e.clientX - mouse.x
    var dy = e.clientY - mouse.y

    var isRotating = atCorner(box, mouse)
    var isScaling = atCorner(box, mouse, 25)
    var isPositioning = !isRotating && !isScaling && contains(rect, mouse)

    // Update current mouse position
    mouse.x = e.clientX
    mouse.y = e.clientY

    // Update cursor style and operation text
    if (rotating || isRotating) {
        two.renderer.domElement.style.cursor = 'alias'
        text.value = `Operation: rotate`
    } else if (scaling || isScaling) {
        two.renderer.domElement.style.cursor = scaling
            ? scaling.name
            : 'ns-resize'
        text.value = `Operation: scale`
    } else if (isPositioning) {
        two.renderer.domElement.style.cursor = dragging ? 'grabbing' : 'grab'
        text.value = `Operation: position`
    } else {
        two.renderer.domElement.style.cursor = 'default'
        text.value = `Operation: none`
    }

    if (!dragging) {
        return
    }

    if (rotating) {
        text.value = 'Operation: rotating'

        // Calculate angle from center to current mouse position
        const currentAngle = Math.atan2(
            e.clientY - path.position.y,
            e.clientX - path.position.x
        )

        // Calculate angle from center to starting position
        const startAngle = Math.atan2(start.y, start.x)

        // Apply rotation as difference between angles
        path.rotation = initialRotation + (currentAngle - startAngle)
    } else if (scaling) {
        text.value = 'Operation: scaling'

        // Calculate scale factors based on mouse movement
        let deltaX = mouse.x - start.x
        let deltaY = mouse.y - start.y

        // Adjust for shape rotation
        if (path.rotation !== 0) {
            const cos = Math.cos(-path.rotation)
            const sin = Math.sin(-path.rotation)
            const rotatedDeltaX = deltaX * cos - deltaY * sin
            const rotatedDeltaY = deltaX * sin + deltaY * cos
            deltaX = rotatedDeltaX
            deltaY = rotatedDeltaY
        }

        // Calculate new dimensions
        let newWidth, newHeight
        let scaleX, scaleY

        // Different scaling logic based on which corner is being dragged
        if (mouse.corner.name === 'se-resize') {
            newWidth = mouse.initialWidth + deltaX
            newHeight = mouse.initialHeight + deltaY
        } else if (mouse.corner.name === 'sw-resize') {
            newWidth = mouse.initialWidth - deltaX
            newHeight = mouse.initialHeight + deltaY
        } else if (mouse.corner.name === 'ne-resize') {
            newWidth = mouse.initialWidth + deltaX
            newHeight = mouse.initialHeight - deltaY
        } else if (mouse.corner.name === 'nw-resize') {
            newWidth = mouse.initialWidth - deltaX
            newHeight = mouse.initialHeight - deltaY
        }

        // Calculate scale factors
        scaleX = newWidth / mouse.initialWidth
        scaleY = newHeight / mouse.initialHeight

        // Apply aspect ratio constraint with Shift key
        if (e.shiftKey) {
            const ratio = Math.min(Math.abs(scaleX), Math.abs(scaleY))
            scaleX = scaleX >= 0 ? ratio : -ratio
            scaleY = scaleY >= 0 ? ratio : -ratio
        }

        // Apply the new scale
        path.scale.x = mouse.scale.x * scaleX
        path.scale.y = mouse.scale.y * scaleY

        // Adjust position to handle anchored scaling from corners
        const anchorOffsetX = (mouse.initialWidth * (scaleX - 1)) / 2
        const anchorOffsetY = (mouse.initialHeight * (scaleY - 1)) / 2

        // Calculate position adjustment based on corner
        let adjustX = 0,
            adjustY = 0

        if (mouse.corner.name === 'nw-resize') {
            adjustX = -anchorOffsetX
            adjustY = -anchorOffsetY
        } else if (mouse.corner.name === 'ne-resize') {
            adjustX = anchorOffsetX
            adjustY = -anchorOffsetY
        } else if (mouse.corner.name === 'sw-resize') {
            adjustX = -anchorOffsetX
            adjustY = anchorOffsetY
        } else if (mouse.corner.name === 'se-resize') {
            adjustX = anchorOffsetX
            adjustY = anchorOffsetY
        }

        // Apply position adjustment with rotation considered
        if (path.rotation !== 0) {
            const cos = Math.cos(path.rotation)
            const sin = Math.sin(path.rotation)
            const rotatedX = adjustX * cos - adjustY * sin
            const rotatedY = adjustX * sin + adjustY * cos
            path.position.x = initialPosition.x + rotatedX
            path.position.y = initialPosition.y + rotatedY
        } else {
            path.position.x = initialPosition.x + adjustX
            path.position.y = initialPosition.y + adjustY
        }

        // Scale from center with Alt key
        if (e.altKey) {
            path.position.x = initialPosition.x
            path.position.y = initialPosition.y
        }

        // Add modifier keys info
        if (e.shiftKey) {
            text.value += ' (constrained)'
        }
        if (e.altKey) {
            text.value += ' (from center)'
        }
    } else if (mouse.isPositioning) {
        text.value = 'Operation: positioning'
        two.renderer.domElement.style.cursor = 'grabbing'
        path.position.add(dx, dy)
    }
}

function pointerup() {
    dragging = false
    scaling = false
    rotating = false
    mouse.isPositioning = false
    two.renderer.domElement.style.cursor = 'default'
}

//

function contains(rect, point) {
    return (
        point.x > rect.left &&
        point.x < rect.right &&
        point.y > rect.top &&
        point.y < rect.bottom
    )
}

function atCorner(object, point, limit) {
    var v

    if (typeof limit !== 'number') {
        limit = 10
    }

    limit *= limit

    var matrix = Two.Utils.getComputedMatrix(object)

    v = object.vertices[0]
    var tl = matrix.multiply(v.x, v.y, 1)
    v = object.vertices[1]
    var tr = matrix.multiply(v.x, v.y, 1)
    v = object.vertices[2]
    var bl = matrix.multiply(v.x, v.y, 1)
    v = object.vertices[3]
    var br = matrix.multiply(v.x, v.y, 1)
    var dbs = Two.Vector.distanceBetweenSquared

    if (dbs(point, { x: tl[0], y: tl[1] }) < limit) {
        return { name: 'nw-resize', point: object.vertices[0] }
    } else if (dbs(point, { x: tr[0], y: tr[1] }) < limit) {
        return { name: 'ne-resize', point: object.vertices[1] }
    } else if (dbs(point, { x: bl[0], y: bl[1] }) < limit) {
        return { name: 'se-resize', point: object.vertices[2] }
    } else if (dbs(point, { x: br[0], y: br[1] }) < limit) {
        return { name: 'sw-resize', point: object.vertices[3] }
    } else {
        return false
    }
}

function getOppositeCorner(cornerName) {
    switch (cornerName) {
        case 'nw-resize':
            return 'se-resize'
        case 'ne-resize':
            return 'sw-resize'
        case 'sw-resize':
            return 'ne-resize'
        case 'se-resize':
            return 'nw-resize'
        default:
            return null
    }
}

// Helper function to rotate a point around origin
function rotatePoint(point, angle) {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return {
        x: point.x * cos - point.y * sin,
        y: point.x * sin + point.y * cos,
    }
}
