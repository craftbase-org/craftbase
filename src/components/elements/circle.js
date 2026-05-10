import React, { useEffect, useRef } from 'react'
import { useBoardContext } from '../../views/Board/board'

import CircleFactory from '../../factory/circle'
import { strokeTypeToDashes } from '../../utils/misc'

function Circle(props) {
    const { isPencilMode, isArrowDrawMode, isArrowSelected } = useBoardContext()

    const groupRef = useRef(null)
    const shapeRef = useRef(null)

    const two = props.twoJSInstance

    useEffect(() => {
        const prevX = props.x
        const prevY = props.y

        const elementFactory = new CircleFactory(two, prevX, prevY, {
            ...props,
        })
        const { group, circle } = elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }
        circle.opacity = props.metadata?.opacity ?? 1

        if (props.parentGroup) {
            const parentGroup = props.parentGroup
            circle.translation.x = props.properties.x
            circle.translation.y = props.properties.y
            parentGroup.add(circle)
            two.update()
        } else {
            groupRef.current = group
            shapeRef.current = circle
            group.children.unshift(circle)
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
        shapeInstance.width = props.width || shapeInstance.width
        shapeInstance.height = props.height || shapeInstance.height
        shapeInstance.fill = props.fill || shapeInstance.fill
        two.update()
    }, [props.x, props.y, props.fill, props.width, props.height])

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

    return <React.Fragment />
}

export default Circle
