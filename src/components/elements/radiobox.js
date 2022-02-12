import React, { useEffect, useState } from 'react'
import Two from 'two.js'
import interact from 'interactjs'
import { useMutation } from '@apollo/client'
import { useImmer } from 'use-immer'

import { UPDATE_COMPONENT_INFO } from 'schema/mutations'
import { elementOnBlurHandler } from 'utils/misc'
import Toolbar from 'components/floatingToolbar'
import Icon from 'icons/icons'
import ObjectSelector from 'components/utils/objectSelector'

import AddIcon from 'assets/add.svg'

function RadioBox(props) {
    const [updateComponentInfo] = useMutation(UPDATE_COMPONENT_INFO, {
        ignoreResults: true,
    })
    const [showToolbar, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer({
        mainElement: null,
        hidebtn: true,
    })

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

    function deleteRadioboxItem(group, radioboxGroup) {
        console.log('deleteRadioboxItem', radioboxGroup)
        console.log('group in text blur input radiobox', group)
        let findIndex = radioboxGroup.children.findIndex(
            (i) => i.elementData.id == group.elementData.id
        )
        // deleteRadioboxItem(index)

        radioboxGroup.remove(group)
        two.remove([group])
        two.update()

        let newRadioboxArr = [...props.metadata?.radioboxArr]
        newRadioboxArr.splice(findIndex, 1)

        updateComponentInfo({
            variables: {
                id: props.id,

                updateObj: {
                    metadata: {
                        radioboxArr: newRadioboxArr,
                    },
                },
            },
        })
    }

    // Using unmount phase to remove event listeners
    useEffect(() => {
        let radioboxGroup = two.makeGroup([])
        const offsetHeight = 0
        let checkboxCounter = props.metadata.radioboxArr.length - 1
        let selectedRadioControl = null

        const prevX = props.x
        const prevY = props.y

        const currentCheckboxes = props.metadata.radioboxArr || []

        const svgImage = new DOMParser().parseFromString(
            Icon.ICON_CHECKBOX_1.data,
            'text/xml'
        )

        // Iterating over data and attaching to it's respective mappings
        let groupMap = []
        currentCheckboxes.forEach((item, index) => {
            // text part of the radio control
            let text = new Two.Text(item.textValue, 10, index * 30)
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
            group.elementData = { ...item }
            group.childrenObj = {
                text,
                innerCircle,
                externalCircle,
            }

            // textMap[`radiobox${index}`] = text
            // circleMap[`radiobox${index}`] = externalCircle
            // iconMap[`radiobox${index}`] = innerCircle
            // groupMap[`radiobox${index}`] = group

            groupMap.push(group)
        })

        radioboxGroup.add(Object.values(groupMap))

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
                draft.radioboxGroup = {
                    id: radioboxGroup.id,
                    data: radioboxGroup,
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

            const addRadioControlHandler = (e) => {
                console.log('event on add radiobox', e, e.detail)

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
                if (e.isTrusted === false) {
                    text.value = e.detail.textValue
                    group.elementData = { ...e.detail }
                } else {
                    group.elementData = {
                        id: Math.floor(1000 + Math.random() * 9000),
                        textValue: `radiobox${checkboxCounter}`,
                        checked: false,
                    }
                }
                group.childrenObj = {
                    text,
                    innerCircle,
                    externalCircle,
                }
                // group.children.unshift(externalSVG);

                // textMap[`radiobox${index}`] = text
                // circleMap[`radiobox${index}`] = externalCircle
                // iconMap[`radiobox${index}`] = innerCircle
                // groupMap[`radiobox${index}`] = group

                groupMap.push(group)
                radioboxGroup.add(group)
                two.update()

                // e.isTrusted === true means its been called via event dispatched through DOM element
                if (e.isTrusted === true) {
                    let newRadioboxArr = [...props.metadata?.radioboxArr]
                    newRadioboxArr.push(group.elementData)
                    updateComponentInfo({
                        variables: {
                            id: props.id,

                            updateObj: {
                                metadata: {
                                    radioboxArr: newRadioboxArr,
                                },
                            },
                        },
                    })
                }

                // updateRadioBoxState(radioboxGroup)
                attachEventToRadioControl()
            }

            // custom event listener definition for simulating add radiobox behavior
            window.addEventListener(
                'onAddNewRadiobox',
                addRadioControlHandler,
                false
            )

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

            // update checkbox array data after updating item's text value
            function updateRadioboxArrItemText(groupId, textValue) {
                let newRadioboxArr = [...props.metadata?.radioboxArr]
                let findIndex = newRadioboxArr.findIndex(
                    (item) => item.id === groupId
                )
                if (findIndex !== -1) {
                    newRadioboxArr[findIndex] = {
                        ...newRadioboxArr[findIndex],
                        textValue: textValue,
                    }
                }

                updateComponentInfo({
                    variables: {
                        id: props.id,

                        updateObj: {
                            metadata: {
                                radioboxArr: newRadioboxArr,
                            },
                        },
                    },
                })
            }

            // update checkbox array data after updating item's checked value
            function updateRadioboxArrItemChecked(groupId, svgValue) {
                let checked = svgValue === 0 ? false : true

                let newRadioboxArr = [...props.metadata?.radioboxArr]
                let findIndex = newRadioboxArr.findIndex(
                    (item) => item.id === groupId
                )
                if (findIndex !== -1) {
                    newRadioboxArr[findIndex] = {
                        ...newRadioboxArr[findIndex],
                        checked: checked,
                    }
                }

                updateComponentInfo({
                    variables: {
                        id: props.id,

                        updateObj: {
                            metadata: {
                                radioboxArr: newRadioboxArr,
                            },
                        },
                    },
                })
            }

            // Loop and attach event listeners to all elements
            function attachEventToRadioControl(flushEvents) {
                for (
                    let index = 0;
                    index < radioboxGroup.children.length;
                    index++
                ) {
                    console.log(
                        'radioboxGroup.children[index].childrenObj',
                        radioboxGroup.children.length,
                        radioboxGroup.children[index].childrenObj
                    )

                    /* Double Click event handling portion for text*/
                    let text = radioboxGroup.children[index].childrenObj.text
                    let innerCircle =
                        radioboxGroup.children[index].childrenObj.innerCircle
                    let externalCircle =
                        radioboxGroup.children[index].childrenObj.externalCircle
                    let groupId = radioboxGroup.children[index].elementData.id

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
                            if (input.value === '' || input.value === ' ') {
                                // let item = Object.values(radioboxGroup)[index]
                                deleteRadioboxItem(
                                    radioboxGroup.children[index],
                                    radioboxGroup
                                )
                            } else {
                                text.value = input.value
                                input.remove()

                                updateRadioboxArrItemText(groupId, text.value)

                                selector.update(
                                    radioboxGroup.getBoundingClientRect(true)
                                        .left - 10,
                                    radioboxGroup.getBoundingClientRect(true)
                                        .right + 10,
                                    radioboxGroup.getBoundingClientRect(true)
                                        .top - 10,
                                    radioboxGroup.getBoundingClientRect(true)
                                        .bottom + 10
                                )
                                selector.hide()
                                //patch
                                if (e?.relatedTarget?.id !== 'checkbox-add') {
                                    toggleAddBtn(true)
                                }
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

                    const radioControlClickHandler = () => {
                        // console.log('rect click handler', svg.opacity)
                        selectedRadioControl.opacity = 0
                        selectedRadioControl = innerCircle
                        selectedRadioControl.opacity = 1

                        updateRadioboxArrItemChecked(
                            groupId,
                            innerCircle.opacity
                        )
                    }

                    // One event handler for both the elements (externalCircle and innerCircle)
                    // as user behavior would be clicking on radiobox(innercircle) or either empty external circle

                    if (!radioExtCircleArr.includes(externalCircle.id)) {
                        radioExtCircleArr.push(externalCircle.id)
                        document
                            .getElementById(externalCircle.id)
                            .addEventListener('click', radioControlClickHandler)
                    }

                    if (!radioIntCircleArr.includes(innerCircle.id)) {
                        radioIntCircleArr.push(innerCircle.id)
                        document
                            .getElementById(innerCircle.id)
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

        if (internalState?.radioboxGroup?.data) {
            let radioboxGroupArr = internalState.radioboxGroup.data.children
            console.log('radioboxGroupArr len', radioboxGroupArr.length)

            // iterating checkbox's children.
            // checking there `elementData` and comparing it with updated data
            props.metadata.radioboxArr.forEach((item, index) => {
                let findRadioboxItemIndex = radioboxGroupArr.findIndex(
                    (j) => j.elementData.id == item.id
                )

                if (findRadioboxItemIndex !== -1) {
                    let getRadiobox = radioboxGroupArr[findRadioboxItemIndex]

                    // update text value if it does not match
                    if (getRadiobox.elementData.textValue !== item.textValue) {
                        // we are updating actual two's Text value
                        getRadiobox.childrenObj.text.value = item.textValue
                    }

                    // update checked value if it does not match
                    if (getRadiobox.elementData.checked !== item.checked) {
                        // we are updating actual two's svg
                        // selectedRadioControl = d
                        // getRadiobox.childrenObj.externalSVG.opacity =
                        //     item.checked === true ? 1 : 0
                    }
                } else {
                    // let addCheckboxBtnElement =
                    //     document.getElementById('checkbox-add')
                    // addCheckboxBtnElement.click()

                    let evt = new CustomEvent('onAddNewRadiobox', {
                        detail: item,
                    })
                    window.dispatchEvent(evt)
                }
            })

            two.update()
            console.log('radioboxGroupArr', radioboxGroupArr)
        }
    }, [props.x, props.y, props.fill, props.metadata])

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
