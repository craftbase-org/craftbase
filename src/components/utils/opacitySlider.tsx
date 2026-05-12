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
}

const OpacitySlider = ({
    title,
    handleOnChange,
    handleOnDrag,
    currentOpacity,
}: OpacitySliderProps): ReactElement => {
    const [values, setValues] = useState<number[]>([1])
    const rangerRef = useRef<HTMLDivElement | null>(null)

    const rangerInstance = useRanger({
        getRangerElement: () => rangerRef.current,
        values,
        min: 0,
        max: 1,
        stepSize: 0.1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onDrag: (instance: any) => {
            setValues(instance.sortedValues)
            handleOnDrag(instance.sortedValues)
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onChange: (instance: any) => handleOnChange(instance.sortedValues),
    })

    useEffect(() => {
        const arr = currentOpacity ? [currentOpacity] : [0]
        setValues(arr)
    }, [currentOpacity])

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
                            background: `linear-gradient(to right, #C4901A ${rangerInstance.getPercentageForValue(firstValue)}%, #ddd ${rangerInstance.getPercentageForValue(firstValue)}%)`,
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
                                            opacity:
                                                value > 0.9 || value < 0.1
                                                    ? 0
                                                    : 1,
                                        }}
                                    >
                                        {Math.round(value * 100)}
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
