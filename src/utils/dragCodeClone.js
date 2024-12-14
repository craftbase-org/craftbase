// var two = new Two({
//     fullscreen: true,
//     autostart: true,
// }).appendTo(document.body)

// var stage = new Two.Group()

// for (var i = 0; i < 100; i++) {
//     let x = Math.random() * two.width * 2 - two.width
//     let y = Math.random() * two.height * 2 - two.height
//     let size = 50
//     let shape = new Two.Rectangle(x, y, size, size)
//     shape.rotation = Math.random() * Math.PI * 2
//     shape.noStroke().fill = '#ccc'
//     stage.add(shape)
// }

// shape.fill = 'red'
// shape.position.set(two.width / 2, two.height / 2)

// two.add(stage)
// addZUI()

// function addZUI() {
//     var domElement = two.renderer.domElement
//     var zui = new Two.ZUI(stage)
//     var mouse = new Two.Vector()
//     var touches = {}
//     var distance = 0
//     var dragging = false

//     zui.addLimits(0.06, 8)

//     domElement.addEventListener('mousedown', mousedown, false)
//     domElement.addEventListener('mousewheel', mousewheel, false)
//     domElement.addEventListener('wheel', mousewheel, false)

//     domElement.addEventListener('touchstart', touchstart, false)
//     domElement.addEventListener('touchmove', touchmove, false)
//     domElement.addEventListener('touchend', touchend, false)
//     domElement.addEventListener('touchcancel', touchend, false)

//     function mousedown(e) {
//         mouse.x = e.clientX
//         mouse.y = e.clientY
//         var rect = shape.getBoundingClientRect()
//         dragging =
//             mouse.x > rect.left &&
//             mouse.x < rect.right &&
//             mouse.y > rect.top &&
//             mouse.y < rect.bottom
//         window.addEventListener('mousemove', mousemove, false)
//         window.addEventListener('mouseup', mouseup, false)
//     }

//     function mousemove(e) {
//         var dx = e.clientX - mouse.x
//         var dy = e.clientY - mouse.y
//         if (dragging) {
//             shape.position.x += dx / zui.scale
//             shape.position.y += dy / zui.scale
//         } else {
//             zui.translateSurface(dx, dy)
//         }
//         mouse.set(e.clientX, e.clientY)
//     }

//     function mouseup(e) {
//         window.removeEventListener('mousemove', mousemove, false)
//         window.removeEventListener('mouseup', mouseup, false)
//     }

//     function mousewheel(e) {
//         var dy = (e.wheelDeltaY || -e.deltaY) / 1000
//         zui.zoomBy(dy, e.clientX, e.clientY)
//     }

//     function touchstart(e) {
//         switch (e.touches.length) {
//             case 2:
//                 pinchstart(e)
//                 break
//             case 1:
//                 panstart(e)
//                 break
//         }
//     }

//     function touchmove(e) {
//         switch (e.touches.length) {
//             case 2:
//                 pinchmove(e)
//                 break
//             case 1:
//                 panmove(e)
//                 break
//         }
//     }

//     function touchend(e) {
//         touches = {}
//         var touch = e.touches[0]
//         if (touch) {
//             // Pass through for panning after pinching
//             mouse.x = touch.clientX
//             mouse.y = touch.clientY
//         }
//     }

//     function panstart(e) {
//         var touch = e.touches[0]
//         mouse.x = touch.clientX
//         mouse.y = touch.clientY
//     }

//     function panmove(e) {
//         var touch = e.touches[0]
//         var dx = touch.clientX - mouse.x
//         var dy = touch.clientY - mouse.y
//         zui.translateSurface(dx, dy)
//         mouse.set(touch.clientX, touch.clientY)
//     }

//     function pinchstart(e) {
//         for (var i = 0; i < e.touches.length; i++) {
//             var touch = e.touches[i]
//             touches[touch.identifier] = touch
//         }
//         var a = touches[0]
//         var b = touches[1]
//         var dx = b.clientX - a.clientX
//         var dy = b.clientY - a.clientY
//         distance = Math.sqrt(dx * dx + dy * dy)
//         mouse.x = dx / 2 + a.clientX
//         mouse.y = dy / 2 + a.clientY
//     }

//     function pinchmove(e) {
//         for (var i = 0; i < e.touches.length; i++) {
//             var touch = e.touches[i]
//             touches[touch.identifier] = touch
//         }
//         var a = touches[0]
//         var b = touches[1]
//         var dx = b.clientX - a.clientX
//         var dy = b.clientY - a.clientY
//         var d = Math.sqrt(dx * dx + dy * dy)
//         var delta = d - distance
//         zui.zoomBy(delta / 250, mouse.x, mouse.y)
//         distance = d
//     }
// }

// /// old canvas zui fn
// function addZUI() {
//     console.log('in zui', two)
//     // zuifn()

