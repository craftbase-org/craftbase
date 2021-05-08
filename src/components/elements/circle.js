import React, { useEffect, useState } from 'react'
import interact from 'interactjs'
import { useDispatch, useSelector } from 'react-redux'
import { useImmer } from 'use-immer'

// import Panzoom from '@panzoom/panzoom'

import handleDrag from 'components/utils/dragger'
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

            const { mousemove, mouseup } = handleDrag(two, group)
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
                    start(event) {
                        console.log('start resize event', event)
                        window.removeEventListener(
                            'mousemove',
                            mousemove,
                            false
                        )
                        window.removeEventListener('mouseup', mouseup, false)
                    },
                    move(event) {
                        console.log('on resize event', event)
                        const target = event.target
                        const rect = event.rect
                        event.stopPropagation()

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
