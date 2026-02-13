import React, { useEffect, useState, useRef } from 'react'
import PropTypes from 'prop-types'
import interact from 'interactjs'
import { useImmer } from 'use-immer'
import { useBoardContext } from 'views/Board/board'

import { elementOnBlurHandler } from 'utils/misc'
import ElementFactory from 'factory/button'
import getEditComponents from 'components/utils/editWrapper'
import Toolbar from 'components/floatingToolbar'

function Button(props) {
    const {
        addToLocalComponentStore,
        updateComponentBulkPropertiesInLocalStore,
        isPencilMode,
        isArrowDrawMode,
        isArrowSelected,
    } = useBoardContext()

    const [showToolbar, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer({})
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
        const { group, rectTextGroup, text, textGroup, rectangle } =
            elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }

        if (props.parentGroup) {
            /** This element will be rendered and scoped in its parent group */
            const parentGroup = props.parentGroup
            parentGroup.add(rectTextGroup)
            two.update()
        } else {
            /** This element will render by creating it's own group wrapper */
            groupObject = group
            stateRefForGroup.current = group

            const { selector } = getEditComponents(two, group, 2)
            selectorInstance = selector

            group.children.unshift(rectTextGroup)
            two.update()

            document
                .getElementById(group.id)
                .setAttribute('class', 'dragger-picker')
            document
                .getElementById(group.id)
                .setAttribute('data-label', 'button_coord')

            // replace shape and shape id here
            setInternalState((draft) => {
                draft.element = {
                    [rectTextGroup.id]: rectTextGroup,
                    [group.id]: group,
                    // [selector.id]: selector,
                }
                draft.group = {
                    id: group.id,
                    data: group,
                }
                draft.shape = {
                    type: 'button',
                    id: rectangle.id,
                    data: rectangle,
                }
                draft.text = {
                    id: text.id,
                    data: text,
                }
                draft.icon = {
                    data: {},
                }
                draft.textGroup = {
                    id: textGroup.id,
                    data: textGroup,
                }
            })

            const getGroupElementFromDOM = document.getElementById(
                `${group.id}`
            )
            getGroupElementFromDOM.addEventListener('focus', onFocusHandler)
            getGroupElementFromDOM.addEventListener('blur', onBlurHandler)

            // const { mousemove, mouseup } = handleDrag(two, group, 'button')

            interact(`#${group.id}`).on('click', () => {
                console.log('on click ', text.getBoundingClientRect(true))
                selector.update(
                    rectTextGroup.getBoundingClientRect(true).left - 5,
                    rectTextGroup.getBoundingClientRect(true).right + 5,
                    rectTextGroup.getBoundingClientRect(true).top - 5,
                    rectTextGroup.getBoundingClientRect(true).bottom + 5
                )
                two.update()
                // toggleToolbar(true)
            })

            // Captures double click event for text
            // and generates temporary textarea support for it
            text._renderer.elem.addEventListener('click', () => {
                console.log('on click for texy', text.id)

                // Hide actual text and replace it with input box
                const twoTextInstance = document.getElementById(`${text.id}`)
                const getCoordOfBtnText =
                    twoTextInstance.getBoundingClientRect()
                twoTextInstance.style.display = 'none'

                const input = document.createElement('input')
                const topBuffer = 2
                input.type = 'text'
                input.value = text.value
                input.style.color = props.textColor || '#fff'
                input.style.fontSize = '16px'
                input.style.position = 'absolute'
                input.style.top = `${getCoordOfBtnText.top - topBuffer}px`
                input.style.left = `${getCoordOfBtnText.left}px`
                input.style.width = `${
                    rectTextGroup.getBoundingClientRect(true).width
                }px`
                input.className = 'temp-input-area'

                document.getElementById('main-two-root').append(input)

                input.onfocus = function (e) {
                    console.log('on input focus')
                    selector.show()
                    two.update()
                }
                input.focus()

                input.addEventListener('input', () => {
                    let prevTextValue = text.value
                    input.style.width = `${
                        rectTextGroup.getBoundingClientRect(true).width + 4
                    }px`

                    // Synchronously update selector tool's coordinates
                    text.value = input.value

                    // calculate difference to add to vertex's coordinates
                    const diff = text.value.length - prevTextValue.length

                    if (diff < -2) {
                        rectangle.width = rectangle.width + diff * 8 + 20
                    } else {
                        rectangle.width =
                            diff < 0
                                ? rectangle.width + diff * 8
                                : rectangle.width + diff * 14
                    }

                    selector.update(
                        rectTextGroup.getBoundingClientRect(true).left - 5,
                        rectTextGroup.getBoundingClientRect(true).right + 5,
                        rectTextGroup.getBoundingClientRect(true).top - 5,
                        rectTextGroup.getBoundingClientRect(true).bottom + 5
                    )
                    two.update()
                    input.style.left = `${
                        document
                            .getElementById(rectangle.id)
                            .getBoundingClientRect().left + 20
                    }px`
                })

                input.addEventListener('blur', () => {
                    twoTextInstance.style.display = 'block'
                    text.value = input.value
                    input.remove()

                    // USE 4 LINES 4 CIRCLES

                    selector.update(
                        rectTextGroup.getBoundingClientRect(true).left - 5,
                        rectTextGroup.getBoundingClientRect(true).right + 5,
                        rectTextGroup.getBoundingClientRect(true).top - 5,
                        rectTextGroup.getBoundingClientRect(true).bottom + 5
                    )
                    selector.hide()

                    let updateObj = {
                        width: parseInt(rectangle.width),
                        children: {
                            ...props.children,
                            text: {
                                ...props.children?.text,
                                value: text.value,
                            },
                        },
                    }
                    updateComponentBulkPropertiesInLocalStore(
                        props.id,
                        updateObj
                    )
                    two.update()
                })
            })

            interact(`#${group.id}`).resizable({
                edges: { right: true, left: true },

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
                        let target = event.target
                        let rect = event.rect

                        // Restrict width to shrink if it has reached point
                        //  where it's width should be less than or equal to text's
                        if (rect.width > text.getBoundingClientRect().width) {
                            rectangle.width = rect.width
                            selector.update(
                                rectTextGroup.getBoundingClientRect(true).left -
                                    5,
                                rectTextGroup.getBoundingClientRect(true)
                                    .right + 5,
                                rectTextGroup.getBoundingClientRect(true).top -
                                    5,
                                rectTextGroup.getBoundingClientRect(true)
                                    .bottom + 5
                            )
                        }

                        two.update()
                    },
                    end(event) {
                        console.log('the end')

                        let updateObj = {
                            width: parseInt(rectangle.width),
                        }
                        updateComponentBulkPropertiesInLocalStore(
                            props.id,
                            updateObj
                        )
                        getGroupElementFromDOM.removeAttribute('data-resize')
                    },
                },
            })

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
            //             two.update()
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
            //                 'button_coordX',
            //                 parseInt(event.pageX)
            //             )
            //             localStorage.setItem(
            //                 'button_coordY',
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
            console.log('UNMOUNTING in Button', group)
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
            shapeInstance.fill = props.fill ? props.fill : shapeInstance.fill

            two.update()
        }

        // update external svg/icon data
        if (internalState?.text?.data) {
            let textInstance = internalState.text.data
            let textGroupInstance = internalState.textGroup.data
            textInstance.value = props.children?.text?.value
                ? props.children?.text?.value
                : textInstance.value
            textGroupInstance.center()
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
            <div id="two-button"></div>
            {/* {showToolbar ? (
                <Toolbar
                    hideColorIcon={true}
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

export default Button
