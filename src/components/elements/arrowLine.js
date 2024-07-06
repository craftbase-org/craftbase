import React, { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import PropTypes from 'prop-types'
import interact from 'interactjs'
import { useImmer } from 'use-immer'
import Two from 'two.js'

import { UPDATE_COMPONENT_INFO } from 'schema/mutations'
import Toolbar from 'components/floatingToolbar'
import ElementCreator from 'factory/arrowLine'

import { updateX1Y1Vertices, updateX2Y2Vertices } from 'utils/updateVertices'

function ArrowLine(props) {
    const [updateComponentInfo] = useMutation(UPDATE_COMPONENT_INFO, {
        ignoreResults: true,
    })
    const [showToolbar, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer({})

    const two = props.twoJSInstance
    let selectorInstance = null
    let groupObject = null

    function onBlurHandler(e) {
        console.log('on blur arrow line', e)
        // elementOnBlurHandler(e, selectorInstance, two)
        selectorInstance.pointCircle1Group.opacity = 0
        selectorInstance.pointCircle2Group.opacity = 0
        two.update()
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

    // Using unmount phase to remove event listeners
    useEffect(() => {
        // Calculate x and y through dividing width and height by 2 or vice versa
        // if x and y are given then multiply width and height into 2
        const offsetHeight = 0
        const prevX = props.x
        const prevY = props.y

        // console.log('arrowLine props', props)
        // Instantiate factory
        const elementFactory = new ElementCreator(two, prevX, prevY, {
            x1: props.x1 || 20,
            x2: props.x2 || 100,
            y1: props.y1 || 10,
            y2: props.y2 || 10,
        })
        // Get all instances of every sub child element
        const {
            group,
            pointCircle1Group,
            pointCircle2Group,
            pointCircle1,
            pointCircle2,
            line,
        } = elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }

        if (props.parentGroup) {
            /** This element will be rendered and scoped in its parent group */
            const parentGroup = props.parentGroup
            parentGroup.add(group)
            two.update()
        } else {
            /** This element will render by creating it's own group wrapper */
            groupObject = group
            // resizeLineInstance = resizeLine
            // const { selector } = getEditComponents(two, group, 4)
            selectorInstance = {
                pointCircle1Group,
                pointCircle2Group,
            }

            two.update()

            // console.log(
            //     'point circle dom',
            //     document.getElementById(pointCircle1.id)
            // )
            // some styling
            document.getElementById(line.id).style.cursor = 'pointer'
            document.getElementById(pointCircle1Group.id).style.cursor =
                'pointer'
            document.getElementById(pointCircle2Group.id).style.cursor =
                'pointer'

            // document
            //     .getElementById(pointCircle2.id)
            //     .setAttribute('class', 'dragger-picker')

            document
                .getElementById(group.id)
                .setAttribute('class', 'dragger-picker')

            // 1. for point circle 1
            document
                .getElementById(pointCircle1Group.id)
                .setAttribute('class', 'dragger-picker is-line-circle')

            document
                .getElementById(pointCircle1Group.id)
                .setAttribute('data-parent-id', group.id)

            document
                .getElementById(pointCircle1Group.id)
                .setAttribute('data-line-id', line.id)

            document
                .getElementById(pointCircle1Group.id)
                .setAttribute('data-direction', 'left')

            // 2. for point circle 2
            document
                .getElementById(pointCircle2Group.id)
                .setAttribute('class', 'dragger-picker is-line-circle')

            document
                .getElementById(pointCircle2Group.id)
                .setAttribute('data-parent-id', group.id)

            document
                .getElementById(pointCircle2Group.id)
                .setAttribute('data-line-id', line.id)

            document
                .getElementById(pointCircle2Group.id)
                .setAttribute('data-direction', 'right')

            // setting database's id in html attribute of element
            // document
            //     .getElementById(group.id)
            //     .setAttribute('data-component-id', props.id)
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
                draft.pointCircle1Group = {
                    id: pointCircle1Group.id,
                    data: pointCircle1Group,
                }
                draft.pointCircle2Group = {
                    id: pointCircle2Group.id,
                    data: pointCircle2Group,
                }
                draft.text = {
                    data: {},
                }
                draft.icon = {
                    data: {},
                }
            })

            const getGroupElementFromDOM = document.getElementById(
                `${group.id}`
            )
            getGroupElementFromDOM.addEventListener('focus', onFocusHandler)
            getGroupElementFromDOM.addEventListener('blur', onBlurHandler)
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
                // resizeLine.opacity = 1
                pointCircle1Group.opacity = 1
                pointCircle2Group.opacity = 1

                // pointCircle1Group.translation.x = line.vertices[0].x - 0
                // pointCircle1Group.translation.y =
                //     line.vertices[0].y + parseInt(line.linewidth)

                // here due to x2 being a arrow head, we need some offset.
                // pointCircle2Group.translation.x =
                //     line.vertices[1].x < line.vertices[0].x
                //         ? line.vertices[1].x - 6
                //         : line.vertices[1].x + 6
                // pointCircle2Group.translation.y =
                //     line.vertices[1].y + parseInt(line.linewidth)
                // selector.update(
                //     line.getBoundingClientRect(true).left - 10,
                //     line.getBoundingClientRect(true).right + 10,
                //     line.getBoundingClientRect(true).top - 10,
                //     line.getBoundingClientRect(true).bottom + 10
                // )
                two.update()
                toggleToolbar(true)
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

            // interact(`#${pointCircle1.id}`).draggable({
            //     // enable inertial throwing
            //     inertia: false,

            //     listeners: {
            //         start(event) {
            //             console.log(
            //                 'start dragging point circle',
            //                 event.clientX,
            //                 event.pageX,
            //                 line.translation.x1,
            //                 group.translation.x
            //             )
            //             document
            //                 .getElementById(`${pointCircle1.id}`)
            //                 .setAttribute('data-resize', 'true')
            //         },
            //         move(event) {
            //             if (event.shiftKey == true) {
            //                 let x1 = (line.vertices[0].x += event.dx)
            //                 let y1 = (line.vertices[0].y += event.dy)
            //                 updateX1Y1Vertices(line, x1, y1, pointCircle1)

            //                 /* update x2,y2 vertices acc. to shift key press event */
            //                 let x2 = line.vertices[1].x
            //                 let y2 = y1
            //                 updateX2Y2Vertices(line, x2, y2, pointCircle2)
            //             } else {
            //                 let x1 = (line.vertices[0].x += event.dx)
            //                 let y1 = (line.vertices[0].y += event.dy)
            //                 updateX1Y1Vertices(line, x1, y1, pointCircle1)
            //             }

            //             // group.center()
            //             two.update()
            //             // console.log('on move group translation ', group)
            //             // pointCircle1.translation.x =
            //             //     event.pageX + group.translation.x
            //             // pointCircle1.translation.y = event.pageY
            //             // two.update()
            //         },
            //         end(event) {
            //             // Had to use mutation as seperate here in this component due to
            //             // no control of pointcircle available in canvas component
            //             updateComponentInfo({
            //                 variables: {
            //                     id: props.id,
            //                     updateObj: {
            //                         x: group.translation.x,
            //                         y: group.translation.y,
            //                         x1: parseInt(line.vertices[0].x),
            //                         y1: parseInt(line.vertices[0].y),
            //                         x2: parseInt(line.vertices[1].x),
            //                         y2: parseInt(line.vertices[1].y),
            //                     },
            //                 },
            //             })
            //             document
            //                 .getElementById(`${pointCircle1.id}`)
            //                 .removeAttribute('data-resize')
            //         },
            //     },
            // })

            // interact(`#${pointCircle2.id}`).draggable({
            //     // enable inertial throwing
            //     inertia: false,

            //     listeners: {
            //         start(event) {
            //             console.log(
            //                 'start dragging point circle',
            //                 event.clientX,
            //                 event.pageX,
            //                 line.translation.x1,
            //                 group.translation.x
            //             )
            //             document
            //                 .getElementById(`${pointCircle2.id}`)
            //                 .setAttribute('data-resize', 'true')
            //         },
            //         move(event) {
            //             if (event.shiftKey === true) {
            //                 let x2 = (line.vertices[1].x += event.dx)
            //                 let y2 = (line.vertices[1].y += event.dy)
            //                 updateX2Y2Vertices(line, x2, y2, pointCircle2)

            //                 /* update x1,y1 vertices acc. to shift key press event */
            //                 let x1 = line.vertices[0].x
            //                 let y1 = y2
            //                 updateX1Y1Vertices(line, x1, y1, pointCircle1)
            //             } else {
            //                 let x2 = (line.vertices[1].x += event.dx)
            //                 let y2 = (line.vertices[1].y += event.dy)
            //                 updateX2Y2Vertices(line, x2, y2, pointCircle2)
            //             }

            //             // group.center()
            //             two.update()
            //             // console.log(
            //             //     'on move group translation ',
            //             //     group.translation.x
            //             // )
            //             // pointCircle1.translation.x =
            //             //     event.pageX + group.translation.x
            //             // pointCircle1.translation.y = event.pageY
            //             // two.update()
            //         },
            //         end(event) {
            //             // Had to use mutation as seperate here in this component due to
            //             // no control of pointcircle available in canvas component
            //             updateComponentInfo({
            //                 variables: {
            //                     id: props.id,
            //                     updateObj: {
            //                         x: group.translation.x,
            //                         y: group.translation.y,
            //                         x1: parseInt(line.vertices[0].x),
            //                         y1: parseInt(line.vertices[0].y),
            //                         x2: parseInt(line.vertices[1].x),
            //                         y2: parseInt(line.vertices[1].y),
            //                     },
            //                 },
            //             })
            //             document
            //                 .getElementById(`${pointCircle2.id}`)
            //                 .removeAttribute('data-resize')
            //         },
            //     },
            // })

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

    // const updateX2Y2Vertices = (line, x2, y2, pointCircle2) => {
    //     pointCircle2.translation.x =
    //         line.vertices[1].x < line.vertices[0].x
    //             ? line.vertices[1].x
    //             : line.vertices[1].x + 6
    //     pointCircle2.translation.y =
    //         line.vertices[1].y + parseInt(line.linewidth)

    //     // copied code from definition of makeArrow
    //     let headlen = 10

    //     let angle = Math.atan2(y2 - line.vertices[0].y, x2 - line.vertices[0].x)

    //     let vertices = [
    //         new Two.Anchor(
    //             line.vertices[0].x,
    //             line.vertices[0].y,
    //             undefined,
    //             undefined,
    //             undefined,
    //             undefined,
    //             Two.Commands.move
    //         ),
    //         new Two.Anchor(
    //             x2,
    //             y2,
    //             undefined,
    //             undefined,
    //             undefined,
    //             undefined,
    //             Two.Commands.line
    //         ),
    //         new Two.Anchor(
    //             x2 - headlen * Math.cos(angle - Math.PI / 4),
    //             y2 - headlen * Math.sin(angle - Math.PI / 4),
    //             undefined,
    //             undefined,
    //             undefined,
    //             undefined,
    //             Two.Commands.line
    //         ),

    //         new Two.Anchor(
    //             x2,
    //             y2,
    //             undefined,
    //             undefined,
    //             undefined,
    //             undefined,
    //             Two.Commands.move
    //         ),
    //         new Two.Anchor(
    //             x2 - headlen * Math.cos(angle + Math.PI / 4),
    //             y2 - headlen * Math.sin(angle + Math.PI / 4),
    //             undefined,
    //             undefined,
    //             undefined,
    //             undefined,
    //             Two.Commands.line
    //         ),
    //     ]
    //     line.vertices = vertices

    //     two.update()
    // }

    // const updateX1Y1Vertices = (line, x1, y1, pointCircle1) => {
    //     pointCircle1.translation.x = line.vertices[0].x + 0
    //     pointCircle1.translation.y =
    //         line.vertices[0].y + parseInt(line.linewidth)

    //     // copied code from definition of makeArrow
    //     let headlen = 10

    //     let angle = Math.atan2(line.vertices[1].y - y1, line.vertices[1].x - x1)

    //     let vertices = [
    //         new Two.Anchor(
    //             x1,
    //             y1,
    //             undefined,
    //             undefined,
    //             undefined,
    //             undefined,
    //             Two.Commands.move
    //         ),
    //         new Two.Anchor(
    //             line.vertices[1].x,
    //             line.vertices[1].y,
    //             undefined,
    //             undefined,
    //             undefined,
    //             undefined,
    //             Two.Commands.line
    //         ),
    //         new Two.Anchor(
    //             line.vertices[1].x - headlen * Math.cos(angle - Math.PI / 4),
    //             line.vertices[1].y - headlen * Math.sin(angle - Math.PI / 4),
    //             undefined,
    //             undefined,
    //             undefined,
    //             undefined,
    //             Two.Commands.line
    //         ),

    //         new Two.Anchor(
    //             line.vertices[1].x,
    //             line.vertices[1].y,
    //             undefined,
    //             undefined,
    //             undefined,
    //             undefined,
    //             Two.Commands.move
    //         ),
    //         new Two.Anchor(
    //             line.vertices[1].x - headlen * Math.cos(angle + Math.PI / 4),
    //             line.vertices[1].y - headlen * Math.sin(angle + Math.PI / 4),
    //             undefined,
    //             undefined,
    //             undefined,
    //             undefined,
    //             Two.Commands.line
    //         ),
    //     ]
    //     line.vertices = vertices

    //     two.update()
    // }

    useEffect(() => {
        if (internalState?.group?.data) {
            let groupInstance = internalState.group.data
            let lineInstance = internalState.line.data
            let pointCircle1Group = internalState.pointCircle1Group.data
            let pointCircle2Group = internalState.pointCircle2Group.data
            groupInstance.translation.x = props.x
            groupInstance.translation.y = props.y
            two.update()
            // updateX1Y1Vertices(lineInstance, props.x1, props.y1, pointCircle1Group)
            // updateX2Y2Vertices(lineInstance, props.x2, props.y2, pointCircle2Group)
        }
    }, [props.x, props.y, props.metadata])

    useEffect(() => {
        if (internalState?.group?.data) {
            updateX1Y1Vertices(
                Two,
                internalState.line.data,
                props.x1,
                props.y1,
                internalState.pointCircle1Group.data,
                two
            )
            updateX2Y2Vertices(
                Two,
                internalState.line.data,
                props.x2,
                props.y2,
                internalState.pointCircle2Group.data,
                two
            )
        }
    }, [props.x1, props.x2, props.y1, props.y2])

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
                    componentId={props.id}
                    postToolbarUpdate={() => {
                        two.update()
                    }}
                    // updateComponent={() => {
                    //     two.update()
                    // }}
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
