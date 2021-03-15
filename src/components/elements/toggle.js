import React, { useEffect, useState } from 'react'
import interact from 'interactjs'
import { useDispatch, useSelector } from 'react-redux'
import { useImmer } from 'use-immer'

import { elementOnBlurHandler } from 'utils/misc'
import { color_blue } from 'utils/constants'
import getEditComponents from 'components/utils/editWrapper'
import Toolbar from 'components/floatingToolbar'
import { setPeronsalInformation } from 'store/actions/main'
import ElementCreator from 'factory/toggle'

function Toggle(props) {
    const [showToolbar, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer({
        toggleState: true,
    })
    const dispatch = useDispatch()
    const two = props.twoJSInstance
    let selectorInstance = null
    let groupObject = null
    let isDragActive = false

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
        const prevX = localStorage.getItem('toggle_coordX')
        const prevY = localStorage.getItem('toggle_coordY')

        const elementFactory = new ElementCreator(two, prevX, prevY, {})
        const {
            group,
            circle,
            rectCircleGroup,
            rect,
        } = elementFactory.createElement()

        if (props.parentGroup) {
            /** This element will be rendered and scoped in its parent group */
            const parentGroup = props.parentGroup
            parentGroup.add(rectCircleGroup)
            two.update()
        } else {
            /** This element will render by creating it's own group wrapper */
            groupObject = group
            const { selector } = getEditComponents(two, group, 4)
            selectorInstance = selector

            group.children.unshift(rectCircleGroup)
            two.update()

            setInternalState((draft) => {
                draft.element = {
                    [rect.id]: rect,
                    [group.id]: group,
                    [rectCircleGroup.id]: rectCircleGroup,
                    // [selector.id]: selector,
                }
                draft.group = {
                    id: group.id,
                    data: group,
                }
                draft.shape = {
                    id: rectCircleGroup.id,
                    data: rectCircleGroup,
                }
                draft.text = {
                    data: {},
                }
                draft.icon = {
                    id: circle.id,
                    data: circle,
                }
            })

            const getGroupElementFromDOM = document.getElementById(
                `${group.id}`
            )
            getGroupElementFromDOM.addEventListener('focus', onFocusHandler)
            getGroupElementFromDOM.addEventListener('blur', onBlurHandler)

            // Does capture event of toggle me button rendered prior to this element rendering
            document.getElementById(group.id).addEventListener('click', (e) => {
                if (isDragActive) {
                    isDragActive = false
                } else {
                    let toggleCircle = circle
                    let toggleRect = rect
                    const calcCirclePointX = parseInt(toggleRect.width / 4)
                    console.log('isDragActive click', isDragActive)
                    if (toggleCircle.translation.x > 0) {
                        toggleCircle.translation.x = parseInt(-calcCirclePointX)
                        toggleRect.fill = '#ccc'
                        two.update()
                    } else {
                        toggleCircle.translation.x = parseInt(calcCirclePointX)
                        toggleRect.fill = color_blue
                        two.update()
                    }
                }
            })

            interact(`#${group.id}`).on('click', () => {
                selector.update(
                    rectCircleGroup.getBoundingClientRect(true).left - 4,
                    rectCircleGroup.getBoundingClientRect(true).right + 4,
                    rectCircleGroup.getBoundingClientRect(true).top - 4,
                    rectCircleGroup.getBoundingClientRect(true).bottom + 4
                )
                two.update()
                toggleToolbar(true)
            })

            // Apply draggable property to element
            interact(`#${group.id}`).draggable({
                // enable inertial throwing
                inertia: false,

                listeners: {
                    start(event) {
                        // console.log(event.type, event.target);
                    },
                    move(event) {
                        event.target.style.transform = `translate(${
                            event.pageX
                        }px, ${event.pageY - offsetHeight}px)`
                    },
                    end(event) {
                        console.log(
                            'event x',
                            event.target.getBoundingClientRect(),
                            event.rect.left,
                            event.pageX,
                            event.clientX
                        )
                        // alternate -> take event.rect.left for x
                        localStorage.setItem(
                            'toggle_coordX',
                            parseInt(event.pageX)
                        )
                        localStorage.setItem(
                            'toggle_coordY',
                            parseInt(event.pageY - offsetHeight)
                        )
                        isDragActive = true
                        dispatch(
                            setPeronsalInformation('COMPLETE', { data: {} })
                        )
                    },
                },
            })
        }

        return () => {
            console.log('UNMOUNTING in Toggle', group)
            // clean garbage by removing instance
            two.remove(group)
        }
    }, [])

    function closeToolbar() {
        toggleToolbar(false)
    }

    return (
        <React.Fragment>
            <div id="two-toggle"></div>

            <button
                id="add-1-2"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                // onClick={() => this.addElements("circle")}
            >
                Toggle me
            </button>
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

export default Toggle
