import React, { useEffect, useState, useRef } from 'react'

import PropTypes from 'prop-types'
import interact from 'interactjs'
import { useImmer } from 'use-immer'
import Two from 'two.js'

import Toolbar from 'components/floatingToolbar'
import ElementCreator from 'factory/arrowLine'

import { updateX1Y1Vertices, updateX2Y2Vertices } from 'utils/updateVertices'

function ArrowLine(props) {
    const [showToolbar, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer({})
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
            selectorInstance.pointCircle1Group.opacity = 0
            selectorInstance.pointCircle2Group.opacity = 0
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
        line.opacity = props.metadata?.opacity ?? 1
        if (props.fill) line.fill = props.fill
        if (props.stroke) line.stroke = props.stroke
        if (props.linewidth) line.linewidth = props.linewidth

        if (props.parentGroup) {
            /** This element will be rendered and scoped in its parent group */
            const parentGroup = props.parentGroup
            parentGroup.add(group)
            two.update()
        } else {
            /** This element will render by creating it's own group wrapper */
            groupObject = group
            stateRefForGroup.current = group
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

            interact(`#${group.id}`).on('click', (e) => {
                console.log('on click group', e)
                // pointCircle1.opacity = 0
                // resizeLine.opacity = 1
                pointCircle1Group.opacity = 1
                pointCircle2Group.opacity = 1
                two.update()
                // toggleToolbar(true)
            })
        }

        return () => {
            console.log('UNMOUNTING in Divider', group)
            // clean garbage by removing instance
            // two.remove(group)
        }
    }, [])

    useEffect(() => {
        if (internalState?.group?.data) {
            let groupInstance = internalState.group.data
            let lineInstance = internalState.line.data
            let pointCircle1Group = internalState.pointCircle1Group.data
            let pointCircle2Group = internalState.pointCircle2Group.data
            groupInstance.translation.x = props.x
            groupInstance.translation.y = props.y
            lineInstance.opacity = props.metadata?.opacity ?? 1
            two.update()
            // updateX1Y1Vertices(lineInstance, props.x1, props.y1, pointCircle1Group)
            // updateX2Y2Vertices(lineInstance, props.x2, props.y2, pointCircle2Group)
        }
    }, [props.x, props.y, props.metadata])

    useEffect(() => {
        if (internalState?.line?.data) {
            let lineInstance = internalState.line.data
            if (props.fill) lineInstance.fill = props.fill
            if (props.stroke) lineInstance.stroke = props.stroke
            if (props.linewidth) lineInstance.linewidth = props.linewidth
            two.update()
        }
    }, [props.fill, props.stroke, props.linewidth])

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
            {/* {showToolbar ? (
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
            ) : null} */}
        </React.Fragment>
    )
}

ArrowLine.propTypes = {
    x: PropTypes.number,
    y: PropTypes.number,
}

// ArrowLine.defaultProps = {
//     x: 100,
//     y: 50,
// }

export default ArrowLine
