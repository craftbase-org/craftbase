import React, { useEffect, useState } from 'react'
import interact from 'interactjs'
import { useDispatch, useSelector } from 'react-redux'
import { useImmer } from 'use-immer'

import { elementOnBlurHandler } from 'utils/misc'
import getEditComponents from 'components/utils/editWrapper'
import handleDrag from 'components/utils/dragger'
import Toolbar from 'components/floatingToolbar'
import { setPeronsalInformation } from 'store/actions/main'
import ElementFactory from 'factory/overlay'

function Overlay(props) {
    const [showToolbar, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer({})
    const dispatch = useDispatch()
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
        const elementFactory = new ElementFactory(two, prevX, prevY, {})
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
                .setAttribute('data-label', 'overlay_coord')

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

            // const { mousemove, mouseup } = handleDrag(two, group, 'overlay')

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
                        const target = event.target
                        const rect = event.rect

                        const minRectHeight = parseInt(rect.height / 2)
                        const minRectWidth = parseInt(rect.width / 2)

                        if (minRectHeight > 20 && minRectWidth > 20) {
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

                        //   target.style.width = rect.width + "px";
                        //   target.style.height = rect.height + "px";

                        //   target.textContent = rect.width + "×" + rect.height;
                        two.update()
                    },
                    end(event) {
                        getGroupElementFromDOM.removeAttribute('data-resize')
                        console.log('the end')
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
            //                 'overlay_coordX',
            //                 parseInt(event.pageX)
            //             )
            //             localStorage.setItem(
            //                 'overlay_coordY',
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
            console.log('UNMOUNTING in Overlay', group)
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
    }, [props.x, props.y, props.metadata])

    function closeToolbar() {
        toggleToolbar(false)
    }

    return (
        <React.Fragment>
            <div id="two-overlay"></div>
            {showToolbar ? (
                <Toolbar
                    toggle={showToolbar}
                    componentState={internalState}
                    closeToolbar={closeToolbar}
                    updateComponent={() => {
                        two.update()
                    }}
                />
            ) : null}
            {/* <button>change button in group</button> */}
        </React.Fragment>
    )
}

export default Overlay
