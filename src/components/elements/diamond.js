import React, { useEffect, useRef } from 'react'
import { useBoardContext } from '../../views/Board/board'

import ElementFactory from '../../factory/diamond'
import { strokeTypeToDashes } from '../../utils/misc'

function Diamond(props) {
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
        const { group, diamond } = elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }
        diamond.opacity = props.metadata?.opacity ?? 1

        if (props.parentGroup) {
            const parentGroup = props.parentGroup
            parentGroup.add(diamond)
            two.update()
        } else {
            groupRef.current = group
            shapeRef.current = diamond
            group.children.unshift(diamond)

            const meta = props.metadata || {}
            if (meta.hasText && meta.textContent) {
                // "diamond-with-text"
                const twoText = two.makeText(meta.textContent, 0, 0)
                twoText.fill = meta.textFill || '#3A342C'
                twoText.size = meta.textFontSize || 24
                twoText.alignment = 'center'
                twoText.baseline = meta.textBaseLine || 'middle'
                twoText.family =
                    meta.textFontFamily || meta.textFamily || 'Caveat'
                group.add(twoText)
            }

            two.update()

            document
                .getElementById(group.id)
                .setAttribute('class', 'dragger-picker')
            document
                .getElementById(group.id)
                .setAttribute('data-component-id', props.id)
            document
                .getElementById(group.id)
                .setAttribute('data-linewidth', String(props.linewidth ?? ''))
        }

        return () => {
            two.remove(group)
        }
    }, [])

    useEffect(() => {
        const groupInstance = groupRef.current
        const shapeInstance = shapeRef.current
        if (!groupInstance || !shapeInstance) return

        groupInstance.translation.x = props.x
        groupInstance.translation.y = props.y
        if (props.width) shapeInstance.width = props.width
        if (props.height) shapeInstance.height = props.height
        shapeInstance.fill = props.fill || shapeInstance.fill
        two.update()
    }, [props.x, props.y, props.width, props.height, props.fill])

    useEffect(() => {
        if (shapeRef.current) {
            shapeRef.current.dashes = strokeTypeToDashes(props.strokeType)
            two.update()
        }
    }, [props.strokeType])

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
            <div id="two-diamond"></div>
        </React.Fragment>
    )
}

export default Diamond
