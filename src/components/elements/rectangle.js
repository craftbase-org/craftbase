import React, { useEffect, useRef } from 'react'
import { useBoardContext } from 'views/Board/board'

import ElementFactory from 'factory/rectangle'
import { strokeTypeToDashes } from 'utils/misc'

function Rectangle(props) {
    const { isPencilMode, isArrowDrawMode, isArrowSelected } = useBoardContext()

    const groupRef = useRef(null)
    const shapeRef = useRef(null)

    const two = props.twoJSInstance

    useEffect(() => {
        const prevX = props.x
        const prevY = props.y

        const elementFactory = new ElementFactory(two, prevX, prevY, {
            ...props,
        })
        const { group, rectangle } = elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }
        rectangle.opacity = props.metadata?.opacity ?? 1

        if (props.parentGroup) {
            const parentGroup = props.parentGroup
            parentGroup.add(rectangle)
            two.update()
        } else {
            groupRef.current = group
            shapeRef.current = rectangle
            group.children.unshift(rectangle)

            const meta = props.metadata || {}
            if (meta.hasText && meta.textContent) {
                const twoText = two.makeText(meta.textContent, 0, 0)
                twoText.fill = meta.textFill || '#000'
                twoText.size = meta.textFontSize || 24
                twoText.alignment = 'center'
                twoText.baseline = meta.textBaseLine || 'middle'
                twoText.family = meta.textFamily || 'Caveat'
                group.add(twoText)
            }

            two.update()

            document
                .getElementById(group.id)
                .setAttribute('class', 'dragger-picker')
            document
                .getElementById(group.id)
                .setAttribute('data-component-id', props.id)
        }

        return () => {
            two.remove(group)
        }
    }, [])

    // Syncs visual properties to the Two.js shape when props change.
    // Props are updated by ElementRenderWrapper (newCanvas.js) whenever componentStore changes,
    // which happens on GraphQL subscription updates from other users editing this component.
    useEffect(() => {
        const groupInstance = groupRef.current
        const shapeInstance = shapeRef.current
        if (!groupInstance || !shapeInstance) return

        groupInstance.translation.x = props.x
        groupInstance.translation.y = props.y
        shapeInstance.width = props.width || shapeInstance.width
        shapeInstance.height = props.height || shapeInstance.height
        shapeInstance.fill = props.fill || shapeInstance.fill
        two.update()
    }, [props.x, props.y, props.width, props.height, props.fill])

    useEffect(() => {
        if (shapeRef.current) {
            shapeRef.current.dashes = strokeTypeToDashes(props.strokeType)
            two.update()
        }
    }, [props.strokeType])

    // When pencil mode is active, disable pointer events on this component
    // so pencil drawing captures events instead of shape selection.
    useEffect(() => {
        const group = groupRef.current
        if (group && document.getElementById(group.id)) {
            document.getElementById(group.id).style.pointerEvents =
                isPencilMode || isArrowDrawMode || isArrowSelected
                    ? 'none'
                    : 'auto'
        }
    }, [isPencilMode, isArrowDrawMode, isArrowSelected])

    return (
        <React.Fragment>
            <div id="two-rectangle"></div>
        </React.Fragment>
    )
}

export default Rectangle
