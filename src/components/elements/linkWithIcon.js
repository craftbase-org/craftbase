import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import interact from 'interactjs'
import { useMutation } from '@apollo/client'
import { useImmer } from 'use-immer'

import { UPDATE_COMPONENT_INFO } from 'schema/mutations'
import { elementOnBlurHandler } from 'utils/misc'
import Toolbar from 'components/floatingToolbar'
import getEditComponents from 'components/utils/editWrapper'
import ElementFactory from 'factory/linkwithicon'

function LinkWithIcon(props) {
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

    // function changeSVG() {
    //   document.getElementById(`${externalSVGInstance.id}`).innerHTML =
    //     Icon.SIDEBAR_ICON_RECTANGLE.data;

    //   two.update();
    // }

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
        const {
            group,
            rectTextSvgGroup,
            externalSVG,
            text,
            textSvgGroup,
            rectangle,
        } = elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }

        if (props.parentGroup) {
            /** This element will be rendered and scoped in its parent group */
            const parentGroup = props.parentGroup
            rectTextSvgGroup.translation.x = props.metaData.x
            parentGroup.add(rectTextSvgGroup)
            two.update()
        } else {
            /** This element will render by creating it's own group wrapper */
            groupObject = group

            const { selector, toolbar } = getEditComponents(two, group, 4)
            selectorInstance = selector

            // Shifting order of objects in group to reflect "z-index alias" mechanism for text box
            group.children.unshift(rectTextSvgGroup)
            two.update()

            document
                .getElementById(group.id)
                .setAttribute('class', 'dragger-picker')
            document
                .getElementById(group.id)
                .setAttribute('data-label', 'linkwithicon_coord')

            setInternalState((draft) => {
                draft.element = {
                    [rectTextSvgGroup.id]: rectTextSvgGroup,
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
                draft.textSvgGroup = {
                    id: textSvgGroup.id,
                    data: textSvgGroup,
                }
                draft.text = {
                    id: text.id,
                    data: text,
                }
                draft.icon = {
                    id: externalSVG.id,
                    data: externalSVG,
                }
            })

            const getGroupElementFromDOM = document.getElementById(
                `${group.id}`
            )
            getGroupElementFromDOM.addEventListener('focus', onFocusHandler)
            getGroupElementFromDOM.addEventListener('blur', onBlurHandler)

            // const { mousemove, mouseup } = handleDrag(
            //     two,
            //     group,
            //     'linkwithicon'
            // )

            interact(`#${group.id}`).on('click', () => {
                console.log('on click ', text.getBoundingClientRect(true))
                selector.update(
                    rectTextSvgGroup.getBoundingClientRect(true).left - 30,
                    rectTextSvgGroup.getBoundingClientRect(true).right + 10,
                    rectTextSvgGroup.getBoundingClientRect(true).top - 10,
                    rectTextSvgGroup.getBoundingClientRect(true).bottom + 10
                )
                two.update()
                toggleToolbar(true)
            })

            // Captures double click event for text
            // and generates temporary textarea support for it
            text._renderer.elem.addEventListener('dblclick', () => {
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
                input.style.fontSize = '18px'
                input.style.position = 'absolute'
                input.style.top = `${getCoordOfBtnText.top - topBuffer}px`
                input.style.left = `${getCoordOfBtnText.left}px`
                input.style.width = `${
                    rectTextSvgGroup.getBoundingClientRect(true).width + 4
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
                    input.style.width = `${
                        rectTextSvgGroup.getBoundingClientRect(true).width + 4
                    }px`

                    // Synchronously update selector tool's coordinates
                    text.value = input.value
                    selector.update(
                        rectTextSvgGroup.getBoundingClientRect(true).left - 30,
                        rectTextSvgGroup.getBoundingClientRect(true).right + 30,
                        rectTextSvgGroup.getBoundingClientRect(true).top - 10,
                        rectTextSvgGroup.getBoundingClientRect(true).bottom + 10
                    )
                    two.update()
                })

                input.addEventListener('blur', () => {
                    twoTextInstance.style.display = 'block'
                    text.value = input.value
                    input.remove()
                    console.log(
                        'input blur event',
                        rectTextSvgGroup.id,
                        rectTextSvgGroup.getBoundingClientRect()
                    )

                    // USE 4 LINES 4 CIRCLES

                    selector.update(
                        rectTextSvgGroup.getBoundingClientRect(true).left - 30,
                        rectTextSvgGroup.getBoundingClientRect(true).right + 10,
                        rectTextSvgGroup.getBoundingClientRect(true).top - 10,
                        rectTextSvgGroup.getBoundingClientRect(true).bottom + 10
                    )
                    selector.hide()
                    updateComponentInfo({
                        variables: {
                            id: props.id,

                            updateObj: {
                                children: {
                                    ...props.children,
                                    text: {
                                        ...props.children?.text,
                                        value: text.value,
                                    },
                                },
                            },
                        },
                    })
                    two.update()
                })
            })

            // Attach draggable property to element
            // interact(`#${group.id}`).draggable({
            //   // enable inertial throwing
            //   inertia: false,

            //   listeners: {
            //     start(event) {
            //       // console.log(event.type, event.target);
            //     },
            //     move(event) {
            //       event.target.style.transform = `translate(${event.pageX}px, ${
            //         event.pageY - offsetHeight
            //       }px)`;

            //       two.update();
            //     },
            //     end(event) {
            //       console.log(
            //         'event x',
            //         event.target.getBoundingClientRect(),
            //         event.rect.left,
            //         event.pageX,
            //         event.clientX
            //       );
            //       // alternate -> take event.rect.left for x
            //       localStorage.setItem('linkwithicon_coordX', parseInt(event.pageX));
            //       localStorage.setItem(
            //         'linkwithicon_coordY',
            //         parseInt(event.pageY - offsetHeight)
            //       );

            //       dispatch(setPeronsalInformation('COMPLETE', { data: {} }));
            //     },
            //   },
            // });
        }

        return () => {
            console.log('UNMOUNTING in Link with icon', group)
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
            let textSvgGroupInstance = internalState.textSvgGroup.data

            shapeInstance.width = props.width
                ? props.width
                : shapeInstance.width

            textSvgGroupInstance.fill = props.fill
                ? props.fill
                : textSvgGroupInstance.fill

            two.update()
        }

        // update text data
        if (internalState?.text?.data) {
            let textInstance = internalState.text.data
            let textSvgGroupInstance = internalState.textSvgGroup.data
            textInstance.value = props.children?.text?.value
                ? props.children?.text?.value
                : textInstance.value
            textSvgGroupInstance.center()
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

    function closeToolbar() {
        toggleToolbar(false)
    }

    return (
        <React.Fragment>
            <div id="two-button"></div>
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
            {/* <button onClick={() => changeSVG()}>change button in text</button> */}
        </React.Fragment>
    )
}

// Link.propTypes = {
//   x: PropTypes.string,
//   y: PropTypes.string,
// };

// Link.defaultProps = {
//   x: 100,
//   y: 50,
// };

export default LinkWithIcon
