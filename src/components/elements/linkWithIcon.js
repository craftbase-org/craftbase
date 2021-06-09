import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import interact from 'interactjs'
import { useDispatch, useSelector } from 'react-redux'
import { useImmer } from 'use-immer'

import { elementOnBlurHandler } from 'utils/misc'
import Toolbar from 'components/floatingToolbar'
import handleDrag from 'components/utils/dragger'
import { setPeronsalInformation } from 'store/actions/main'
import getEditComponents from 'components/utils/editWrapper'
import ElementFactory from 'factory/linkwithicon'

function LinkWithIcon(props) {
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
        const prevX = localStorage.getItem('linkwithicon_coordX')
        const prevY = localStorage.getItem('linkwithicon_coordY')

        // Instantiate factory
        const elementFactory = new ElementFactory(two, prevX, prevY, {})
        // Get all instances of every sub child element
        const { group, textGroup, externalSVG, text } =
            elementFactory.createElement()

        if (props.parentGroup) {
            /** This element will be rendered and scoped in its parent group */
            const parentGroup = props.parentGroup
            textGroup.translation.x = props.metaData.x
            parentGroup.add(textGroup)
            two.update()
        } else {
            /** This element will render by creating it's own group wrapper */
            groupObject = group

            const { selector, toolbar } = getEditComponents(two, group, 4)
            selectorInstance = selector

            // Shifting order of objects in group to reflect "z-index alias" mechanism for text box
            group.children.unshift(textGroup)
            two.update()

            setInternalState((draft) => {
                draft.element = {
                    [textGroup.id]: textGroup,
                    [group.id]: group,
                    // [selector.id]: selector,
                }
                draft.group = {
                    id: group.id,
                    data: group,
                }
                draft.shape = {
                    id: textGroup.id,
                    data: textGroup,
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

            const { mousemove, mouseup } = handleDrag(
                two,
                group,
                'linkwithicon'
            )

            interact(`#${group.id}`).on('click', () => {
                console.log('on click ', text.getBoundingClientRect(true))
                selector.update(
                    textGroup.getBoundingClientRect(true).left - 30,
                    textGroup.getBoundingClientRect(true).right + 10,
                    textGroup.getBoundingClientRect(true).top - 10,
                    textGroup.getBoundingClientRect(true).bottom + 10
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
                    textGroup.getBoundingClientRect(true).width
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
                        textGroup.getBoundingClientRect(true).width + 4
                    }px`

                    // Synchronously update selector tool's coordinates
                    text.value = input.value
                    selector.update(
                        textGroup.getBoundingClientRect(true).left - 30,
                        textGroup.getBoundingClientRect(true).right + 30,
                        textGroup.getBoundingClientRect(true).top - 10,
                        textGroup.getBoundingClientRect(true).bottom + 10
                    )
                    two.update()
                })

                input.addEventListener('blur', () => {
                    twoTextInstance.style.display = 'block'
                    text.value = input.value
                    input.remove()
                    console.log(
                        'input blur event',
                        textGroup.id,
                        textGroup.getBoundingClientRect()
                    )

                    // USE 4 LINES 4 CIRCLES

                    selector.update(
                        textGroup.getBoundingClientRect(true).left - 30,
                        textGroup.getBoundingClientRect(true).right + 10,
                        textGroup.getBoundingClientRect(true).top - 10,
                        textGroup.getBoundingClientRect(true).bottom + 10
                    )
                    selector.hide()
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
            two.remove(group)
        }
    }, [])

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