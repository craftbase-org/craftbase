import Two from 'two.js'
import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import interact from 'interactjs'
import { useQuery, useMutation } from '@apollo/client'
import { useImmer } from 'use-immer'
import { useBoardContext } from 'views/Board/board'

import { UPDATE_COMPONENT_INFO } from 'schema/mutations'
import { elementOnBlurHandler } from 'utils/misc'
import getEditComponents from 'components/utils/editWrapper'

import Toolbar from 'components/floatingToolbar'
import ElementCreator from 'factory/divider'

function Divider(props) {
    const {
        addToLocalComponentStore,
        updateComponentBulkPropertiesInLocalStore,
    } = useBoardContext()
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
        console.log(
            'on blur divider line',
            selectorInstance.pointCircle1.opacity
        )
        // elementOnBlurHandler(e, selectorInstance, two)
        selectorInstance.pointCircle1.opacity = 0
        selectorInstance.pointCircle2.opacity = 0
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
        group.elementData = { ...props.itemData, ...props }

        if (props.parentGroup) {
            /** This element will be rendered and scoped in its parent group */
            const parentGroup = props.parentGroup
            parentGroup.add(group)
            two.update()
        } else {
            /** This element will render by creating it's own group wrapper */
            groupObject = group
            resizeLineInstance = resizeLine

            selectorInstance = {
                pointCircle1,
                pointCircle2,
            }

            two.update()

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

            // setting database's id in html attribute of element
            document
                .getElementById(group.id)
                .setAttribute('data-component-id', props.id)

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

            const getGroupElementFromDOM = document.getElementById(
                `${group.id}`
            )
            getGroupElementFromDOM.addEventListener('focus', onFocusHandler)
            getGroupElementFromDOM.addEventListener('blur', onBlurHandler)

            // const { mousemove, mouseup } = handleDrag(two, group, 'line')

            interact(`#${group.id}`).on('click', () => {
                console.log('on click ')
                resizeLine.opacity = 1
                pointCircle1.opacity = 1
                pointCircle1.opacity = 1
                pointCircle2.opacity = 1
                pointCircle2.opacity = 1
                pointCircle1.translation.x = line.vertices[0].x - 4
                pointCircle1.translation.y =
                    line.vertices[0].y + parseInt(line.linewidth)
                pointCircle2.translation.x = line.vertices[1].x + 4
                pointCircle2.translation.y =
                    line.vertices[1].y + parseInt(line.linewidth)

                two.update()
                toggleToolbar(true)
            })

            // Captures double click event for text
            // and generates temporary textarea support for it

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
                        group.center()
                        two.update()
                        // pointCircle1.translation.x =
                        //     event.pageX + group.translation.x
                        // pointCircle1.translation.y = event.pageY
                        // two.update()
                    },
                    end(event) {
                        // Had to use mutation as seperate here in this component due to
                        // no control of pointcircle available in canvas component

                        let updateObj = {
                            x: group.translation.x,
                            y: group.translation.y,
                            x1: parseInt(line.vertices[0].x),
                            y1: parseInt(line.vertices[0].y),
                        }
                        updateComponentBulkPropertiesInLocalStore(
                            props.id,
                            updateObj
                        )
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
                        group.center()
                        two.update()
                        // pointCircle1.translation.x =
                        //     event.pageX + group.translation.x
                        // pointCircle1.translation.y = event.pageY
                        // two.update()
                    },
                    end(event) {
                        // Had to use mutation as seperate here in this component due to
                        // no control of pointcircle available in canvas component

                        let updateObj = {
                            x: group.translation.x,
                            y: group.translation.y,
                            x2: parseInt(line.vertices[1].x),
                            y2: parseInt(line.vertices[1].y),
                        }
                        updateComponentBulkPropertiesInLocalStore(
                            props.id,
                            updateObj
                        )
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
            //             console.log(
            //                 'event x',
            //                 event.target.getBoundingClientRect(),
            //                 event.rect.left,
            //                 event.pageX,
            //                 event.clientX
            //             )
            //             // alternate -> take event.rect.left for x
            //             localStorage.setItem(
            //                 'line_coordX',
            //                 parseInt(event.pageX)
            //             )
            //             localStorage.setItem(
            //                 'line_coordY',
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
            console.log('UNMOUNTING in Divider', group)
            // clean garbage by removing instance
            // two.remove(group)
        }
    }, [])

    const updateX2Y2Vertices = (line, x2, y2, pointCircle2) => {
        pointCircle2.translation.x = line.vertices[1].x + 4
        pointCircle2.translation.y =
            line.vertices[1].y + parseInt(line.linewidth)

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
                x2,
                y2,
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
                x2,
                y2,
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
        pointCircle1.translation.y =
            line.vertices[0].y + parseInt(line.linewidth)

        // copiode from definition of makeArrow
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
                line.vertices[1].x,
                line.vertices[1].y,
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
                line.vertices[1].x,
                line.vertices[1].y,
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

Divider.propTypes = {
    x: PropTypes.string,
    y: PropTypes.string,
}

// Divider.defaultProps = {
//     x: 100,
//     y: 50,
// }

export default Divider
