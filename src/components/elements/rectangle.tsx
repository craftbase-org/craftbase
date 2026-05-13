import React, { useEffect, useRef } from 'react'
import type { ReactElement } from 'react'
import { useBoardContext } from '../../views/Board/board'

import ElementFactory from '../../factory/rectangle'
import { strokeTypeToDashes } from '../../utils/misc'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElementProps = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

function Rectangle(props: ElementProps): ReactElement {
    const { isPencilMode, isArrowDrawMode, isArrowSelected } = useBoardContext()

    const groupRef = useRef<ShapeLike>(null)
    const shapeRef = useRef<ShapeLike>(null)

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
                // "rectangle-with-text"
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

            const groupEl = document.getElementById(group.id)
            if (groupEl) {
                groupEl.setAttribute('class', 'dragger-picker')
                groupEl.setAttribute('data-component-id', props.id)
                groupEl.setAttribute(
                    'data-linewidth',
                    String(props.linewidth ?? '')
                )
            }
        }

        return (): void => {
            two.remove(group)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
    }, [props.x, props.y, props.width, props.height, props.fill, two])

    useEffect(() => {
        if (shapeRef.current) {
            shapeRef.current.dashes = strokeTypeToDashes(props.strokeType)
            two.update()
        }
    }, [props.strokeType, two])

    // When pencil/arrow mode is active, disable pointer events on this shape.
    useEffect(() => {
        const group = groupRef.current
        const el = group ? document.getElementById(group.id) : null
        if (el) {
            el.style.pointerEvents =
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
