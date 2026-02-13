import React, { useEffect, useState, useRef } from 'react'
import interact from 'interactjs'
import { useImmer } from 'use-immer'
import { useMutation } from '@apollo/client'
import { useBoardContext } from 'views/Board/board'

import { UPDATE_COMPONENT_INFO } from 'schema/mutations'
import { elementOnBlurHandler } from 'utils/misc'
import getEditComponents from 'components/utils/editWrapper'
import ElementFactory from 'factory/avatar'
import Toolbar from 'components/floatingToolbar'

function Avatar(props) {
    const {
        addToLocalComponentStore,
        updateComponentBulkPropertiesInLocalStore,
        isPencilMode,
        isArrowDrawMode,
        isArrowSelected,
    } = useBoardContext()
    const [updateComponentInfo] = useMutation(UPDATE_COMPONENT_INFO, {
        ignoreResults: true,
    })
    const [showToolbar, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer({ externalSVG: null })
    const stateRefForGroup = useRef()

    const two = props.twoJSInstance
    let selectorInstance = null
    let groupObject = null

    function onBlurHandler(e) {
        if (
            e?.relatedTarget?.id === 'floating-toolbar' ||
            e?.relatedTarget?.dataset.parent === 'floating-toolbar'
        ) {
            const getGroupElementFromDOM = document.getElementById(
                `${stateRefForGroup.current.id}`
            )
            // set the focus and on blur recursively until no floating toolbar touch is observed
            getGroupElementFromDOM.focus()
            getGroupElementFromDOM.addEventListener('blur', onBlurHandler)
        } else {
            selectorInstance && selectorInstance.hide()
            two.update()
            document.getElementById(`${groupObject.id}`) &&
                document
                    .getElementById(`${groupObject.id}`)
                    .removeEventListener('keydown', handleKeyDown)
        }
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
        const elementFactory = new ElementFactory(two, prevX, prevY, {
            ...props,
        })
        // Get all instances of every sub child element
        const { group, circleSvgGroup, circle, externalSVG, externalSVGGroup } =
            elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }

        if (props.parentGroup) {
            /** This element will be rendered and scoped in its parent group */
            const parentGroup = props.parentGroup
            circleSvgGroup.translation.x = props.metaData.x

            parentGroup.add(circleSvgGroup)
            two.update()
        } else {
            /** This element will render by creating it's own group wrapper */
            groupObject = group
            stateRefForGroup.current = group
            // After creating group, pass it's instance to selector class
            const { selector } = getEditComponents(two, group, 4)
            selectorInstance = selector

            group.children.unshift(circleSvgGroup)
            two.update()

            document
                .getElementById(group.id)
                .setAttribute('class', 'dragger-picker avatar_coord')
            document
                .getElementById(group.id)
                .setAttribute('data-label', 'avatar_coord')

            setInternalState((draft) => {
                draft.element = {
                    [circleSvgGroup.id]: circleSvgGroup,
                    [group.id]: group,
                    // [selector.id]: selector,
                }
                draft.group = {
                    id: group.id,
                    data: group,
                }
                draft.shape = {
                    type: 'avatar',
                    id: circle.id,
                    data: circle,
                }
                draft.icon = {
                    id: externalSVG.id,
                    data: externalSVG,
                }
                draft.externalSVGGroup = {
                    id: externalSVGGroup.id,
                    data: externalSVGGroup,
                }
            })

            const getGroupElementFromDOM = document.getElementById(
                `${group.id}`
            )
            getGroupElementFromDOM.addEventListener('focus', onFocusHandler)
            getGroupElementFromDOM.addEventListener('blur', onBlurHandler)

            // const { mousemove, mouseup } = handleDrag(two, group, 'avatar')

            interact(`#${group.id}`).on('click', () => {
                console.log('on click ')
                selector.update(
                    circle.getBoundingClientRect(true).left - 3,
                    circle.getBoundingClientRect(true).right + 3,
                    circle.getBoundingClientRect(true).top - 3,
                    circle.getBoundingClientRect(true).bottom + 3
                )
                two.update()
                // toggleToolbar(true)
            })

            // Apply resizable property to element
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
                        let initialScaleCoefficient = parseInt(
                            circle.radius / externalSVG.scale
                        )

                        const rect = event.rect
                        const rectRadii = parseInt(rect.width / 2)

                        // Prevent the circle radius to be shrinked to less than 10
                        if (rectRadii > 11) {
                            // update the element's style
                            circle.width = rect.width
                            circle.height = rect.height
                            circle.radius = parseInt(rect.width / 2)

                            // console.log("circle.radius", circle.radius);
                            externalSVG.scale =
                                circle.radius / initialScaleCoefficient
                            externalSVGGroup.center()

                            selector.update(
                                circle.getBoundingClientRect(true).left - 3,
                                circle.getBoundingClientRect(true).right + 3,
                                circle.getBoundingClientRect(true).top - 3,
                                circle.getBoundingClientRect(true).bottom + 3
                            )
                        }

                        two.update()
                    },
                    end(event) {
                        const userId = localStorage.getItem('userId')
                        console.log('the end')

                        let updateObj = {
                            width: parseInt(circle.width),
                            height: parseInt(circle.height),
                            updatedBy: userId,
                            children: {
                                ...props.children,
                                icon: {
                                    iconType:
                                        props.children?.icon?.iconType || null,
                                    iconStroke:
                                        props.children?.icon?.iconStroke ||
                                        null,
                                    iconScale: externalSVG.scale,
                                },
                            },
                        }
                        updateComponentBulkPropertiesInLocalStore(
                            props.id,
                            updateObj
                        )
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
            //             console.log(
            //                 'event x',
            //                 event.target.getBoundingClientRect(),
            //                 event.rect.left,
            //                 event.pageX,
            //                 event.clientX
            //             )
            //             // alternate -> take event.rect.left for x
            //             localStorage.setItem(
            //                 'avatar_coordX',
            //                 parseInt(event.pageX)
            //             )

            //             localStorage.setItem(
            //                 'avatar_coordY',
            //                 parseInt(event.pageY - offsetHeight)
            //             )
            //             dispatch(
            //                 setPeronsalInformation('COMPLETE', { data: {} })
            //             )
            //         },
            //     },
            // })
        }

        return () => {
            console.log('UNMOUNTING in Avatar', group)
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

        // update internal shape data
        if (internalState?.shape?.data) {
            let shapeInstance = internalState.shape.data

            shapeInstance.width = props.width
                ? props.width
                : shapeInstance.width
            shapeInstance.height = props.height
                ? props.height
                : shapeInstance.height
            shapeInstance.radius = parseInt(shapeInstance.width / 2)
            shapeInstance.fill = props.fill ? props.fill : shapeInstance.fill

            two.update()
        }

        // update external svg/icon data
        if (internalState?.icon?.data) {
            let externalSVGInstance = internalState.icon.data
            let externalSVGGroupInstance = internalState.externalSVGGroup.data
            externalSVGInstance.scale = props.children?.icon?.iconScale
                ? props.children?.icon?.iconScale
                : externalSVGInstance.scale
            externalSVGGroupInstance.center()
            two.update()
        }
    }, [
        props.x,
        props.y,
        props.fill,
        props.width,
        props.height,
        props.children,
    ])

    // When pencil mode is active, disable pointer events on this component
    useEffect(() => {
        const groupId = internalState?.group?.id
        if (groupId && document.getElementById(groupId)) {
            document.getElementById(groupId).style.pointerEvents = (isPencilMode || isArrowDrawMode || isArrowSelected)
                ? 'none'
                : 'auto'
        }
    }, [isPencilMode, isArrowDrawMode, isArrowSelected, internalState?.group?.id])

    function closeToolbar() {
        toggleToolbar(false)
    }

    return (
        <React.Fragment>
            <div id="two-avatar"></div>
            {/* {showToolbar ? (
                <Toolbar
                    toggle={showToolbar}
                    componentState={internalState}
                    closeToolbar={closeToolbar}
                    componentId={props.id}
                    postToolbarUpdate={() => {
                        two.update()
                    }}
                />
            ) : null} */}
        </React.Fragment>
    )
}

// Avatar.propTypes = {
//   x: PropTypes.string,
//   y: PropTypes.string,
// };

// Avatar.defaultProps = {
//   x: 100,
//   y: 50,
// };

export default Avatar