//     let domElement = two.renderer.domElement
//     // console.log('two.renderer.domElement', two.renderer)
//     let zui = new ZUI(two.scene, domElement)

//     let mouse = new Two.Vector()
//     let touches = {}
//     let distance = 0
//     zui.addLimits(0.06, 8)

//     domElement.addEventListener('mousedown', mousedown, false)
//     domElement.addEventListener('mousewheel', mousewheel, false)
//     domElement.addEventListener('wheel', mousewheel, false)

//     domElement.addEventListener('touchstart', touchstart, false)
//     domElement.addEventListener('touchmove', touchmove, false)
//     domElement.addEventListener('touchend', touchend, false)
//     domElement.addEventListener('touchcancel', touchend, false)

//     function mousedown(e) {
//         console.log(
//             'e in ZUI mouse down',
//             e,
//             e.path
//             // two.scene.scale,
//             // thisRef.props,
//             // two.scene.translation
//             // two.scene.children[0].translation
//         )

//         e.path.forEach((item, index) => {
//             if (
//                 item?.classList?.value &&
//                 item?.classList?.value === 'dragger-picker' &&
//                 item.tagName === 'g'
//             ) {
//                 console.log('iterating through path', item.id)
//             }
//         })

//         if (!thisRef.props.selectCursorMode) {
//             if (
//                 e.target.tagName === 'svg' &&
//                 e.target.lastChild.id === two.scene.id
//             ) {
//                 mouse.x = e.clientX
//                 mouse.y = e.clientY
//                 window.addEventListener('mousemove', mousemove, false)
//                 window.addEventListener('mouseup', mouseup, false)
//                 two.update()
//             } else {
//             }
//         }
//     }

//     function mousemove(e) {
//         let dx = e.clientX - mouse.x
//         let dy = e.clientY - mouse.y
//         zui.translateSurface(dx, dy)
//         mouse.set(e.clientX, e.clientY)
//         two.update()
//     }

//     function mouseup(e) {
//         console.log('e in ZUI mouse up', e, two.scene.translation)
//         localStorage.setItem('displacement_x', two.scene.translation.x)
//         localStorage.setItem('displacement_y', two.scene.translation.y)
//         window.removeEventListener('mousemove', mousemove, false)
//         window.removeEventListener('mouseup', mouseup, false)
//     }

//     function mousewheel(e) {
//         let dy = (e.wheelDeltaY || -e.deltaY) / 1000
//         zui.zoomBy(dy, e.clientX, e.clientY)
//         two.update()
//     }

//     function touchstart(e) {
//         console.log('e in ZUI touch start', e)
//         switch (e.touches.length) {
//             case 2:
//                 pinchstart(e)
//                 break
//             case 1:
//                 panstart(e)
//                 break
//         }
//     }

//     function touchmove(e) {
//         switch (e.touches.length) {
//             case 2:
//                 pinchmove(e)
//                 break
//             case 1:
//                 panmove(e)
//                 break
//         }
//     }

//     function touchend(e) {
//         touches = {}
//         let touch = e.touches[0]
//         if (touch) {
//             // Pass through for panning after pinching
//             mouse.x = touch.clientX
//             mouse.y = touch.clientY
//         }
//         two.update()
//     }

//     function panstart(e) {
//         let touch = e.touches[0]
//         mouse.x = touch.clientX
//         mouse.y = touch.clientY
//         two.update()
//     }

//     function panmove(e) {
//         let touch = e.touches[0]
//         let dx = touch.clientX - mouse.x
//         let dy = touch.clientY - mouse.y
//         zui.translateSurface(dx, dy)
//         mouse.set(touch.clientX, touch.clientY)
//         two.update()
//     }

//     function pinchstart(e) {
//         for (let i = 0; i < e.touches.length; i++) {
//             let touch = e.touches[i]
//             touches[touch.identifier] = touch
//         }
//         let a = touches[0]
//         let b = touches[1]
//         let dx = b.clientX - a.clientX
//         let dy = b.clientY - a.clientY
//         distance = Math.sqrt(dx * dx + dy * dy)
//         mouse.x = dx / 2 + a.clientX
//         mouse.y = dy / 2 + a.clientY
//         two.update()
//     }

//     function pinchmove(e) {
//         for (let i = 0; i < e.touches.length; i++) {
//             let touch = e.touches[i]
//             touches[touch.identifier] = touch
//         }
//         let a = touches[0]
//         let b = touches[1]
//         let dx = b.clientX - a.clientX
//         let dy = b.clientY - a.clientY
//         let d = Math.sqrt(dx * dx + dy * dy)
//         let delta = d - distance
//         zui.zoomBy(delta / 250, mouse.x, mouse.y)
//         distance = d
//         two.update()
//     }
// }
