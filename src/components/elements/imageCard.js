import React, { useEffect, useState, useRef } from 'react'
import interact from 'interactjs'
import { useImmer } from 'use-immer'
import { useBoardContext } from 'views/Board/board'

import { elementOnBlurHandler } from 'utils/misc'
import getEditComponents from 'components/utils/editWrapper'
import Toolbar from 'components/floatingToolbar'
import ElementFactory from 'factory/imagecard'

function ImageCard(props) {
    const {
        addToLocalComponentStore,
        updateComponentBulkPropertiesInLocalStore,
    } = useBoardContext()

    const [showToolbar, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer({ externalSVG: null })
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
        const {
            group,
            rectSvgGroup,
            externalSVG,
            externalSVGGroup,
            rectangle,
        } = elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }

        if (props.parentGroup) {
            /** This element will be rendered and scoped in its parent group */
            const parentGroup = props.parentGroup
            rectSvgGroup.translation.x = props.metaData.x

            parentGroup.add(rectSvgGroup)
            two.update()
        } else {
            /** This element will render by creating it's own group wrapper */
            groupObject = group
            stateRefForGroup.current = group

            const { selector } = getEditComponents(two, group, 4)
            selectorInstance = selector

            group.children.unshift(rectSvgGroup)
            two.update()

            document
                .getElementById(group.id)
                .setAttribute('class', 'dragger-picker')
            document
                .getElementById(group.id)
                .setAttribute('data-label', 'imagecard_coord')

            setInternalState((draft) => {
                draft.element = {
                    [rectSvgGroup.id]: rectSvgGroup,
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
                    id: externalSVG.id,
                    data: externalSVG,
                }
                draft.externalSVGGroup = {
                    id: externalSVGGroup.id,
                    data: externalSVGGroup,
                }
            })

            const getGroupElementFromDOM = document.getElementById(
                `${group.id}`
            )
            getGroupElementFromDOM.addEventListener('focus', onFocusHandler)
            getGroupElementFromDOM.addEventListener('blur', onBlurHandler)

            // const { mousemove, mouseup } = handleDrag(two, group, 'imagecard')

            interact(`#${group.id}`).on('click', () => {
                console.log('on click ')
                selector.update(
                    rectangle.getBoundingClientRect(true).left - 5,
                    rectangle.getBoundingClientRect(true).right + 5,
                    rectangle.getBoundingClientRect(true).top - 5,
                    rectangle.getBoundingClientRect(true).bottom + 5
                )
                two.update()
                // toggleToolbar(true)
            })

            // Captures double click event for text
            // and generates temporary textarea support for it

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
                        let midpoint = (rectangle.width + rectangle.height) / 2

                        let initialScaleCoefficient = parseInt(
                            midpoint / externalSVG.scale
                        )

                        const rect = event.rect
                        const minRectHeight = parseInt(rect.height / 2)
                        const minRectWidth = parseInt(rect.width / 2)

                        // Restrict width and height at arbitrary point difference where it would
                        // be unstable for further SVG scaling calculations
                        const minDiff = Math.abs(rect.width - rect.height)

                        // Prevent the rectangle radius to be shrinked to less than 10
                        if (
                            minRectHeight > 20 &&
                            minRectWidth > 20 &&
                            minDiff < 100
                        ) {
                            // update the element's style
                            rectangle.width = rect.width - 10
                            rectangle.height = rect.height - 10
                            midpoint = parseInt(
                                (rectangle.width + rectangle.height) / 2
                            )

                            // console.log("rectangle.radius", rectangle.radius);
                            externalSVG.scale =
                                midpoint / initialScaleCoefficient
                            console.log('externalSVG.scale', externalSVG.scale)
                            externalSVGGroup.center()

                            selector.update(
                                rectangle.getBoundingClientRect(true).left - 5,
                                rectangle.getBoundingClientRect(true).right + 5,
                                rectangle.getBoundingClientRect(true).top - 5,
                                rectangle.getBoundingClientRect(true).bottom + 5
                            )
                        }

                        two.update()
                    },
                    end(event) {
                        console.log('the end')

                        let updateObj = {
                            width: parseInt(rectangle.width),
                            height: parseInt(rectangle.height),
                            children: {
                                ...props.children,
                                icon: {
                                    iconType:
                                        props.children?.icon?.iconType || null,
                                    iconStroke:
                                        props.children?.icon?.iconStroke ||
                                        null,
                                    iconScale: externalSVG.scale,
                                },
                            },
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
            //       localStorage.setItem('imagecard_coordX', parseInt(event.pageX));
            //       localStorage.setItem(
            //         'imagecard_coordY',
            //         parseInt(event.pageY - offsetHeight)
            //       );
            //       dispatch(setPeronsalInformation('COMPLETE', { data: {} }));
            //     },
            //   },
            // });
        }

        return () => {
            console.log('UNMOUNTING in ImageCard', group)
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
            shapeInstance.height = props.height
                ? props.height
                : shapeInstance.height
            shapeInstance.radius = parseInt(shapeInstance.width / 2)
            shapeInstance.fill = props.fill ? props.fill : shapeInstance.fill

            two.update()
        }

        // update external svg/icon data
        if (internalState?.icon?.data) {
            let externalSVGInstance = internalState.icon.data
            let externalSVGGroupInstance = internalState.externalSVGGroup.data
            externalSVGInstance.scale = props.children?.icon?.iconScale
                ? props.children?.icon?.iconScale
                : externalSVGInstance.scale
            externalSVGGroupInstance.center()
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
            <div id="two-image-card"></div>
            {/* {showToolbar ? (
                <Toolbar
                    toggle={showToolbar}
                    componentState={internalState}
                    closeToolbar={closeToolbar}
                    componentId={props.id}
                    postToolbarUpdate={() => {
                        two.update()
                    }}
                />
            ) : null} */}
            {/* <button>change button in group</button> */}
        </React.Fragment>
    )
}

export default ImageCard
