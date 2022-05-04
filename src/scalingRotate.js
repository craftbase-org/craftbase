// import Two from 'https://cdn.skypack.dev/two.js@latest'

// var two = new Two({
//     type: Two.Types.svg,
//     fullscreen: true,
//     autostart: true,
// }).appendTo(document.body)

// var mouse = new Two.Vector()
// var rect

// var points = generateRandomPoints(two.height * 0.33)
// var path = new Two.Path(points)
// // var path = new Two.Star(0, 0, two.height * 0.0625, two.height * 0.33, 9);
// path.scale = new Two.Vector(1, 1)
// path.position.set(two.width / 2, two.height / 2)
// path.closed = true
// path.curved = true
// path.fill = 'orange'
// path.noStroke()

// var box = new Two.Rectangle(0, 0, 0, 0)
// box.stroke = '#00AEFF'
// box.noFill()

// var endpoints = new Two.Points(box.vertices)
// endpoints.size = 6
// endpoints.fill = '#00AEFF'
// endpoints.noStroke()

// var stage = new Two.Group()
// var ui = new Two.Group()
// var text = new Two.Text(`Operation: none`, 0, 0, {
//     size: 17,
//     baseline: 'bottom',
// })

// stage.add(path)
// ui.add(box, endpoints)
// two.add(stage, ui, text)

// two.bind('update', update).bind('resize', resize)

// resize()

// var domElement = two.renderer.domElement

// domElement.addEventListener('pointerdown', pointerdown, false)
// domElement.addEventListener('pointermove', pointermove, false)
// domElement.addEventListener('pointerup', pointerup, false)

// function resize() {
//     text.position.x = two.width / 2
//     text.position.y = two.height - text.size
// }

// function update(frameCount) {
//     var minX = Infinity
//     var minY = Infinity
//     var maxX = -Infinity
//     var maxY = -Infinity

//     for (var i = 0; i < 1; i += 0.01) {
//         var v = path.getPointAt(i)
//         minX = Math.min(minX, v.x * path.scale.x)
//         maxX = Math.max(maxX, v.x * path.scale.x)
//         minY = Math.min(minY, v.y * path.scale.y)
//         maxY = Math.max(maxY, v.y * path.scale.y)
//     }

//     box.width = maxX - minX
//     box.height = maxY - minY

//     ui.position = path.position
//     ui.rotation = path.rotation
// }

// //

// var dragging = false,
//     scaling = false,
//     rotating = false

// function pointerdown(e) {
//     var rect = box.getBoundingClientRect()

//     mouse.x = e.clientX - two.scene.position.x
//     mouse.y = e.clientY - two.scene.position.y

//     dragging = true

//     rotating = atCorner(box, mouse)
//     if (rotating) {
//         mouse.theta = Math.atan2(rotating.point.y, rotating.point.x)
//     }

//     scaling = !rotating && atCorner(box, mouse, 25)
//     if (scaling) {
//         mouse.scale = path.scale.clone()
//     }
// }

// function pointermove(e) {
//     var rect = box.getBoundingClientRect()
//     var dx = e.clientX - mouse.x
//     var dy = e.clientY - mouse.y
//     var theta =
//         Math.atan2(e.clientY - path.position.y, e.clientX - path.position.x) -
//         mouse.theta

//     var isRotating = atCorner(box, mouse)
//     var isScaling = atCorner(box, mouse, 25)
//     var isPositioning = !isRotating && contains(rect, mouse)

//     mouse.x = e.clientX
//     mouse.y = e.clientY

//     if (rotating || isRotating) {
//         two.renderer.domElement.style.cursor = 'alias'
//         text.value = `Operation: rotate`
//     } else if (scaling || isScaling) {
//         two.renderer.domElement.style.cursor = 'ns-resize'
//         text.value = `Operation: scale`
//     } else if (isPositioning) {
//         two.renderer.domElement.style.cursor = 'grab'
//         text.value = `Operation: position`
//     } else {
//         two.renderer.domElement.style.cursor = 'default'
//         text.value = `Operation: none`
//     }

//     if (rotating) {
//         text.value = 'Operation: rotating'
//         path.rotation = theta
//     } else if (scaling) {
//         text.value = 'Operation: scaling'
//         path.scale.x += dx * 0.01
//         path.scale.y += dy * 0.01
//     } else if (dragging) {
//         if (isPositioning) {
//             text.value = 'Operation: positioning'
//             two.renderer.domElement.style.cursor = 'grabbing'
//             path.position.add(dx, dy)
//         }
//     }
// }

// function pointerup() {
//     dragging = false
//     scaling = false
//     rotating = false
// }

// //

// function contains(rect, point) {
//     return (
//         point.x > rect.left &&
//         point.x < rect.right &&
//         point.y > rect.top &&
//         point.y < rect.bottom
//     )
// }

// function atCorner(object, point, limit) {
//     var v

//     if (typeof limit !== 'number') {
//         limit = 10
//     }

//     limit *= limit

//     var matrix = Two.Utils.getComputedMatrix(object)

//     v = object.vertices[0]
//     var tl = matrix.multiply(v.x, v.y, 1)
//     v = object.vertices[1]
//     var tr = matrix.multiply(v.x, v.y, 1)
//     v = object.vertices[2]
//     var bl = matrix.multiply(v.x, v.y, 1)
//     v = object.vertices[3]
//     var br = matrix.multiply(v.x, v.y, 1)
//     var dbs = Two.Vector.distanceBetweenSquared

//     if (dbs(point, tl) < limit) {
//         return { name: 'nw-resize', point: object.vertices[0] }
//     } else if (dbs(point, tr) < limit) {
//         return { name: 'ne-resize', point: object.vertices[1] }
//     } else if (dbs(point, bl) < limit) {
//         return { name: 'sw-resize', point: object.vertices[2] }
//     } else if (dbs(point, br) < limit) {
//         return { name: 'se-resize', point: object.vertices[3] }
//     } else {
//         return false
//     }
// }

// function generateRandomPoints(size, count) {
//     var points = []
//     var i = 0
//     var length = count || 32
//     var radius = size / 2

//     while (i < length) {
//         var pct = i / length
//         var theta = pct * Math.PI * 2
//         var r = Math.random() * radius * 0.5 + radius * 0.5
//         var x = r * Math.cos(theta)
//         var y = r * Math.sin(theta)
//         var anchor = new Two.Anchor(x, y)
//         points.push(anchor)
//         i++
//     }

//     return points
// }
