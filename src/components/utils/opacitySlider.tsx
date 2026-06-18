import { Fragment, useEffect, useState, useRef } from 'react'
import type { ReactElement } from 'react'
import styled from 'styled-components'
import { useRanger } from '@tanstack/react-ranger'

const SliderContainer = styled.div`
    width: 200px;
    height: 44px;
    border-radius: 6px;
`

export interface OpacitySliderProps {
    title?: string
    handleOnChange: (values: number[]) => void
    handleOnDrag: (values: number[]) => void
    currentOpacity?: number
    // True when a group selection's members have differing opacities. The
    // slider shows a "Mixed" indicator (instead of a misleading single value)
    // until the user drags — at which point dragging sets a uniform value
    // across the whole group, same as any other group property edit.
    isMixed?: boolean
}

const OpacitySlider = ({
    title,
    handleOnChange,
    handleOnDrag,
    currentOpacity,
    isMixed = false,
}: OpacitySliderProps): ReactElement => {
    const [values, setValues] = useState<number[]>([1])
    // Cleared whenever the inputs change; set on first drag so the "Mixed"
    // hint disappears as soon as the user starts choosing a value.
    const [interacted, setInteracted] = useState(false)
    const rangerRef = useRef<HTMLDivElement | null>(null)

    const rangerInstance = useRanger({
        getRangerElement: () => rangerRef.current,
        values,
        min: 0,
        max: 1,
        stepSize: 0.1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onDrag: (instance: any) => {
            setInteracted(true)
            setValues(instance.sortedValues)
            handleOnDrag(instance.sortedValues)
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onChange: (instance: any) => {
            setInteracted(true)
            handleOnChange(instance.sortedValues)
        },
    })

    useEffect(() => {
        setInteracted(false)
        // Mixed: rest the handle at the midpoint (neutral) since there's no
        // single current value to show.
        const arr = isMixed ? [0.5] : currentOpacity ? [currentOpacity] : [0]
        setValues(arr)
    }, [currentOpacity, isMixed])

    const showMixed = isMixed && !interacted
    const firstValue = values[0] ?? 0

    return (
        <Fragment>
            <SliderContainer
                data-parent="floating-toolbar"
                className={` pr-4 py-1 `}
            >
                {title && (
                    <div className=" text-xs text-left text-gray-500">
                        {title}
                    </div>
                )}
                <div className="pl-1 pr-1" style={{ position: 'relative' }}>
                    <div
                        ref={rangerRef}
                        id="slider-main"
                        className="mt-2"
                        style={{
                            position: 'relative',
                            userSelect: 'none',
                            height: '4px',
                            background: showMixed
                                ? '#ddd'
                                : `linear-gradient(to right, #C4901A ${rangerInstance.getPercentageForValue(firstValue)}%, #ddd ${rangerInstance.getPercentageForValue(firstValue)}%)`,
                            borderRadius: '2px',
                        }}
                    >
                        {rangerInstance.handles().map(
                            (
                                {
                                    value,
                                    onKeyDownHandler,
                                    onMouseDownHandler,
                                    onTouchStart,
                                    isActive,
                                },
                                i
                            ) => (
                                <button
                                    id="slider-handle"
                                    key={i}
                                    onKeyDown={onKeyDownHandler}
                                    onMouseDown={onMouseDownHandler}
                                    onTouchStart={onTouchStart}
                                    role="slider"
                                    aria-valuemin={
                                        rangerInstance.options.min
                                    }
                                    aria-valuemax={
                                        rangerInstance.options.max
                                    }
                                    aria-valuenow={value}
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: `${rangerInstance.getPercentageForValue(value)}%`,
                                        zIndex: isActive ? 1 : 0,
                                        transform: 'translate(-50%, -50%)',
                                        width: '14px',
                                        height: '14px',
                                        outline: 'none',
                                        borderRadius: '100%',
                                        background: '#3A342C',
                                    }}
                                >
                                    <span
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            marginTop: '6px',
                                            fontSize: '9px',
                                            color: '#555',
                                            whiteSpace: 'nowrap',
                                            pointerEvents: 'none',
                                            userSelect: 'none',
                                            opacity: showMixed
                                                ? 1
                                                : value > 0.9 || value < 0.1
                                                  ? 0
                                                  : 1,
                                        }}
                                    >
                                        {showMixed
                                            ? 'Mixed'
                                            : Math.round(value * 100)}
                                    </span>
                                </button>
                            )
                        )}
                    </div>
                    <span
                        style={{
                            position: 'absolute',
                            top: '14px',
                            left: '4px',
                            fontSize: '9px',
                            color: '#aaa',
                            userSelect: 'none',
                            pointerEvents: 'none',
                        }}
                    >
                        0
                    </span>
                    <span
                        style={{
                            position: 'absolute',
                            top: '14px',
                            right: '0',
                            fontSize: '9px',
                            color: '#aaa',
                            userSelect: 'none',
                            pointerEvents: 'none',
                        }}
                    >
                        100
                    </span>
                </div>
            </SliderContainer>
        </Fragment>
    )
}

export default OpacitySlider
