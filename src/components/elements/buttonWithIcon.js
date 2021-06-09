import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import interact from 'interactjs'
import { useDispatch, useSelector } from 'react-redux'
import { useImmer } from 'use-immer'

import { elementOnBlurHandler } from 'utils/misc'
import handleDrag from 'components/utils/dragger'
import getEditComponents from 'components/utils/editWrapper'
import Toolbar from 'components/floatingToolbar'
import { setPeronsalInformation } from 'store/actions/main'
import ElementCreator from 'factory/buttonwithicon'

function ButtonWithIcon(props) {
    const [showToolbar, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer({})
    const dispatch = useDispatch()
    const two = props.twoJSInstance
    let selectorInstance = null
    let groupObject = null
    let rectContainer = null

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
        const prevX = localStorage.getItem('buttonwithicon_coordX')
        const prevY = localStorage.getItem('buttonwithicon_coordY')

        // Instantiate factory
        const elementFactory = new ElementCreator(two, prevX, prevY, {
            textString: 'Call',
        })
        // Get all instances of every sub child element
        const {
            group,
            text,
            rectangle,
            textGroup,
            externalSVG,
            rectTextGroup,
        } = elementFactory.createElement()
        rectContainer = rectangle

        if (props.parentGroup) {
            /** This element will be rendered and scoped in its parent group */
            const parentGroup = props.parentGroup
            parentGroup.add(rectTextGroup)
            two.update()
        } else {
            /** This element will render by creating it's own group wrapper */
            groupObject = group

            const { selector } = getEditComponents(two, group, 4)
            selectorInstance = selector

            group.children.unshift(textGroup)
            two.update()

            // reference all instances in state
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
                    id: rectangle.id,
                    data: rectangle,
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
                'buttonwithicon'
            )

            interact(`#${group.id}`).on('click', () => {
                console.log('on click ', text.getBoundingClientRect(true))
                selector.update(
                    textGroup.getBoundingClientRect(true).left - 50,
                    textGroup.getBoundingClientRect(true).right + 20,
                    textGroup.getBoundingClientRect(true).top - 20,
                    textGroup.getBoundingClientRect(true).bottom + 20
                )
                two.update()
                toggleToolbar(true)
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
                input.style.color = '#fff'
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
                        textGroup.getBoundingClientRect(true).left - 50,
                        textGroup.getBoundingClientRect(true).right + 20,
                        textGroup.getBoundingClientRect(true).top - 20,
                        textGroup.getBoundingClientRect(true).bottom + 20
                    )

                    rectangle.vertices[1].x =
                        textGroup.getBoundingClientRect(true).right + 12
                    rectangle.vertices[2].x =
                        textGroup.getBoundingClientRect(true).right + 12

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
                        textGroup.getBoundingClientRect(true).left - 50,
                        textGroup.getBoundingClientRect(true).right + 20,
                        textGroup.getBoundingClientRect(true).top - 20,
                        textGroup.getBoundingClientRect(true).bottom + 20
                    )
                    selector.hide()
                    two.update()
                })
            })

            // interact(`#${group.id}`).resizable({
            //   edges: { right: true, left: true },

            //   listeners: {
            //     move(event) {
            //       const target = event.target;
            //       const rect = event.rect;

            //       // update the element's style
            //       //   resizeRect.width = rect.width;
            //       rectangle.width = rect.width;
            //       rectangle.height = rect.height;
            //       // rectangle.radius = parseInt(rect.width / 2);

            //       two.update();
            //     },
            //     end(event) {
            //       console.log("the end");
            //     },
            //   },
            // });

            // Attach draggable property to element
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
            //                 'buttonwithicon_coordX',
            //                 parseInt(event.pageX)
            //             )
            //             localStorage.setItem(
            //                 'buttonwithicon_coordY',
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
            console.log('UNMOUNTING in Button with icon', group)
            // clean garbage by removing instance
            two.remove(group)
        }
    }, [])

    function closeToolbar() {
        toggleToolbar(false)
    }

    return (
        <React.Fragment>
            <div id="two-button-with-icon"></div>
            {showToolbar ? (
                <Toolbar
                    toggle={showToolbar}
                    componentState={internalState}
                    closeToolbar={closeToolbar}
                    updateComponent={() => {
                        // exception: small patch for this element only
                        internalState.shape.data.stroke =
                            internalState.shape.data.fill

                        two.update()
                    }}
                />
            ) : null}
        </React.Fragment>
    )
}

// ButtonWithIcon.propTypes = {
//   x: PropTypes.string,
//   y: PropTypes.string,
// };

// ButtonWithIcon.defaultProps = {
//   x: 100,
//   y: 50,
// };

export default ButtonWithIcon