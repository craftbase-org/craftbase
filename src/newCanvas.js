import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { useQuery } from '@apollo/client'
import Two from 'two.js'
import Zui from 'two.js/extras/zui'
import panzoom from 'panzoom'
import ZUI from 'two.js/extras/zui'

import ComponentWrapper from 'components/elementWrapper'
import Toolbar from 'components/floatingToolbar'
import { GET_USER_DETAILS } from 'schema/queries'
import { getElementsData } from 'store/actions/main'
import Zoomer from 'components/utils/zoomer'

function addZUI(props, updateToGlobalState, two) {
    let shape = null
    let domElement = two.renderer.domElement
    let zui = new ZUI(two.scene, domElement)
    let mouse = new Two.Vector()
    let touches = {}
    let distance = 0
    let dragging = false

    zui.addLimits(0.06, 8)

    domElement.addEventListener('mousedown', mousedown, false)
    domElement.addEventListener('mousewheel', mousewheel, false)
    domElement.addEventListener('wheel', mousewheel, false)

    domElement.addEventListener('touchstart', touchstart, false)
    domElement.addEventListener('touchmove', touchmove, false)
    domElement.addEventListener('touchend', touchend, false)
    domElement.addEventListener('touchcancel', touchend, false)

    function mousedown(e) {
        // initialize shape definition
        shape = null
        mouse.x = e.clientX
        mouse.y = e.clientY

        // checks for path in event if it contains following element with condition
        e.path.forEach((item, index) => {
            if (
                item?.classList?.value &&
                item?.classList?.value.includes('dragger-picker') &&
                item.tagName === 'g'
            ) {
                console.log('iterating through path', item.id)
                console.log(
                    'two scene children',
                    two.scene.children,
                    two.scene.children.find((child) => child.id === item.id)
                )
                shape = two.scene.children.find((child) => child.id === item.id)
            }
        })

        // if shape is null, we initialize it with root element
        if (shape === null) {
            shape = two.scene
        }
        console.log('on mouse down', e, shape)
        let rect = document.getElementById(shape.id).getBoundingClientRect()

        dragging =
            mouse.x > rect.left &&
            mouse.x < rect.right &&
            mouse.y > rect.top &&
            mouse.y < rect.bottom

        window.addEventListener('mousemove', mousemove, false)
        window.addEventListener('mouseup', mouseup, false)
        two.update()
    }

    function mousemove(e) {
        let dx = e.clientX - mouse.x
        let dy = e.clientY - mouse.y
        console.log('shape in mousemove', e, shape, props.selectPanMode)

        if (document.getElementById(shape.id).hasAttribute('data-resize')) {
            console.log('has pans')
            window.removeEventListener('mousemove', mousemove, false)
            window.removeEventListener('mouseup', mouseup, false)
        } else {
            console.log('inside mousemove', dragging)

            // check if while dragging, the shape does not point to root element (two-0)
            if (dragging && shape.id !== 'two-0') {
                shape.position.x += dx / zui.scale
                shape.position.y += dy / zui.scale
            } else {
                if (!props.selectPanMode) {
                    // nothing
                } else {
                    zui.translateSurface(dx, dy)
                }
            }
            mouse.set(e.clientX, e.clientY)
            two.update()
        }
    }

    function mouseup(e) {
        console.log(
            'e in ZUI mouse up',
            // e,
            shape
        )
        const getCoordLabel = document
            .getElementById(shape.id)
            .getAttribute('data-label')
        localStorage.setItem(`${getCoordLabel + 'X'}`, shape.translation.x)
        localStorage.setItem(`${getCoordLabel + 'Y'}`, shape.translation.y)
        let item = Object.assign({}, shape.elementData, {
            data: { x: shape.translation.x, y: shape.translation.y },
        })
        // let item = {
        //     elementId: shape.elementData.elementId,
        //     data: { x: shape.translation.x, y: shape.translation.y },
        // }
        console.log('shape.elementData.writable', item)

        window.removeEventListener('mousemove', mousemove, false)
        window.removeEventListener('mouseup', mouseup, false)
        two.update()
        updateToGlobalState(item)
    }

    function mousewheel(e) {
        let dy = (e.wheelDeltaY || -e.deltaY) / 1000
        zui.zoomBy(dy, e.clientX, e.clientY)
        two.update()
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
        let touch = e.touches[0]
        if (touch) {
            // Pass through for panning after pinching
            mouse.x = touch.clientX
            mouse.y = touch.clientY
        }
    }

    function panstart(e) {
        let touch = e.touches[0]
        mouse.x = touch.clientX
        mouse.y = touch.clientY
        two.update()
    }

    function panmove(e) {
        let touch = e.touches[0]
        let dx = touch.clientX - mouse.x
        let dy = touch.clientY - mouse.y
        zui.translateSurface(dx, dy)
        mouse.set(touch.clientX, touch.clientY)
        two.update()
    }

    function pinchstart(e) {
        for (let i = 0; i < e.touches.length; i++) {
            let touch = e.touches[i]
            touches[touch.identifier] = touch
        }
        let a = touches[0]
        let b = touches[1]
        let dx = b.clientX - a.clientX
        let dy = b.clientY - a.clientY
        distance = Math.sqrt(dx * dx + dy * dy)
        mouse.x = dx / 2 + a.clientX
        mouse.y = dy / 2 + a.clientY
    }

    function pinchmove(e) {
        for (let i = 0; i < e.touches.length; i++) {
            let touch = e.touches[i]
            touches[touch.identifier] = touch
        }
        let a = touches[0]
        let b = touches[1]
        let dx = b.clientX - a.clientX
        let dy = b.clientY - a.clientY
        let d = Math.sqrt(dx * dx + dy * dy)
        let delta = d - distance
        zui.zoomBy(delta / 250, mouse.x, mouse.y)
        distance = d
    }
}

