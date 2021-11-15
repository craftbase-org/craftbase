import React, { useEffect, useState } from 'react'
import Two from 'two.js'
import interact from 'interactjs'
import { useDispatch } from 'react-redux'
import { useImmer } from 'use-immer'

import { elementOnBlurHandler } from 'utils/misc'
import getEditComponents from 'components/utils/editWrapper'
import Toolbar from 'components/floatingToolbar'
import Icon from 'icons/icons'
import ObjectSelector from 'components/utils/objectSelector'
import { setPeronsalInformation } from 'store/actions/main'
import AddIcon from 'assets/add.svg'

function RadioBox(props) {
    const [showToolbar, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer({
        mainElement: null,
        hidebtn: true,
    })
    const dispatch = useDispatch()
    const two = props.twoJSInstance
    let selectorInstance = null
    let groupObject = null

    function onBlurHandler(e) {
        elementOnBlurHandler(e, selectorInstance, two)

        // also hide add btn
        if (e?.relatedTarget?.id !== 'checkbox-add') {
            toggleAddBtn(true)
        }
    }

    function onFocusHandler(e) {
        document.getElementById(`${groupObject.id}`).style.outline = 0
    }

    // this updates checkbox state via passed checkboxgrp instance
    function updateRadioBoxState(radioboxGroup) {
        setInternalState((draft) => {
            draft.element = {
                ...internalState.element,
                [radioboxGroup.id]: radioboxGroup,
            }
        })
    }

    function toggleAddBtn(flag) {
        setInternalState((draft) => {
            draft.hidebtn = flag
        })
    }

    // Using unmount phase to remove event listeners
    useEffect(() => {
        const offsetHeight = 0
        let checkboxCounter = 2
        let selectedRadioControl = null

        const prevX = props.x
        const prevY = props.y

        const currentCheckboxes = [
            { name: 'radio 1', checked: false },
            { name: 'radio 2', checked: true },
            { name: 'radio 3', checked: false },
        ]

        const svgImage = new DOMParser().parseFromString(
            Icon.ICON_CHECKBOX_1.data,
            'text/xml'
        )

        const textMap = {}
        const circleMap = {}
        const groupMap = {}
        const iconMap = {}

        // Iterating over data and attaching to it's respective mappings
        currentCheckboxes.forEach((item, index) => {
            // text part of the radio control
            let text = new Two.Text(item.name, 10, index * 30)
            text.alignment = 'left'
            text.size = '16'
            text.weight = '400'
            text.baseline = 'central'

            // external circle part of the radio control
            // Subtracted to some value to have rect positioned in aligned manner
            let externalCircle = two.makeCircle(-10, index * 30, 8)
            externalCircle.stroke = '#B3BAC5'

            // internal circle part of the radio control
            let innerCircle = two.makeCircle(-10, index * 30, 5)
            innerCircle.fill = '#0052CC'
            innerCircle.noStroke()
            innerCircle.opacity = 0

            if (item.checked) {
                innerCircle.opacity = 1
                selectedRadioControl = innerCircle
            }

            // group all the parts into one to form radio control
            let group = two.makeGroup(externalCircle, innerCircle, text)
            // group.children.unshift(externalSVG);

            textMap[`radiobox${index}`] = text
            circleMap[`radiobox${index}`] = externalCircle
            iconMap[`radiobox${index}`] = innerCircle
            groupMap[`radiobox${index}`] = group
        })
        const radioboxGroup = two.makeGroup(Object.values(groupMap))
        const group = two.makeGroup(radioboxGroup)
        group.elementData = props?.itemData
        // console.log("radioboxGroup", radioboxGroup, radioboxGroup.id);

        if (props.parentGroup) {
            /** This element will be rendered and scoped in its parent group */
            const parentGroup = props.parentGroup
            radioboxGroup.elementData = props?.itemData
            parentGroup.add(radioboxGroup)
            two.update()
        } else {
            /** This element will render by creating it's own group wrapper */

            group.translation.x = parseInt(prevX) || 500
            group.translation.y = parseInt(prevY) || 200
            groupObject = group

            const selector = new ObjectSelector(two, group, 0, 0, 0, 0)
            selector.create()
            selectorInstance = selector

            // Shifting order of objects in group to reflect "z-index alias" mechanism for text box
            group.children.unshift(radioboxGroup)
            two.update()

            document
                .getElementById(group.id)
                .setAttribute('class', 'dragger-picker')
            document
                .getElementById(group.id)
                .setAttribute('data-label', 'radiobox_coord')

            const style = document.createElement('style')
            style.type = 'text/css'
            style.innerHTML = `#${radioboxGroup.id} path { cursor:pointer !important }`

            document.getElementsByTagName('head')[0].appendChild(style)

            setInternalState((draft) => {
                draft.element = {
                    [radioboxGroup.id]: radioboxGroup,
                    [group.id]: group,
                    // [selector.id]: selector,
                }
                draft.group = {
                    id: group.id,
                    data: group,
                }
                draft.shape = {
                    id: radioboxGroup.id,
                    data: radioboxGroup,
                }
                draft.text = {
                    data: {},
                }
                draft.icon = {
                    data: {},
                }
                draft.mainElement = group
            })

            const getGroupElementFromDOM = document.getElementById(
                `${group.id}`
            )
            getGroupElementFromDOM.addEventListener('focus', onFocusHandler)
            getGroupElementFromDOM.addEventListener('blur', onBlurHandler)

            const addRadioControlHandler = (index, initialLoad) => {
                console.log('add checkbox listener')
                checkboxCounter = checkboxCounter + 1

                let text = new Two.Text(
                    `radio ${checkboxCounter + 1}`,
                    10,
                    checkboxCounter * 30
                )
                text.alignment = 'left'
                text.size = '16'
                text.weight = '400'
                text.baseline = 'central'

                // outer circle on radio control
                let externalCircle = two.makeCircle(
                    -10,
                    checkboxCounter * 30,
                    8
                )
                externalCircle.stroke = '#B3BAC5'

                // attaching actual radio circle to outer circle
                let innerCircle = two.makeCircle(-10, checkboxCounter * 30, 5)
                innerCircle.fill = '#0052CC'
                innerCircle.noStroke()

                innerCircle.opacity = 0
                // externalSVG.center();

                let group = two.makeGroup(externalCircle, innerCircle, text)

                // group.children.unshift(externalSVG);

                textMap[`radiobox${index}`] = text
                circleMap[`radiobox${index}`] = externalCircle
                iconMap[`radiobox${index}`] = innerCircle
                groupMap[`radiobox${index}`] = group

                radioboxGroup.add(group)
                two.update()

                updateRadioBoxState(radioboxGroup)
                attachEventToRadioControl()
            }

            interact(`#${group.id}`).on('click', () => {
                selector.update(
                    radioboxGroup.getBoundingClientRect(true).left - 10,
                    radioboxGroup.getBoundingClientRect(true).right + 10,
                    radioboxGroup.getBoundingClientRect(true).top - 10,
                    radioboxGroup.getBoundingClientRect(true).bottom + 10
                )
                two.update()

                // unhide toggle add btn
                toggleAddBtn(false)

                // show toolbar
                toggleToolbar(true)
            })

            // add event listener on outer html tree to handle respective event
            // this event handler is for adding radiobox
            document
                .getElementById('radiobox-add')
                .addEventListener('click', addRadioControlHandler)

            // Store the ids of all checkbox elements
            let radioTextArr = []
            let radioExtCircleArr = []
            let radioIntCircleArr = []

            // Loop and attach event listeners to all elements
            function attachEventToRadioControl(flushEvents) {
                for (
                    let index = 0;
                    index < Object.values(textMap).length;
                    index++
                ) {
                    /* Double Click event handling portion for text*/
                    let text = Object.values(textMap)[index]
                    // console.log("text in for loop", text, text._renderer.elem);

                    const dblClickHandler = () => {
                        // console.log(
                        //   "on click for text",
                        //   text.id,
                        //   text.getBoundingClientRect()
                        // );

                        // Hide actual text and replace it with input box
                        const twoTextInstance = document.getElementById(
                            `${text.id}`
                        )
                        const getCoordOfBtnText = document
                            .getElementById(`${text.id}`)
                            .getBoundingClientRect()
                        twoTextInstance.style.display = 'none'

                        const input = document.createElement('input')
                        const topBuffer = 2
                        input.type = 'text'
                        input.value = text.value
                        input.style.fontSize = '16px'
                        input.style.fontWeight = '400'
                        input.style.position = 'absolute'
                        input.style.top = `${
                            getCoordOfBtnText.top - topBuffer
                        }px`
                        input.style.left = `${getCoordOfBtnText.left}px`
                        input.style.width = `${
                            radioboxGroup.getBoundingClientRect(true).width
                        }px`
                        input.className = 'temp-input-area'

                        // Appending in space of two's root element
                        document.getElementById('main-two-root').append(input)

                        // Declaratively set focus for input box
                        input.onfocus = function (e) {
                            console.log('on input focus')
                            selector.show()
                            two.update()
                        }
                        input.focus()

                        // Handle input event for input box
                        input.addEventListener('input', () => {
                            input.style.width = `${
                                radioboxGroup.getBoundingClientRect(true)
                                    .width + 4
                            }px`

                            // Synchronously update selector tool's coordinates
                            text.value = input.value
                            selector.update(
                                radioboxGroup.getBoundingClientRect(true).left -
                                    10,
                                radioboxGroup.getBoundingClientRect(true)
                                    .right + 30,
                                radioboxGroup.getBoundingClientRect(true).top -
                                    10,
                                radioboxGroup.getBoundingClientRect(true)
                                    .bottom + 10
                            )
                            two.update()
                        })

                        // Handle Input box blur event
                        input.addEventListener('blur', (e) => {
                            twoTextInstance.style.display = 'block'
                            text.value = input.value
                            input.remove()
                            console.log(
                                'input blur event',
                                radioboxGroup.id,
                                radioboxGroup.getBoundingClientRect()
                            )

                            selector.update(
                                radioboxGroup.getBoundingClientRect(true).left -
                                    10,
                                radioboxGroup.getBoundingClientRect(true)
                                    .right + 10,
                                radioboxGroup.getBoundingClientRect(true).top -
                                    10,
                                radioboxGroup.getBoundingClientRect(true)
                                    .bottom + 10
                            )
                            selector.hide()

                            //  patch
                            if (e?.relatedTarget?.id !== 'checkbox-add') {
                                toggleAddBtn(true)
                            }
                            two.update()
                        })
                    }

                    if (!radioTextArr.includes(text.id)) {
                        radioTextArr.push(text.id)
                        document
                            .getElementById(text.id)
                            .addEventListener('click', dblClickHandler)
                    }

                    /* On click event handling portion for rect (checkbox)*/
                    let rect = Object.values(circleMap)[index]
                    let svg = Object.values(iconMap)[index]

                    const radioControlClickHandler = () => {
                        console.log('rect click handler', svg.opacity)
                        selectedRadioControl.opacity = 0
                        selectedRadioControl = svg
                        selectedRadioControl.opacity = 1
                    }

                    // One event handler for both the elements (rect and svg)
                    // as user behavior would be clicking on checkbox or either empty rectangle

                    if (!radioExtCircleArr.includes(rect.id)) {
                        radioExtCircleArr.push(rect.id)
                        document
                            .getElementById(rect.id)
                            .addEventListener('click', radioControlClickHandler)
                    }

                    if (!radioIntCircleArr.includes(svg.id)) {
                        radioIntCircleArr.push(svg.id)
                        document
                            .getElementById(svg.id)
                            .addEventListener('click', radioControlClickHandler)
                    }
                }
            }
            attachEventToRadioControl()

            // interact(`#${group.id}`).draggable({
            //     // enable inertial throwing
            //     inertia: false,

            //     listeners: {
            //         start(event) {
            //             toggleAddBtn(true)
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
            //                 'radiobox_coordX',
            //                 parseInt(event.pageX)
            //             )
            //             localStorage.setItem(
            //                 'radiobox_coordY',
            //                 parseInt(event.pageY - offsetHeight)
            //             )
            //             group.translation.x = event.pageX
            //             group.translation.y = event.pageY
            //             two.update()
            //             dispatch(
            //                 setPeronsalInformation('COMPLETE', { data: {} })
            //             )

            //             updateRadioBoxState(radioboxGroup)
            //             toggleAddBtn(false)
            //         },
            //     },
            // })
        }

        return () => {
            console.log('UNMOUNTING in Radio box', groupObject)
            // clean garbage by removing instance
            // two.remove(groupObject)
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

    const mainElementRect = internalState?.mainElement?.getBoundingClientRect()
    const getWidthOfElement =
        internalState?.mainElement?.getBoundingClientRect()?.width || 20

    return (
        <React.Fragment>
            <div id="two-radiobox"></div>
            <a
                id="radiobox-add"
                className={`absolute ${
                    internalState.hidebtn ? 'opacity-0' : 'opacity-100'
                }`}
                style={{
                    top: mainElementRect?.bottom
                        ? `${mainElementRect?.bottom + 15}px`
                        : '191px',
                    left: mainElementRect?.left
                        ? `${
                              mainElementRect?.left + getWidthOfElement / 2 - 10
                          }px`
                        : '200px',
                }}
                href=""
                onClick={(e) => {
                    e.preventDefault()
                    console.log('on btn click')
                }}
            >
                <img src={AddIcon} width="30" height="30" />
            </a>

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
        </React.Fragment>
    )
}

// RadioBox.propTypes = {
//   x: PropTypes.string,
//   y: PropTypes.string,
// };

// RadioBox.defaultProps = {
//   x: 100,
//   y: 50,
// };

export default RadioBox
