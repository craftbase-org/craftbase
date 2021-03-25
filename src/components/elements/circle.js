import React, { useEffect, useState } from 'react'
import interact from 'interactjs'
import { useDispatch, useSelector } from 'react-redux'
import { useImmer } from 'use-immer'
import Two from 'two.js'
import Zui from 'two.js/extras/zui'
import ZUI from 'two.js/extras/zui'
import Panzoom from 'panzoom'
// import Panzoom from '@panzoom/panzoom'

import { elementOnBlurHandler } from 'utils/misc'
import { setPeronsalInformation } from 'store/actions/main'
import getEditComponents from 'components/utils/editWrapper'
import CircleFactory from 'factory/circle'
import { color_blue, defaultScaleConstant } from 'utils/constants'
import Toolbar from 'components/floatingToolbar'

function Circle(props) {
    const selectedComponents = useSelector(
        (state) => state.main.selectedComponents
    )
    const [showToolbar, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer({})
    const dispatch = useDispatch()
    const two = props.twoJSInstance
    let selectorInstance = null
    let toolbarInstance = null
    let groupObject = null

    function onBlurHandler(e) {
        elementOnBlurHandler(e, selectorInstance, two)
    }

    function onFocusHandler(e) {
        document.getElementById(`${groupObject.id}`).style.outline = 0
    }

    // Using unmount phase to remove event listeners
    useEffect(() => {
        // Calculate x and y through dividing width and height by 2 or vice versa
        // if x and y are given then multiply width and height into 2
        const offsetHeight = 0

        const prevX = localStorage.getItem('Circle_coordX')
        const prevY = localStorage.getItem('Circle_coordY')

        // Instantiate factory
        const elementFactory = new CircleFactory(two, prevX, prevY, {})
        // Get all instances of every sub child element
        const { group, circle } = elementFactory.createElement()

        if (props.parentGroup) {
            /** This element will be rendered and scoped in its parent group */
            console.log('properties of circle', props)
            const parentGroup = props.parentGroup
            circle.translation.x = props.properties.x
            circle.translation.y = props.properties.y
            parentGroup.add(circle)
            two.update()
        } else {
            /** This element will render by creating it's own group wrapper */
            groupObject = group

            const { selector } = getEditComponents(two, group, 4)
            selectorInstance = selector
            group.children.unshift(circle)
            two.update()
            // console.log('two circle', group.id)
            const initialSceneCoords = document
                .getElementById(two.scene.id)
                .getBoundingClientRect()
            console.log('initialSceneCoords', initialSceneCoords)

            setInternalState((draft) => {
                draft.element = {
                    [circle.id]: circle,
                    [group.id]: group,
                    // [selector.id]: selector,
                }
                draft.group = {
                    id: group.id,
                    data: group,
                }
                draft.shape = {
                    id: circle.id,
                    data: circle,
                }
                draft.text = {
                    data: {},
                }
                draft.icon = {
                    data: {},
                }
            })

            const getGroupElementFromDOM = document.getElementById(
                `${group.id}`
            )
            getGroupElementFromDOM.addEventListener('focus', onFocusHandler)
            getGroupElementFromDOM.addEventListener('blur', onBlurHandler)

            // If component is in area of selection frame/tool, programmatically enable it's selector
            if (selectedComponents.includes(props.id)) {
                console.log('selectedComponents', selectedComponents)

                // forcefully
                // document.getElementById(`${group.id}`).focus();

                selector.update(
                    circle.getBoundingClientRect(true).left - 10,
                    circle.getBoundingClientRect(true).right + 10,
                    circle.getBoundingClientRect(true).top - 10,
                    circle.getBoundingClientRect(true).bottom + 10
                )
            }

            interact(`#${group.id}`).on('click', () => {
                // two.scene.scale = 1
                console.log(
                    'on click circle',
                    circle.getBoundingClientRect(true),
                    circle.getBoundingClientRect(),
                    getGroupElementFromDOM.getBoundingClientRect()
                )
                selector.update(
                    circle.getBoundingClientRect(true).left - 10,
                    circle.getBoundingClientRect(true).right + 10,
                    circle.getBoundingClientRect(true).top - 10,
                    circle.getBoundingClientRect(true).bottom + 10
                )
                two.update()
                toggleToolbar(true)
            })
            // Apply resizable property to element
            interact(`#${group.id}`).resizable({
                edges: { right: true, left: true, top: true, bottom: true },

                listeners: {
                    move(event) {
                        const target = event.target
                        const rect = event.rect

                        // update the element's style
                        //   resizeRect.width = rect.width;
                        circle.width = rect.width
                        circle.height = rect.height
                        circle.radius = parseInt(rect.width / 2)

                        selector.update(
                            circle.getBoundingClientRect(true).left - 10,
                            circle.getBoundingClientRect(true).right + 10,
                            circle.getBoundingClientRect(true).top - 10,
                            circle.getBoundingClientRect(true).bottom + 10
                        )

                        two.update()
                    },
                    end(event) {
                        console.log('the end')
                    },
                },
            })

            let thisRef = this
            addZUI()
            function addZUI() {
                console.log('group scene', group, two.scene)
                // zuifn()

                let domElement = group._renderer.elem
                let zui = new ZUI(group, domElement)

                let mouse = new Two.Vector(
                    group.translation.x,
                    group.translation.y
                )
                let touches = {}
                let distance = 0
                two.update()
                // zui.addLimits(0.06, 8)
                console.log('mouse vector', mouse)
                domElement.addEventListener('mousedown', mousedown, false)
                domElement.addEventListener('mousewheel', mousewheel, false)
                domElement.addEventListener('wheel', mousewheel, false)

                // domElement.addEventListener('touchstart', touchstart, false)
                // domElement.addEventListener('touchmove', touchmove, false)
                // domElement.addEventListener('touchend', touchend, false)
                // domElement.addEventListener('touchcancel', touchend, false)

                function mousedown(e) {
                    console.log(
                        'mouse event circle 1',
                        e,
                        mouse,
                        group.translation
                    )
                    mouse.x = e.clientX
                    mouse.y = e.clientY
                    window.addEventListener('mousemove', mousemove, false)
                    window.addEventListener('mouseup', mouseup, false)
                }

                function mousemove(e) {
                    let dx = e.clientX - mouse.x
                    let dy = e.clientY - mouse.y
                    console.log(
                        'mouse event circle 2',
                        e,
                        mouse,
                        group.translation,
                        dx,
                        dy
                    )
                    zui.translateSurface(dx, dy)
                    mouse.set(e.clientX, e.clientY)
                    group.translation.set(e.clientX, e.clientY)
                    two.update()
                }

                function mouseup(e) {
                    console.log('mouse event circle 3', e)
                    window.removeEventListener('mousemove', mousemove, false)
                    window.removeEventListener('mouseup', mouseup, false)
                    two.update()
                }

                function mousewheel(e) {
                    let dy = (e.wheelDeltaY || -e.deltaY) / 1000
                    zui.zoomBy(dy, e.clientX, e.clientY)
                    two.update()
                }

                // function touchstart(e) {
                //     console.log('e in ZUI touch start', e)
                //     switch (e.touches.length) {
                //         case 2:
                //             pinchstart(e)
                //             break
                //         case 1:
                //             panstart(e)
                //             break
                //     }
                // }

                // function touchmove(e) {
                //     switch (e.touches.length) {
                //         case 2:
                //             pinchmove(e)
                //             break
                //         case 1:
                //             panmove(e)
                //             break
                //     }
                // }

                // function touchend(e) {
                //     touches = {}
                //     var touch = e.touches[0]
                //     if (touch) {
                //         // Pass through for panning after pinching
                //         mouse.x = touch.clientX
                //         mouse.y = touch.clientY
                //     }
                //     two.update()
                // }

                // function panstart(e) {
                //     var touch = e.touches[0]
                //     mouse.x = touch.clientX
                //     mouse.y = touch.clientY
                //     two.update()
                // }

                // function panmove(e) {
                //     var touch = e.touches[0]
                //     var dx = touch.clientX - mouse.x
                //     var dy = touch.clientY - mouse.y
                //     zui.translateSurface(dx, dy)
                //     mouse.set(touch.clientX, touch.clientY)
                //     two.update()
                // }

                // function pinchstart(e) {
                //     for (var i = 0; i < e.touches.length; i++) {
                //         var touch = e.touches[i]
                //         touches[touch.identifier] = touch
                //     }
                //     var a = touches[0]
                //     var b = touches[1]
                //     var dx = b.clientX - a.clientX
                //     var dy = b.clientY - a.clientY
                //     distance = Math.sqrt(dx * dx + dy * dy)
                //     mouse.x = dx / 2 + a.clientX
                //     mouse.y = dy / 2 + a.clientY
                //     two.update()
                // }

                // function pinchmove(e) {
                //     for (var i = 0; i < e.touches.length; i++) {
                //         var touch = e.touches[i]
                //         touches[touch.identifier] = touch
                //     }
                //     var a = touches[0]
                //     var b = touches[1]
                //     var dx = b.clientX - a.clientX
                //     var dy = b.clientY - a.clientY
                //     var d = Math.sqrt(dx * dx + dy * dy)
                //     var delta = d - distance
                //     zui.zoomBy(delta / 250, mouse.x, mouse.y)
                //     distance = d
                //     two.update()
                // }
            }

            // Apply draggable property to element
            // interact(`#${group.id}`).draggable({
            //     // enable inertial throwing
            //     inertia: false,

            //     listeners: {
            //         start(event) {
            //             // console.log(event.type, event.target);
            //         },
            //         move(event) {
            //             // let newSceneCoords = document
            //             //     .getElementById(two.scene.id)
            //             //     .getBoundingClientRect()
            //             console.log('drag event circle', event)
            //             // let scaleDiff = (two.scene.scale - 1) / 0.2
            //             // let newDim =
            //             //     defaultScaleConstant * Math.floor(scaleDiff)
            //             // console.log(
            //             //     'two scene',
            //             //     Math.floor(scaleDiff),
            //             //     newDim,
            //             //     Math.floor(two.scene.scale)
            //             // )
            //             if (props.selectCursorMode) {
            //                 event.target.style.transform = `translate(${
            //                     event.pageX
            //                 }px, ${event.pageY - offsetHeight}px)`
            //             } else {
            //                 const newSceneX = two.scene.translation.x
            //                 const newSceneY = two.scene.translation.y
            //                 event.target.style.transform = `translate(${
            //                     event.pageX - newSceneX
            //                 }px, ${event.pageY - offsetHeight - newSceneY}px)`
            //             }
            //         },
            //         end(event) {
            //             const newSceneX = two.scene.translation.x
            //             const newSceneY = two.scene.translation.y
            //             console.log(
            //                 'event x',
            //                 event.target.getBoundingClientRect(),
            //                 event.rect.left,
            //                 event.pageX,
            //                 event.clientX
            //             )
            //             // alternate -> take event.rect.left for x
            //             if (props.selectCursorMode) {
            //                 localStorage.setItem(
            //                     'Circle_coordX',
            //                     parseInt(event.pageX)
            //                 )
            //                 localStorage.setItem(
            //                     'Circle_coordY',
            //                     parseInt(event.pageY - offsetHeight)
            //                 )
            //             } else {
            //                 localStorage.setItem(
            //                     'Circle_coordX',
            //                     parseInt(event.pageX - newSceneX)
            //                 )
            //                 localStorage.setItem(
            //                     'Circle_coordY',
            //                     parseInt(event.pageY - offsetHeight - newSceneY)
            //                 )
            //             }

            //             group.translation.x = event.pageX
            //             group.translation.y = event.pageY
            //             two.update()
            //             dispatch(
            //                 setPeronsalInformation('COMPLETE', { data: {} })
            //             )
            //         },
            //     },
            // })
        }

        return () => {
            console.log('UNMOUNTING in Circle', group)
            // clean garbage by removing instance
            two.remove(group)
        }
    }, [])

    function closeToolbar() {
        toggleToolbar(false)
    }

    return (
        <React.Fragment>
            <div id="two-Circle"></div>
            {/* <button>change button in group</button> */}
            {showToolbar && (
                <Toolbar
                    toggle={showToolbar}
                    componentState={internalState}
                    closeToolbar={closeToolbar}
                    updateComponent={() => {
                        two.update()
                    }}
                />
            )}
        </React.Fragment>
    )
}

export default Circle
