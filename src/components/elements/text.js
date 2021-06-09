import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import interact from 'interactjs'
import { useDispatch, useSelector } from 'react-redux'
import { useImmer } from 'use-immer'

import { elementOnBlurHandler } from 'utils/misc'
import getEditComponents from 'components/utils/editWrapper'
import handleDrag from 'components/utils/dragger'
import Toolbar from 'components/floatingToolbar'
import { setPeronsalInformation } from 'store/actions/main'
import ElementFactory from 'factory/text'

function Text(props) {
    const [showToolbar, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer({ textFontSize: 16 })
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
        let textFontSize = 16
        let textValue = 'This is HTML gregre reyreyyre yryeyer'
        let itemData = props?.itemData
        // Calculate x and y through dividing width and height by 2 or vice versa
        // if x and y are given then multiply width and height into 2
        const offsetHeight = 0
        const prevX = localStorage.getItem('text_coordX')
        const prevY = localStorage.getItem('text_coordY')

        // Instantiate factory
        const elementFactory = new ElementFactory(two, prevX, prevY, {})
        // Get all instances of every sub child element
        const { group, rectTextGroup, rectangle } =
            elementFactory.createElement()

        // the custom foreign object hook
        const svgElem = rectTextGroup._renderer.elem

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

            group.children.unshift(rectTextGroup)
            two.update()

            setInternalState((draft) => {
                draft.element = {
                    [rectTextGroup.id]: rectTextGroup,
                    [group.id]: group,
                    [rectangle.id]: rectangle,
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
                // draft.text = {
                //   id: text.id,
                //   data: text,
                // };
                draft.icon = {
                    data: {},
                }
            })

            const getGroupElementFromDOM = document.getElementById(
                `${group.id}`
            )
            getGroupElementFromDOM.addEventListener('focus', onFocusHandler)
            getGroupElementFromDOM.addEventListener('blur', onBlurHandler)

            const { mousemove, mouseup } = handleDrag(two, group, 'text')

            interact(`#${group.id}`).on('click', () => {
                console.log(
                    'group id rectText id rect id',
                    group.id,
                    rectTextGroup.id,
                    rectangle.id,
                    rectTextGroup.getBoundingClientRect(true)
                )
                selector.update(
                    rectTextGroup.getBoundingClientRect(true).left - 5,
                    rectTextGroup.getBoundingClientRect(true).right + 5,
                    rectTextGroup.getBoundingClientRect(true).top - 5,
                    rectTextGroup.getBoundingClientRect(true).bottom + 5
                )
                two.update()
                toggleToolbar(true)
            })

            // Captures double click event for text
            // and generates temporary textarea support for it
            rectTextGroup._renderer.elem.addEventListener('dblclick', () => {
                // console.log('on click for texy', text.id);

                // Hide actual text and replace it with input box
                const twoTextInstance = document.getElementById(`${group.id}`)
                const getCoordOfBtnText =
                    twoTextInstance.getBoundingClientRect()
                twoTextInstance.style.display = 'none'

                const input = document.createElement('textarea')
                const topBuffer = 2
                const randomNumber = Math.floor(Math.random() * 90 + 10)
                input.id = `two-temp-input-area-${randomNumber}`
                input.value = props?.itemData?.text || textValue
                input.rows = 3
                input.style.border = '1px solid #000'
                input.style.padding = '6px'
                input.style.color = props?.itemData?.color
                    ? props?.itemData?.color
                    : '#000'
                input.style.fontSize = `${props?.itemData?.fontSize}px`
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

                input.addEventListener('input', (event) => {})

                input.addEventListener('blur', () => {
                    console.log(
                        'at blur text',
                        input.value,
                        input.rows,
                        input.scrollHeight,
                        document
                            .getElementById(input.id)
                            .getBoundingClientRect()
                    )

                    twoTextInstance.style.display = 'block'

                    textValue = input.value

                    // USE 4 LINES 4 CIRCLES
                    //   selector.update(
                    //     rectTextGroup.getBoundingClientRect(true).left - 5,
                    //     rectTextGroup.getBoundingClientRect(true).right + 5,
                    //     rectTextGroup.getBoundingClientRect(true).top - 5,
                    //     rectTextGroup.getBoundingClientRect(true).bottom + 5
                    //   );
                    selector.hide()

                    rectTextGroup.height = input.scrollHeight
                    rectangle.height = input.scrollHeight
                    two.update()
                    console.log(
                        'rectangle.height',
                        rectangle.height,
                        input.scrollHeight
                    )
                    svgElem.innerHTML = `
          <foreignObject x=${
              rectTextGroup.getBoundingClientRect(true).left
          } y=${rectTextGroup.getBoundingClientRect(true).top} width=${
                        rectangle.width
                    } height=${rectangle.height}>
              <div style="font-size:${textFontSize + 'px'}">${textValue}</div>
          </foreignObject>
          `
                    two.update()
                    input.remove()
                })
            })

            interact(`#${group.id}`).resizable({
                edges: { right: true, left: true, top: true, bottom: true },

                listeners: {
                    start() {
                        window.removeEventListener(
                            'mousemove',
                            mousemove,
                            false
                        )
                        window.removeEventListener('mouseup', mouseup, false)
                    },
                    move(event) {
                        let target = event.target
                        let rect = event.rect

                        if (
                            rect.width <
                                rectTextGroup.getBoundingClientRect(true)
                                    .width ||
                            rect.height <
                                rectTextGroup.getBoundingClientRect(true).height
                        ) {
                            console.log(
                                'new rect width low',
                                props.itemData.data.fontSize
                            )

                            rectangle.width = rect.width
                            rectangle.height = rect.height
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

                            svgElem.innerHTML = `
      <foreignObject x=${rectTextGroup.getBoundingClientRect(true).left} y=${
                                rectTextGroup.getBoundingClientRect(true).top
                            } width=${rectangle.width} height=${
                                rectangle.height
                            }>
          <div style="font-size:${textFontSize + 'px'}">${textValue}</div>
      </foreignObject>
      `
                        } else if (
                            rect.width >
                                rectTextGroup.getBoundingClientRect(true)
                                    .width ||
                            rect.height >
                                rectTextGroup.getBoundingClientRect(true).height
                        ) {
                            rectangle.width = rect.width
                            rectangle.height = rect.height
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

                            svgElem.innerHTML = `
        <foreignObject x=${rectTextGroup.getBoundingClientRect(true).left} y=${
                                rectTextGroup.getBoundingClientRect(true).top
                            } width=${rectangle.width} height=${
                                rectangle.height
                            }>
            <div style="font-size:${textFontSize + 'px'}">${textValue}</div>
        </foreignObject>
        `
                            console.log('new rect width high')
                        }

                        two.update()
                        // Restrict width to shrink if it has reached point
                        //  where it's width should be less than or equal to text's
                        // if (rect.width > text.getBoundingClientRect().width) {
                        //   rectangle.width = rect.width;
                        //   rectangle.height = rect.height;
                        //   text.size = rosterSize;
                        //   selector.update(
                        //     rectTextGroup.getBoundingClientRect(true).left - 5,
                        //     rectTextGroup.getBoundingClientRect(true).right + 5,
                        //     rectTextGroup.getBoundingClientRect(true).top - 5,
                        //     rectTextGroup.getBoundingClientRect(true).bottom + 5
                        //   );
                        // }
                    },
                    end(event) {
                        console.log('the end', event)
                    },
                },
            })

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
            //       localStorage.setItem('text_coordX', parseInt(event.pageX));
            //       localStorage.setItem(
            //         'text_coordY',
            //         parseInt(event.pageY - offsetHeight)
            //       );
            //       dispatch(setPeronsalInformation('COMPLETE', { data: {} }));
            //     },
            //   },
            // });
        }

        return () => {
            console.log('UNMOUNTING in Circle', group)
            // clean garbage by removing instance
            two.remove(group)
        }
    }, [])

    function closeToolbar() {
        toggleToolbar(false)
    }

    return (
        <React.Fragment>
            <div id="two-text"></div>
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

// Text.propTypes = {
//   x: PropTypes.string,
//   y: PropTypes.string,
// };

// Text.defaultProps = {
//   x: 100,
//   y: 50,
// };

export default Text
