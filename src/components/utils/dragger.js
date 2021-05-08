import Two from 'two.js'
import ZUI from 'two.js/extras/zui'

import { offsetHeight } from 'constants/misc'

function handleDrag(twoJSInstance, group) {
    console.log('group scene', group, twoJSInstance.scene)
    // zuifn()

    let domElement = group._renderer.elem
    let zui = new ZUI(group, domElement)

    let mouse = new Two.Vector(group.translation.x, group.translation.y)
    let touches = {}
    let distance = 0
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
        console.log('mouse event circle 1', e, mouse, group.translation)
        mouse.x = e.clientX
        mouse.y = e.clientY
        window.addEventListener('mousemove', mousemove, false)
        window.addEventListener('mouseup', mouseup, false)
    }

    function mousemove(e) {
        let dx = e.clientX - mouse.x
        let dy = e.clientY - mouse.y
        console.log('mouse event circle 2', e, mouse, group.translation, dx, dy)
        zui.translateSurface(dx, dy)
        mouse.set(e.clientX, e.clientY)
        group.translation.set(e.clientX, e.clientY)
        twoJSInstance.update()
    }

    function mouseup(e) {
        console.log('mouse event circle 3', e)

        // setting final data into LS cache
        localStorage.setItem('Circle_coordX', parseInt(e.clientX))
        localStorage.setItem(
            'Circle_coordY',
            parseInt(e.clientY - offsetHeight)
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
