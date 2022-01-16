import React, { useEffect, useState } from 'react'
import interact from 'interactjs'
import { useMutation } from '@apollo/client'
import { useImmer } from 'use-immer'

// import Panzoom from '@panzoom/panzoom'
import { UPDATE_COMPONENT_INFO } from 'schema/mutations'
import handleDrag from 'components/utils/dragger'
import { elementOnBlurHandler } from 'utils/misc'
import { setPeronsalInformation } from 'store/actions/main'
import getEditComponents from 'components/utils/editWrapper'
import CircleFactory from 'factory/circle'
import { color_blue, defaultScaleConstant } from 'utils/constants'
import Toolbar from 'components/floatingToolbar'

function Circle(props) {
    const [updateComponentInfo] = useMutation(UPDATE_COMPONENT_INFO, {
        ignoreResults: true,
    })
    const selectedComponents = []

    const [showToolbar, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer({})

    const two = props.twoJSInstance
    let selectorInstance = null
    let toolbarInstance = null
    let groupObject = null

    function onBlurHandler(e) {
        elementOnBlurHandler(e, selectorInstance, two)
        document.getElementById(`${groupObject.id}`) &&
            document
                .getElementById(`${groupObject.id}`)
                .removeEventListener('keydown', handleKeyDown)
    }

    function handleKeyDown(e) {
        if (e.keyCode === 8 || e.keyCode === 46) {
            console.log('handle key down event', e)
            // DELETE/BACKSPACE KEY WAS PRESSED
            props.handleDeleteComponent &&
                props.handleDeleteComponent(groupObject)
            two.remove([groupObject])
            two.update()
        }
    }

    function onFocusHandler(e) {
        document.getElementById(`${groupObject.id}`).style.outline = 0
        document
            .getElementById(`${groupObject.id}`)
            .addEventListener('keydown', handleKeyDown)
    }

    // Using unmount phase to remove event listeners
    useEffect(() => {
        // Calculate x and y through dividing width and height by 2 or vice versa
        // if x and y are given then multiply width and height into 2
        const offsetHeight = 0

        const prevX = props.x
        const prevY = props.y

        // Instantiate factory
        const elementFactory = new CircleFactory(two, prevX, prevY, {
            ...props,
        })
        // Get all instances of every sub child element
        const { group, circle } = elementFactory.createElement()
        group.elementData = props?.itemData

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

            document
                .getElementById(group.id)
                .setAttribute('class', 'dragger-picker')

            // setting database's id in html attribute of element
            document
                .getElementById(group.id)
                .setAttribute('data-component-id', props.id)

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

            // const { mousemove, mouseup } = handleDrag(two, group, 'Circle')

            interact(`#${group.id}`).on('click', () => {
                // two.scene.scale = 1
                console.log('on click circle', group)
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
                        console.log('on resize event', event)
                        const target = event.target
                        const rect = event.rect
                        event.stopPropagation()

                        // update the element's style
                        //   resizeRect.width = rect.width;
                        circle.width = rect.width
                        circle.height = rect.height

                        selector.update(
                            circle.getBoundingClientRect(true).left - 10,
                            circle.getBoundingClientRect(true).right + 10,
                            circle.getBoundingClientRect(true).top - 10,
                            circle.getBoundingClientRect(true).bottom + 10
                        )

                        two.update()
                    },
                    end(event) {
                        console.log('the end', circle)
                        updateComponentInfo({
                            variables: {
                                id: props.id,
                                updateObj: {
                                    width: parseInt(circle.width),
                                    height: parseInt(circle.height),
                                },
                            },
                        })
                        getGroupElementFromDOM.removeAttribute('data-resize')
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

            shapeInstance.width = props.width
                ? props.width
                : shapeInstance.width
            shapeInstance.height = props.height
                ? props.height
                : shapeInstance.height
            shapeInstance.fill = props.fill ? props.fill : shapeInstance.fill

            two.update()
        }
    }, [props.x, props.y, props.fill, props.width, props.height])

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
            )}
        </React.Fragment>
    )
}

export default Circle