const Canvas = (props) => {
    const {
        loading: getUserDetailsLoading,
        data: getUserDetailsData,
        error: getUserDetailsError,
    } = useQuery(GET_USER_DETAILS, {
        variables: { id: '4fb2b505-c815-4a01-8fa4-7d7b32468de2' },
    })

    const [twoJSInstance, setTwoJSInstance] = useState(null)
    useEffect(() => {
        // setting pan displacement values to initial
        localStorage.setItem('displacement_x', 0)
        localStorage.setItem('displacement_y', 0)

        console.log('CANVAS CDM', props.selectPanMode)
        const elem = document.getElementById('main-two-root')

        // Logic for capturing events in empty space in drawing area
        document
            .getElementById('main-two-root')
            .addEventListener('mousedown', handleSelectorRectInitialization)

        document
            .getElementById('selector-rect')
            .addEventListener('drag', handleSelectorRectDrag)

        document
            .getElementById('selector-rect')
            .addEventListener('dragend', handleSelectorRectDragEnd)

        const two = new Two({
            fullscreen: true,
            // width: "auto",
        }).appendTo(elem)
        two.update()

        console.log('two', two.scene)

        // two.scene.translation.x = -50
        addZUI(props, updateToGlobalState, two)

        // this.props.getElementsData('CONSTRUCT', arr)
        setTwoJSInstance(two)
    }, [])

    const updateToGlobalState = (newItem) => {
        // props.getElementsData('UPDATE_ELEMENT_DATA', newItem)
    }

    const handleSelectorRectInitialization = (e) => {
        if (props.selectPanMode === false) {
            console.log('event mouse down main root', e, e.target.tagName)
            document.getElementById('main-two-root').focus()
            if (e.target.tagName == 'svg') {
                const rect = document.getElementById('selector-rect')
                rect.style.position = 'absolute'
                rect.style.zIndex = '1'
                rect.style.width = '20px'
                rect.style.height = '20px'
                rect.style.border = '0px dashed grey'
                rect.style.transform = `translateX(${e.x - 10}px) translateY(${
                    e.y - 10
                }px) `
                document.getElementById('main-two-root').blur()
                rect.setAttribute('draggable', true)
            }
        } else {
            document
                .getElementById('main-two-root')
                .removeEventListener(
                    'mousedown',
                    handleSelectorRectInitialization
                )

            document
                .getElementById('selector-rect')
                .removeEventListener('drag', handleSelectorRectDrag)

            document
                .getElementById('selector-rect')
                .removeEventListener('dragend', handleSelectorRectDragEnd)
        }
    }

    const handleSelectorRectDrag = (e) => {
        console.log('selector-rect being dragged', e, props.selectPanMode)
        const rect = document.getElementById('selector-rect')
        rect.style.zIndex = '1'
        rect.style.border = '1px dashed grey'
        rect.style.width = `${Math.abs(e.offsetX)}px`
        rect.style.height = `${Math.abs(e.offsetY)}px`
        console.log('rect getBoundingClientRect', rect.getBoundingClientRect())
    }

    const handleSelectorRectDragEnd = (e) => {
        console.log('selector-rect drag end', e)
        e.stopPropagation()
        e.stopImmediatePropagation()
        e.preventDefault()
        const rect = document.getElementById('selector-rect')
        rect.style.zIndex = '-1'
        rect.style.width = `${Math.abs(e.offsetX)}px`
        rect.style.height = `${Math.abs(e.offsetY)}px`
        rect.setAttribute('draggable', false)
        rect.blur()
        console.log('rect getBoundingClientRect', rect.getBoundingClientRect())
        handleFinalDrag(rect.getBoundingClientRect())
    }

    const handleFinalDrag = (e) => {
        console.log('final drag', e)
        // props.getElementsData('AREA_SELECTION', e)
    }

    const renderElements = () => {
        console.log('At the time of rendering', twoJSInstance.scene.children)

        const elements = props.componentData
        const renderData = elements.map((item) => {
            const NewComponent = ComponentWrapper(item.componentType, {
                twoJSInstance: twoJSInstance,
                id: item.id,
                // childrenArr: item.children,
                itemData: item,
                selectPanMode: props.selectPanMode,
            })
            return (
                <React.Fragment key={item.elementId}>
                    <NewComponent />
                </React.Fragment>
            )
        })

        return renderData
    }

    console.log('getUserDetailsData', getUserDetailsData)

    return (
        <>
            <div id="rsz-rect"></div>
            <div id="selector-rect"></div>
            <div id="pan-dragger"></div>

            <div id="main-two-root"></div>
            {twoJSInstance && (
                <React.Fragment>{renderElements()}</React.Fragment>
            )}
            <Zoomer sceneInstance={twoJSInstance} />
        </>
    )
}

export default Canvas
