import React, { useEffect, useRef } from 'react'
import type { ReactElement } from 'react'
import { useBoardContext } from '../../views/Board/board'

import RouteFactory from '../../factory/route'

// See circle.tsx for the rationale on the loose prop bag.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElementProps = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

function Route(props: ElementProps): ReactElement {
    const { isPencilMode, isArrowDrawMode, isArrowSelected } = useBoardContext()

    const groupRef = useRef<ShapeLike>(null)
    const shapeRef = useRef<ShapeLike>(null)

    const two = props.twoJSInstance

    useEffect(() => {
        const prevX = props.x
        const prevY = props.y

        const elementFactory = new RouteFactory(two, prevX, prevY, {
            ...props,
        })
        const { group, path } = elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }

        if (props.parentGroup) {
            const parentGroup = props.parentGroup
            path.translation.x = props.properties.x
            path.translation.y = props.properties.y
            parentGroup.add(path)
            two.update()
        } else {
            groupRef.current = group
            shapeRef.current = path
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
        const group = groupRef.current
        const el = group ? document.getElementById(group.id) : null
        if (el) {
            el.style.pointerEvents =
                isPencilMode || isArrowDrawMode || isArrowSelected
                    ? 'none'
                    : 'auto'
        }
    }, [isPencilMode, isArrowDrawMode, isArrowSelected])

    return <React.Fragment />
}

export default Route
