import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import Two from 'two.js'
import interact from 'interactjs'
import { useImmer } from 'use-immer'
import { useMutation } from '@apollo/client'

import { UPDATE_COMPONENT_INFO } from 'schema/mutations'
import { elementOnBlurHandler } from 'utils/misc'
import getEditComponents from 'components/utils/editWrapper'
import Toolbar from 'components/floatingToolbar'
import Icon from 'icons/icons'

import AddIcon from 'assets/add.svg'

function Checkbox(props) {
    const [updateComponentInfo] = useMutation(UPDATE_COMPONENT_INFO, {
        ignoreResults: true,
    })
    const [showToolbar, toggleToolbar] = useState(false)

    const [internalState, setInternalState] = useImmer({})

    const two = props.twoJSInstance

    let selectorInstance = null
    let groupObject = null

    function onBlurHandler(e) {
        elementOnBlurHandler(e, selectorInstance, two)

        // hides add btn on blur
        if (e?.relatedTarget?.id !== 'checkbox-add') {
            toggleAddBtn(true)
        }
    }

    function onFocusHandler(e) {
        document.getElementById(`${groupObject.id}`).style.outline = 0
    }

    // this updates checkbox state via passed checkboxgrp instance
    function updateCheckboxState(checkboxGroup) {
        setInternalState((draft) => {
            draft.element = {
                ...internalState.element,
                [checkboxGroup.id]: checkboxGroup,
            }
        })
    }

    function toggleAddBtn(flag) {
        setInternalState((draft) => {
            draft.hidebtn = flag
        })
    }

    function deleteCheckboxItem(group, checkboxGroup) {
        console.log('deleteCheckboxItem', checkboxGroup)
        console.log('group in text blur input checkbox', group)
        let findIndex = checkboxGroup.children.findIndex(
            (i) => i.elementData.id == group.elementData.id
        )
        // deleteCheckboxItem(index)

        checkboxGroup.remove(group)
        two.remove([group])
        two.update()

        let newCheckboxArr = [...props.metadata?.checkboxArr]
        newCheckboxArr.splice(findIndex, 1)

        updateComponentInfo({
            variables: {
                id: props.id,

                updateObj: {
                    metadata: {
                        checkboxArr: newCheckboxArr,
                    },
                },
            },
        })
    }

    // Using unmount phase to remove event listeners
    useEffect(() => {
        let checkboxGroup = two.makeGroup([])
        const offsetHeight = 0
        let checkboxCounter = props.metadata.checkboxArr.length - 1

        const prevX = props.x
        const prevY = props.y

        const currentCheckboxes = props.metadata.checkboxArr || []

        const svgImage = new DOMParser().parseFromString(
            Icon.ICON_CHECKBOX_1.data,
            'text/xml'
        )

        // Iterating over data and attaching to it's respective mappings
        let groupMap = []
        currentCheckboxes.forEach((item, index) => {
            // construct text part of the checkbox
            let text = new Two.Text(item.textValue, 10, index * 30)
            text.alignment = 'left'
            text.size = '16'
            text.weight = '400'
            text.baseline = 'central'

            // construct external sqaure shape part of the checkbox
            // Subtracted to some value to have rect positioned in aligned manner
            let rect = two.makeRectangle(-10, index * 30, 15, 15)
            rect.stroke = '#B3BAC5'

            // construct tick mark part of the checkbox by attaching custom
            // svg of tick mark
            const externalSVG = two.interpret(
                svgImage.firstChild.firstChild.firstChild
            )

            if (props.fill) {
                externalSVG.fill = props.fill
            }
            externalSVG.translation.x = -10
            externalSVG.translation.y = index * 30
            externalSVG.scale = 0.04
            externalSVG.opacity = 0
            // externalSVG.center();
            if (item.checked) {
                externalSVG.opacity = 1
            }

            // construct group to combine all parts into one
            let group = two.makeGroup(rect, externalSVG, text)
            group.elementData = { ...item }
            group.childrenObj = {
                text,
                rect,
                externalSVG,
            }
            // group.children.unshift(externalSVG);

            groupMap.push(group)
        })

        checkboxGroup.add(Object.values(groupMap))

        const group = two.makeGroup(checkboxGroup)
        group.elementData = props?.itemData
        // console.log("checkboxGroup", checkboxGroup, checkboxGroup.id);

        if (props.parentGroup) {
            /** This element will be rendered and scoped in its parent group */
            const parentGroup = props.parentGroup
            checkboxGroup.elementData = props?.itemData
            parentGroup.add(checkboxGroup)
            two.update()
        } else {
            /** This element will render by creating it's own group wrapper */

            group.translation.x = parseInt(prevX) || 500
            group.translation.y = parseInt(prevY) || 200
            groupObject = group

            // console.log("text bounding initial", group.id, checkboxGroup.id);

            const { selector } = getEditComponents(two, group, 4)
            selectorInstance = selector

            // Shifting order of objects in group to reflect "z-index alias" mechanism for text box
            group.children.unshift(checkboxGroup)
            two.update()

            document
                .getElementById(group.id)
                .setAttribute('class', 'dragger-picker')
            document
                .getElementById(group.id)
                .setAttribute('data-label', 'checkbox_coord')

            const style = document.createElement('style')
            style.type = 'text/css'
            style.innerHTML = `#${checkboxGroup.id} path { cursor:pointer !important }`

            document.getElementsByTagName('head')[0].appendChild(style)

            setInternalState((draft) => {
                draft.element = {
                    [checkboxGroup.id]: checkboxGroup,
                    [group.id]: group,
                    // [selector.id]: selector,
                }
                draft.checkboxGroup = {
                    id: checkboxGroup.id,
                    data: checkboxGroup,
                }
                draft.group = {
                    id: group.id,
                    data: group,
                }
                draft.shape = {
                    data: {},
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

            const addCheckboxClickHandler = (e) => {
                console.log('event on add checkbox', e, e.detail)
                // console.log("add checkbox listener");
                checkboxCounter = checkboxCounter + 1

                // construct text part of the checkbox
                let text = new Two.Text(
                    `checkbox ${checkboxCounter + 1}`,
                    10,
                    checkboxCounter * 30
                )
                text.alignment = 'left'
                text.size = '16'
                text.weight = '400'
                text.baseline = 'central'

                // construct external sqaure shape part of the checkbox
                // Subtracted to some value to have rect positioned in aligned manner
                let rect = two.makeRectangle(-10, checkboxCounter * 30, 15, 15)
                rect.stroke = '#B3BAC5'

                // construct tick mark part of the checkbox by attaching custom
                // svg of tick mark
                const externalSVG = two.interpret(
                    svgImage.firstChild.firstChild.firstChild
                )

                externalSVG.translation.x = -10
                externalSVG.translation.y = checkboxCounter * 30
                externalSVG.scale = 0.04
                externalSVG.opacity = 0

                // construct group to combine all parts into one
                let group = two.makeGroup(rect, externalSVG, text)

                if (e.isTrusted === false) {
                    text.value = e.detail.textValue
                    group.elementData = { ...e.detail }
                } else {
                    group.elementData = {
                        id: Math.floor(1000 + Math.random() * 9000),
                        textValue: `checkbox${checkboxCounter}`,
                        checked: false,
                    }
                }

                // console.log(
                //     'group.elementData in add checkbox',
                //     group.elementData
                // )

                group.childrenObj = {
                    text,
                    rect,
                    externalSVG,
                }

                groupMap.push(group)
                checkboxGroup.add(group)
                two.update()

                // e.isTrusted === true means its been called via event dispatched through DOM element
                if (e.isTrusted === true) {
                    let newCheckboxArr = [...props.metadata?.checkboxArr]
                    newCheckboxArr.push(group.elementData)
                    updateComponentInfo({
                        variables: {
                            id: props.id,

                            updateObj: {
                                metadata: {
                                    checkboxArr: newCheckboxArr,
                                },
                            },
                        },
                    })
                }

                // updateCheckboxState(checkboxGroup)
                attachEventToCheckboxes()
            }

            // custom event listener definition for simulating add checkbox behavior
            window.addEventListener(
                'onAddNewCheckbox',
                addCheckboxClickHandler,
                false
            )

            interact(`#${group.id}`).on('click', () => {
                selector.update(
                    checkboxGroup.getBoundingClientRect(true).left - 10,
                    checkboxGroup.getBoundingClientRect(true).right + 10,
                    checkboxGroup.getBoundingClientRect(true).top - 10,
                    checkboxGroup.getBoundingClientRect(true).bottom + 10
                )
                two.update()
                toggleAddBtn(false)
                toggleToolbar(true)
            })

            // add event listener on outer html tree to handle respective event
            // this event handler is for adding checkbox
            document
                .getElementById('checkbox-add')
                .addEventListener('click', addCheckboxClickHandler)

            // Store the ids of all checkbox elements
            let checkboxTextArr = []
            let checkboxRectArr = []
            let checkboxSvgArr = []

            // update checkbox array data after updating item's text value
            function updateCheckboxArrItemText(groupId, textValue) {
                let newCheckboxArr = [...props.metadata?.checkboxArr]
                let findIndex = newCheckboxArr.findIndex(
                    (item) => item.id === groupId
                )
                if (findIndex !== -1) {
                    newCheckboxArr[findIndex] = {
                        ...newCheckboxArr[findIndex],
                        textValue: textValue,
                    }
                }

                updateComponentInfo({
                    variables: {
                        id: props.id,

                        updateObj: {
                            metadata: {
                                checkboxArr: newCheckboxArr,
                            },
                        },
                    },
                })
            }

            // update checkbox array data after updating item's checked value
            function updateCheckboxArrItemChecked(groupId, svgValue) {
                let checked = svgValue === 0 ? false : true

                let newCheckboxArr = [...props.metadata?.checkboxArr]
                let findIndex = newCheckboxArr.findIndex(
                    (item) => item.id === groupId
                )
                if (findIndex !== -1) {
                    newCheckboxArr[findIndex] = {
                        ...newCheckboxArr[findIndex],
                        checked: checked,
                    }
                }

                updateComponentInfo({
                    variables: {
                        id: props.id,

                        updateObj: {
                            metadata: {
                                checkboxArr: newCheckboxArr,
                            },
                        },
                    },
                })
            }

            // Loop and attach event listeners to all elements
            function attachEventToCheckboxes(flushEvents) {
                for (
                    let index = 0;
                    index < checkboxGroup.children.length;
                    index++
                ) {
                    console.log(
                        'checkboxGroup.children[index].childrenObj',
                        checkboxGroup.children[index].childrenObj
                    )
                    /* Double Click event handling portion for text*/
                    let text = checkboxGroup.children[index].childrenObj.text
                    let externalSVG =
                        checkboxGroup.children[index].childrenObj.externalSVG
                    let rect = checkboxGroup.children[index].childrenObj.rect
                    let groupId = checkboxGroup.children[index].elementData.id

                    const dblClickHandler = () => {
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
                            checkboxGroup.getBoundingClientRect(true).width
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
                                checkboxGroup.getBoundingClientRect(true)
                                    .width + 4
                            }px`

                            // Synchronously update selector tool's coordinates
                            text.value = input.value
                            selector.update(
                                checkboxGroup.getBoundingClientRect(true).left -
                                    10,
                                checkboxGroup.getBoundingClientRect(true)
                                    .right + 30,
                                checkboxGroup.getBoundingClientRect(true).top -
                                    10,
                                checkboxGroup.getBoundingClientRect(true)
                                    .bottom + 10
                            )
                            two.update()
                        })

                        // Handle Input box blur event
                        input.addEventListener('blur', (e) => {
                            console.log('BLUR E', e)
                            twoTextInstance.style.display = 'block'
                            if (input.value === '' || input.value === ' ') {
                                // let item = Object.values(checkboxGroup)[index]
                                deleteCheckboxItem(
                                    checkboxGroup.children[index],
                                    checkboxGroup
                                )
                            } else {
                                text.value = input.value
                                input.remove()

                                updateCheckboxArrItemText(groupId, text.value)

                                selector.update(
                                    checkboxGroup.getBoundingClientRect(true)
                                        .left - 10,
                                    checkboxGroup.getBoundingClientRect(true)
                                        .right + 10,
                                    checkboxGroup.getBoundingClientRect(true)
                                        .top - 10,
                                    checkboxGroup.getBoundingClientRect(true)
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

                    if (!checkboxTextArr.includes(text.id)) {
                        checkboxTextArr.push(text.id)
                        document
                            .getElementById(text.id)
                            .addEventListener('click', dblClickHandler)
                    }

                    /* On click event handling portion for rect (checkbox)*/

                    const checkboxClickHandler = () => {
                        if (externalSVG.opacity == 0) {
                            externalSVG.opacity = 1
                        } else {
                            externalSVG.opacity = 0
                        }
                        updateCheckboxArrItemChecked(
                            groupId,
                            externalSVG.opacity
                        )
                    }

                    // One event handler for both the elements (rect and svg)
                    // as user behavior would be clicking on checkbox or either empty rectangle(empty checkbox)

                    if (!checkboxRectArr.includes(rect.id)) {
                        checkboxRectArr.push(rect.id)
                        document
                            .getElementById(rect.id)
                            .addEventListener('click', checkboxClickHandler)
                    }

                    if (!checkboxSvgArr.includes(externalSVG.id)) {
                        checkboxSvgArr.push(externalSVG.id)
                        document
                            .getElementById(externalSVG.id)
                            .addEventListener('click', checkboxClickHandler)
                    }
                }
            }

            attachEventToCheckboxes()

            // interact(`#${group.id}`).draggable({
            //     // enable inertial throwing
            //     inertia: false,

            //     listeners: {
            //         start(event) {
            //             toggleAddBtn(true)
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
            //                 'checkbox_coordX',
            //                 parseInt(event.pageX)
            //             )
            //             localStorage.setItem(
            //                 'checkbox_coordY',
            //                 parseInt(event.pageY - offsetHeight)
            //             )

            //             group.translation.x = event.pageX
            //             group.translation.y = event.pageY
            //             two.update()
            //             dispatch(
            //                 setPeronsalInformation('COMPLETE', { data: {} })
            //             )

            //             updateCheckboxState(checkboxGroup)
            //             toggleAddBtn(true)
            //         },
            //     },
            // })
        }

        return () => {
            console.log('UNMOUNTING in Check box', checkboxGroup)
            // clean garbage by removing instance
            // two.remove(checkboxGroup)
        }
    }, [])

    useEffect(() => {
        if (internalState?.group?.data) {
            let groupInstance = internalState.group.data
            groupInstance.translation.x = props.x
            groupInstance.translation.y = props.y
            two.update()
        }

        if (internalState?.checkboxGroup?.data) {
            let checkboxGroupArr = internalState.checkboxGroup.data.children
            console.log('checkboxGroupArr len', checkboxGroupArr.length)

            // iterating checkbox's children.
            // checking there `elementData` and comparing it with updated data
            props.metadata.checkboxArr.forEach((item, index) => {
                let findCheckboxItemIndex = checkboxGroupArr.findIndex(
                    (j) => j.elementData.id == item.id
                )

                if (findCheckboxItemIndex !== -1) {
                    let getCheckbox = checkboxGroupArr[findCheckboxItemIndex]

                    // update text value if it does not match
                    if (getCheckbox.elementData.textValue !== item.textValue) {
                        // we are updating actual two's Text value
                        getCheckbox.childrenObj.text.value = item.textValue
                    }

                    // update checked value if it does not match
                    if (getCheckbox.elementData.checked !== item.checked) {
                        // we are updating actual two's svg
                        getCheckbox.childrenObj.externalSVG.opacity =
                            item.checked === true ? 1 : 0
                    }
                } else {
                    // let addCheckboxBtnElement =
                    //     document.getElementById('checkbox-add')
                    // addCheckboxBtnElement.click()

                    let evt = new CustomEvent('onAddNewCheckbox', {
                        detail: item,
                    })
                    window.dispatchEvent(evt)
                }
            })

            two.update()
            console.log('checkboxGroupArr', checkboxGroupArr)
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
            <div id="two-checkbox"></div>
            <a
                id="checkbox-add"
                className={`absolute`}
                style={{
                    top: mainElementRect?.bottom
                        ? `${mainElementRect?.bottom + 15}px`
                        : '191px',
                    left: mainElementRect?.left
                        ? `${
                              mainElementRect?.left + getWidthOfElement / 2 - 10
                          }px`
                        : '200px',
                    visibility: internalState.hidebtn ? 'hidden' : 'visible',
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

Checkbox.propTypes = {
    x: PropTypes.string,
    y: PropTypes.string,
}

Checkbox.defaultProps = {
    x: 100,
    y: 50,
}

export default Checkbox
