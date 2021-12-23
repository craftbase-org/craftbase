import React, { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import PropTypes from 'prop-types'
import interact from 'interactjs'
import { useDispatch, useSelector } from 'react-redux'
import { useImmer } from 'use-immer'
import Two from 'two.js'

import { UPDATE_COMPONENT_INFO } from 'schema/mutations'
import { elementOnBlurHandler } from 'utils/misc'
import getEditComponents from 'components/utils/editWrapper'
import handleDrag from 'components/utils/dragger'
import Toolbar from 'components/floatingToolbar'
import { setPeronsalInformation } from 'store/actions/main'
import ElementCreator from 'factory/arrowLine'

function ArrowLine(props) {
    const [updateComponentInfo] = useMutation(UPDATE_COMPONENT_INFO, {
        ignoreResults: true,
    })
    const [showToolbar, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer({})

    const two = props.twoJSInstance
    let selectorInstance = null
    let groupObject = null
    let resizeLineInstance = null

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
        const elementFactory = new ElementCreator(two, prevX, prevY, {
            x1: props.x1,
            x2: props.x2,
            y1: props.y1,
            y2: props.y2,
        })
        // Get all instances of every sub child element
        const { group, pointCircle1, pointCircle2, resizeLine, line } =
            elementFactory.createElement()
        group.elementData = props?.itemData

        if (props.parentGroup) {
            /** This element will be rendered and scoped in its parent group */
            const parentGroup = props.parentGroup
            parentGroup.add(group)
            two.update()
        } else {
            /** This element will render by creating it's own group wrapper */
            groupObject = group
            resizeLineInstance = resizeLine
            // const { selector } = getEditComponents(two, group, 4)
            selectorInstance = null

            two.update()

            console.log(
                'point circle dom',
                document.getElementById(pointCircle1.id)
            )
            // some styling
            document.getElementById(line.id).style.cursor = 'pointer'
            document.getElementById(pointCircle1.id).style.cursor = 'pointer'
            document.getElementById(pointCircle2.id).style.cursor = 'pointer'

            document
                .getElementById(pointCircle1.id)
                .setAttribute('class', 'avoid-dragging')
            document
                .getElementById(pointCircle2.id)
                .setAttribute('class', 'avoid-dragging')

            document
                .getElementById(group.id)
                .setAttribute('class', 'dragger-picker')
            // document
            //     .getElementById(group.id)
            //     .setAttribute('data-label', 'line_coord')

            setInternalState((draft) => {
                draft.element = {
                    [group.id]: group,
                    [line.id]: line,
                }
                draft.group = {
                    id: group.id,
                    data: group,
                }
                draft.shape = {
                    id: line.id,
                    data: line,
                }
                draft.line = {
                    id: line.id,
                    data: line,
                }
                draft.pointCircle1 = {
                    id: pointCircle1.id,
                    data: pointCircle1,
                }
                draft.pointCircle2 = {
                    id: pointCircle2.id,
                    data: pointCircle2,
                }
                draft.text = {
                    data: {},
                }
                draft.icon = {
                    data: {},
                }
            })

            // const getGroupElementFromDOM = document.getElementById(
            //     `${group.id}`
            // )
            // getGroupElementFromDOM.addEventListener('focus', onFocusHandler)
            // getGroupElementFromDOM.addEventListener('blur', onBlurHandler)

            // const { mousemove, mouseup } = handleDrag(two, group, 'line')

            // interact(`#${group.id}`).on('click', () => {
            //     console.log('on click ')
            //     // resizeLine.opacity = 1
            //     selector.update(
            //         line.getBoundingClientRect(true).left - 10,
            //         line.getBoundingClientRect(true).right + 10,
            //         line.getBoundingClientRect(true).top - 10,
            //         line.getBoundingClientRect(true).bottom + 10
            //     )
            //     two.update()
            //     toggleToolbar(true)
            // })

            interact(`#${group.id}`).on('click', (e) => {
                console.log('on click group', e)
                // pointCircle1.opacity = 0
                resizeLine.opacity = 1
                pointCircle1.translation.x = line.vertices[0].x - 4
                pointCircle1.translation.y = line.vertices[0].y - 6
                pointCircle2.translation.x = line.vertices[1].x + 4
                pointCircle2.translation.y = line.vertices[1].y - 6
                // selector.update(
                //     line.getBoundingClientRect(true).left - 10,
                //     line.getBoundingClientRect(true).right + 10,
                //     line.getBoundingClientRect(true).top - 10,
                //     line.getBoundingClientRect(true).bottom + 10
                // )
                two.update()
                // toggleToolbar(true)
            })

            interact(`#${group.id}`).on('blur', (e) => {
                console.log('on click group', e)
                // pointCircle1.opacity = 0
                resizeLine.opacity = 0
                pointCircle1.translation.x = line.vertices[0].x - 4
                pointCircle1.translation.y = line.vertices[0].y - 6
                pointCircle2.translation.x = line.vertices[1].x + 4
                pointCircle2.translation.y = line.vertices[1].y - 6
                // selector.update(
                //     line.getBoundingClientRect(true).left - 10,
                //     line.getBoundingClientRect(true).right + 10,
                //     line.getBoundingClientRect(true).top - 10,
                //     line.getBoundingClientRect(true).bottom + 10
                // )
                two.update()
                // toggleToolbar(true)
            })

            // Captures double click event for text
            // and generates temporary textarea support for it

            // interact(`#${group.id}`).resizable({
            //     edges: { right: true, left: true },

            //     listeners: {
            //         start() {
            //             resizeLine.opacity = 1
            //             getGroupElementFromDOM.setAttribute(
            //                 'data-resize',
            //                 'true'
            //             )
            //             // window.removeEventListener(
            //             //     'mousemove',
            //             //     mousemove,
            //             //     false
            //             // )
            //             // window.removeEventListener('mouseup', mouseup, false)
            //         },
            //         move(event) {
            //             console.log('on resize event', event.edges)

            //             // Check for which edge has been selected for resizing
            //             if (event.edges.left) {
            //                 line.vertices[0].x += event.dx
            //                 pointCircle1.translation.x = line.vertices[0].x
            //             } else if (event.edges.right) {
            //                 // line.vertices[0].x += event.dx;
            //                 line.vertices[1].x += event.dx
            //                 pointCircle2.translation.x = line.vertices[1].x
            //             }

            //             two.update()
            //         },
            //         end(event) {
            //             console.log('the end')
            //             getGroupElementFromDOM.removeAttribute('data-resize')
            //         },
            //     },
            // })

            interact(`#${pointCircle1.id}`).draggable({
                // enable inertial throwing
                inertia: false,

                listeners: {
                    start(event) {
                        console.log(
                            'start dragging point circle',
                            event.clientX,
                            event.pageX,
                            line.translation.x1,
                            group.translation.x
                        )
                    },
                    move(event) {
                        let x1 = (line.vertices[0].x += event.dx)
                        let y1 = (line.vertices[0].y += event.dy)
                        updateX1Y1Vertices(line, x1, y1, pointCircle1)

                        two.update()
                        // pointCircle1.translation.x =
                        //     event.pageX + group.translation.x
                        // pointCircle1.translation.y = event.pageY
                        // two.update()
                    },
                    end(event) {
                        // Had to use mutation as seperate here in this component due to
                        // no control of pointcircle available in canvas component
                        updateComponentInfo({
                            variables: {
                                id: props.id,
                                updateObj: {
                                    x1: parseInt(line.vertices[0].x),
                                    y1: parseInt(line.vertices[0].y),
                                },
                            },
                        })
                    },
                },
            })

            interact(`#${pointCircle2.id}`).draggable({
                // enable inertial throwing
                inertia: false,

                listeners: {
                    start(event) {
                        console.log(
                            'start dragging point circle',
                            event.clientX,
                            event.pageX,
                            line.translation.x1,
                            group.translation.x
                        )
                    },
                    move(event) {
                        let x2 = (line.vertices[1].x += event.dx)
                        let y2 = (line.vertices[1].y += event.dy)
                        updateX2Y2Vertices(line, x2, y2, pointCircle2)
                        // pointCircle1.translation.x =
                        //     event.pageX + group.translation.x
                        // pointCircle1.translation.y = event.pageY
                        // two.update()
                    },
                    end(event) {
                        // Had to use mutation as seperate here in this component due to
                        // no control of pointcircle available in canvas component
                        updateComponentInfo({
                            variables: {
                                id: props.id,
                                updateObj: {
                                    x2: parseInt(line.vertices[1].x),
                                    y2: parseInt(line.vertices[1].y),
                                },
                            },
                        })
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
            //             group.translation.x = event.pageX
            //             group.translation.y = event.pageY
            //             two.update()

            //             updateComponentInfo({
            //                 variables: {
            //                     id: props.id,
            //                     updateObj: {
            //                         x: parseInt(event.pageX),
            //                         y: parseInt(event.pageY),
            //                     },
            //                 },
            //             })
            //         },
            //     },
            // })
        }

        return () => {
            console.log('UNMOUNTING in Divider', group)
            // clean garbage by removing instance
            // two.remove(group)
        }
    }, [])

    const updateX2Y2Vertices = (line, x2, y2, pointCircle2) => {
        pointCircle2.translation.x = line.vertices[1].x + 4
        pointCircle2.translation.y = line.vertices[1].y - 6

        // copied code from definition of makeArrow
        let headlen = 10

        let angle = Math.atan2(y2 - line.vertices[0].y, x2 - line.vertices[0].x)

        let vertices = [
            new Two.Anchor(
                line.vertices[0].x,
                line.vertices[0].y,
                undefined,
                undefined,
                undefined,
                undefined,
                Two.Commands.move
            ),
            new Two.Anchor(
                x2,
                y2,
                undefined,
                undefined,
                undefined,
                undefined,
                Two.Commands.line
            ),
            new Two.Anchor(
                x2 - headlen * Math.cos(angle - Math.PI / 4),
                y2 - headlen * Math.sin(angle - Math.PI / 4),
                undefined,
                undefined,
                undefined,
                undefined,
                Two.Commands.line
            ),

            new Two.Anchor(
                x2,
                y2,
                undefined,
                undefined,
                undefined,
                undefined,
                Two.Commands.move
            ),
            new Two.Anchor(
                x2 - headlen * Math.cos(angle + Math.PI / 4),
                y2 - headlen * Math.sin(angle + Math.PI / 4),
                undefined,
                undefined,
                undefined,
                undefined,
                Two.Commands.line
            ),
        ]
        line.vertices = vertices

        two.update()
    }

    const updateX1Y1Vertices = (line, x1, y1, pointCircle1) => {
        pointCircle1.translation.x = line.vertices[0].x + 4
        pointCircle1.translation.y = line.vertices[0].y - 6

        // copied code from definition of makeArrow
        let headlen = 10

        let angle = Math.atan2(line.vertices[1].y - y1, line.vertices[1].x - x1)

        let vertices = [
            new Two.Anchor(
                x1,
                y1,
                undefined,
                undefined,
                undefined,
                undefined,
                Two.Commands.move
            ),
            new Two.Anchor(
                line.vertices[1].x,
                line.vertices[1].y,
                undefined,
                undefined,
                undefined,
                undefined,
                Two.Commands.line
            ),
            new Two.Anchor(
                line.vertices[1].x - headlen * Math.cos(angle - Math.PI / 4),
                line.vertices[1].y - headlen * Math.sin(angle - Math.PI / 4),
                undefined,
                undefined,
                undefined,
                undefined,
                Two.Commands.line
            ),

            new Two.Anchor(
                line.vertices[1].x,
                line.vertices[1].y,
                undefined,
                undefined,
                undefined,
                undefined,
                Two.Commands.move
            ),
            new Two.Anchor(
                line.vertices[1].x - headlen * Math.cos(angle + Math.PI / 4),
                line.vertices[1].y - headlen * Math.sin(angle + Math.PI / 4),
                undefined,
                undefined,
                undefined,
                undefined,
                Two.Commands.line
            ),
        ]
        line.vertices = vertices

        two.update()
    }

    useEffect(() => {
        if (internalState?.group?.data) {
            let groupInstance = internalState.group.data
            let lineInstance = internalState.line.data
            let pointCircle1 = internalState.pointCircle1.data
            let pointCircle2 = internalState.pointCircle2.data

            groupInstance.translation.x = props.x
            groupInstance.translation.y = props.y
            two.update()

            updateX1Y1Vertices(lineInstance, props.x1, props.y1, pointCircle1)
            updateX2Y2Vertices(lineInstance, props.x2, props.y2, pointCircle2)
        }
    }, [
        props.x,
        props.y,
        props.metadata,
        props.x1,
        props.x2,
        props.y1,
        props.y2,
    ])

    function closeToolbar() {
        toggleToolbar(false)
    }

    return (
        <React.Fragment>
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

ArrowLine.propTypes = {
    x: PropTypes.number,
    y: PropTypes.number,
}

ArrowLine.defaultProps = {
    x: 100,
    y: 50,
}

export default ArrowLine
