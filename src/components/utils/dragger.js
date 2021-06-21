import Two from 'two.js'
import ZUI from 'two.js/extras/zui'

import { offsetHeight } from 'constants/misc'

function handleDrag(twoJSInstance, group, el, cb) {
    console.log('group scene', group, twoJSInstance.scene)
    // zuifn()

    let domElement = group._renderer.elem
    let zui = new ZUI(group, domElement)
    document.getElementById(group.id).setAttribute('class', ' dragger-picker')
    let mouse = new Two.Vector(group.translation.x, group.translation.y)
    let touches = {}
    let distance = 0
    var dragging = false

    zui.addLimits(0.06, 8)
    twoJSInstance.update()
    // zui.addLimits(0.06, 8)
    console.log('mouse vector', mouse)
    domElement.addEventListener('mousedown', mousedown, false)
    // domElement.addEventListener('mousewheel', mousewheel, false)
    // domElement.addEventListener('wheel', mousewheel, false)

    // domElement.addEventListener('touchstart', touchstart, false)
    // domElement.addEventListener('touchmove', touchmove, false)
    // domElement.addEventListener('touchend', touchend, false)
    // domElement.addEventListener('touchcancel', touchend, false)

    function mousedown(e) {
        // console.log(
        //     'mouse event 1',
        //     // e,
        //     // mouse,
        //     // group.translation,
        //     twoJSInstance.scene.translation
        // )
        var rect = group.getBoundingClientRect()
        dragging =
            mouse.x > rect.left &&
            mouse.x < rect.right &&
            mouse.y > rect.top &&
            mouse.y < rect.bottom
        mouse.x = e.clientX
        mouse.y = e.clientY
        window.addEventListener('mousemove', mousemove, false)
        window.addEventListener('mouseup', mouseup, false)
    }

    function mousemove(e) {
        const displacementX = parseInt(localStorage.getItem('displacement_x'))
        const displacementY = parseInt(localStorage.getItem('displacement_y'))

        let dx = e.clientX - mouse.x
        let dy = e.clientY - mouse.y
        console.log(
            'mouse event 2',
            e,
            group.getBoundingClientRect(),
            group.getBoundingClientRect(true),
            displacementX,
            displacementY
            // twoJSInstance.scene.translation.x,
            // scale
        )
        // console.log('mouse event 2 domEle', domElement.getBoundingClientRect())
        // console.log('mouse event 2 group', group.getBoundingClientRect())
        // zui.translateSurface(dx, dy)
        // mouse.set(e.clientX, e.clientY)
        // group.translation.set(
        //     e.clientX - displacementX,
        //     e.clientY - displacementY
        // )
        if (dragging) {
            group.position.x += dx / 1
            group.position.y += dy / 1
        } else {
            zui.translateSurface(dx, dy)
        }

        twoJSInstance.update()
        cb && cb()
    }

    function mouseup(e) {
        let scale = twoJSInstance.scene.scale
        // console.log('mouse event 3', e)

        // setting final data into LS cache
        localStorage.setItem(
            `${el}_coordX`,
            parseInt(e.clientX) + scale * twoJSInstance.scene.translation.x
        )
        localStorage.setItem(
            `${el}_coordY`,
            parseInt(
                e.clientY +
                    offsetHeight +
                    scale * twoJSInstance.scene.translation.y
            )
        )

        window.removeEventListener('mousemove', mousemove, false)
        window.removeEventListener('mouseup', mouseup, false)
        twoJSInstance.update()
    }

    // function mousewheel(e) {
    //     let dy = (e.wheelDeltaY || -e.deltaY) / 1000
    //     zui.zoomBy(dy, e.clientX, e.clientY)
    //     two.update()
    // }

    return {
        mousemove: mousemove,
        mouseup: mouseup,
    }
}

export default handleDrag
