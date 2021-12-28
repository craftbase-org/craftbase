import React, { useEffect, useState } from 'react'
import interact from 'interactjs'
import { useMutation } from '@apollo/client'
import idx from 'idx'
import { useImmer } from 'use-immer'
import Panzoom from 'panzoom'

import { UPDATE_COMPONENT_INFO } from 'schema/mutations'
import getEditComponents from 'components/utils/editWrapper'
import handleDrag from 'components/utils/dragger'
import { setPeronsalInformation } from 'store/actions/main'
import { UPDATE_ELEMENT_DATA } from 'store/types'
import ElementFactory from 'factory/rectangle'
import { elementOnBlurHandler } from 'utils/misc'
import Toolbar from 'components/floatingToolbar'

function Rectangle(props) {
    const [updateComponentInfo] = useMutation(UPDATE_COMPONENT_INFO, {
        ignoreResults: true,
    })
    const selectedComponents = []
    const [showToolbar, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer({})

    const two = props.twoJSInstance
    let selectorInstance = null
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
        const prevX = props.x
        const prevY = props.y

        // Instantiate factory
        const elementFactory = new ElementFactory(two, prevX, prevY, {
            ...props,
        })
        // Get all instances of every sub child element
        const { group, rectangle } = elementFactory.createElement()
        group.elementData = props?.itemData

        if (props.parentGroup) {
            /** This element will be rendered and scoped in its parent group */
            const parentGroup = props.parentGroup
            parentGroup.add(rectangle)
            two.update()
        } else {
            /** This element will render by creating it's own group wrapper */
            groupObject = group

            const { selector } = getEditComponents(two, group, 4)
            selectorInstance = selector
            group.children.unshift(rectangle)
            two.update()

            document
                .getElementById(group.id)
                .setAttribute('class', 'dragger-picker')
            document
                .getElementById(group.id)
                .setAttribute('data-label', 'rectangle_coord')

            setInternalState((draft) => {
                draft.element = {
                    [rectangle.id]: rectangle,
                    [group.id]: group,
                    // [selector.id]: selector,
                }
                draft.group = {
                    id: group.id,
                    data: group,
                }
                draft.shape = {
                    type: 'rectangle',
                    id: rectangle.id,
                    data: rectangle,
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

                selector.update(
                    rectangle.getBoundingClientRect(true).left - 10,
                    rectangle.getBoundingClientRect(true).right + 10,
                    rectangle.getBoundingClientRect(true).top - 10,
                    rectangle.getBoundingClientRect(true).bottom + 10
                )
            }

            // const { mousemove, mouseup } = handleDrag(two, group, 'rectangle')

            interact(`#${group.id}`).on('click', () => {
                console.log('on click ')
                selector.update(
                    rectangle.getBoundingClientRect(true).left - 10,
                    rectangle.getBoundingClientRect(true).right + 10,
                    rectangle.getBoundingClientRect(true).top - 10,
                    rectangle.getBoundingClientRect(true).bottom + 10
                )
                two.update()

                toggleToolbar(true)
            })

            // RESIZE SHAPE LOGIC
            interact(`#${group.id}`).resizable({
                edges: { right: true, left: true, top: true, bottom: true },

                listeners: {
                    start() {
                        getGroupElementFromDOM.setAttribute(
                            'data-resize',
                            'true'
                        )
                        // window.removeEventListener(
                        //     'mousemove',
                        //     mousemove,
                        //     false
                        // )
                        // window.removeEventListener('mouseup', mouseup, false)
                    },
                    move(event) {
                        console.log('rect event move', event.pageX)
                        const target = event.target
                        const rect = event.rect

                        const minRectHeight = parseInt(rect.height / 2)
                        const minRectWidth = parseInt(rect.width / 2)

                        if (minRectHeight > 20 && minRectWidth > 20) {
                            // only update rectangle width and height if criteria matches
                            // criteria: to not allow less than "10px" of width or height while resizing
                            rectangle.width = rect.width
                            rectangle.height = rect.height

                            selector.update(
                                rectangle.getBoundingClientRect(true).left - 10,
                                rectangle.getBoundingClientRect(true).right +
                                    10,
                                rectangle.getBoundingClientRect(true).top - 10,
                                rectangle.getBoundingClientRect(true).bottom +
                                    10
                            )
                        }

                        two.update()
                    },
                    end(event) {
                        getGroupElementFromDOM.removeAttribute('data-resize')
                        updateComponentInfo({
                            variables: {
                                id: props.id,
                                updateObj: {
                                    height: parseInt(rectangle.height),
                                    width: parseInt(rectangle.width),
                                },
                            },
                        })
                        console.log(
                            'rect event end',
                            event.pageX,
                            rectangle.width,
                            rectangle.height
                        )
                        console.log('the end')
                    },
                },
            })

            // DRAG SHAPE LOGIC
            // interact(`#${group.id}`).draggable({
            //     // enable inertial throwing
            //     inertia: false,

            //     listeners: {
            //         start(event) {
            //             // console.log(event.type, event.target);
            //         },
            //         move(event) {
            //             event.target.style.transform = `translate(${
            //                 event.pageX
            //             }px, ${event.pageY - offsetHeight}px)`
            //         },
            //         end(event) {
            //             console.log(
            //                 'event x',
            //                 event.target.getBoundingClientRect(),
            //                 event.rect.left,
            //                 event.pageX,
            //                 event.clientX
            //             )
            //             // alternate -> take event.rect.left for x
            //             localStorage.setItem(
            //                 'rectangle_coordX',
            //                 parseInt(event.pageX)
            //             )
            //             localStorage.setItem(
            //                 'rectangle_coordY',
            //                 parseInt(event.pageY - offsetHeight)
            //             )
            //             group.translation.x = event.pageX
            //             two.update()
            //             dispatch(
            //                 setPeronsalInformation('COMPLETE', {
            //                     data: {},
            //                     shapeObj: { rectangle },
            //                     fill: rectangle.fill,
            //                     translationX: group.translation.x,
            //                     translationY: group.translation.y,
            //                 })
            //             )
            //             dispatch(
            //                 setPeronsalInformation(UPDATE_ELEMENT_DATA, {
            //                     data: {
            //                         id: props.id,
            //                         property: 'x',
            //                         value: group.translation.x,
            //                     },
            //                 })
            //             )
            //             dispatch(
            //                 setPeronsalInformation(UPDATE_ELEMENT_DATA, {
            //                     data: {
            //                         id: props.id,
            //                         property: 'y',
            //                         value: group.translation.y,
            //                     },
            //                 })
            //             )
            //         },
            //     },
            // })
        }

        return () => {
            console.log('UNMOUNTING in Rectangle', group)
            // clean garbage by removing instance
            // two.remove(group)
        }
    }, [])

    useEffect(() => {
        if (internalState?.group?.data) {
            let groupInstance = internalState.group.data
            groupInstance.translation.x = props.x
            groupInstance.translation.y = props.y
            two.update()
        }
        if (internalState?.shape?.data) {
            let shapeInstance = internalState.shape.data
            shapeInstance.width = props.width || shapeInstance.width
            shapeInstance.height = props.height || shapeInstance.height
            shapeInstance.fill = props.fill || shapeInstance.fill

            two.update()
        }
    }, [props.x, props.y, props.width, props.height, props.fill])

    function closeToolbar() {
        toggleToolbar(false)
    }

    return (
        <React.Fragment>
            <div id="two-rectangle"></div>
            {showToolbar && <button> Rectangles </button>}
            {/* <button>change button in group</button> */}
            {showToolbar ? (
                <Toolbar
                    toggle={showToolbar}
                    componentState={internalState}
                    closeToolbar={closeToolbar}
                    updateComponent={(propertyToUpdate, propertyValue) => {
                        propertyToUpdate &&
                            propertyValue &&
                            updateComponentInfo({
                                variables: {
                                    id: props.id,
                                    updateObj: {
                                        [propertyToUpdate]: propertyValue,
                                    },
                                },
                            })
                        two.update()
                    }}
                />
            ) : null}
            {/* <Toolbar toggle={toolbar} /> */}
        </React.Fragment>
    )
}

export default Rectangle
