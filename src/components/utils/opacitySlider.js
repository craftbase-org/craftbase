import React, { Fragment, useEffect, useState, useRef } from 'react'
import PropTypes from 'prop-types'
import styled, { css } from 'styled-components'
import { useRanger, Ranger } from '@tanstack/react-ranger'
import { motion } from 'framer-motion'

const SliderContainer = styled.div`
    width: 250px;
    height: 44px;
    border-radius: 6px;
`

const Track = styled('div')`
    display: inline-block;
    height: 4px;
    width: 90%;
    margin: 0;
`

const Tick = styled('div')`
    :before {
        content: '';
        position: absolute;
        left: 0px;
        background: #0052cc;
        height: 6px;
        width: 5px;
        border-radius: 50%;
        top: -2px;
    }
`

const TickLabel = styled('div')`
    position: absolute;
    font-size: 0.6rem;
    color: rgba(0, 0, 0, 0.5);
    top: 100%;
    transform: translate(-50%, 1.2rem);
    white-space: nowrap;
`

const Segment = styled('div')`
    background: ${(props) =>
        props.index === 0
            ? '#0052CC'
            : props.index === 1
            ? '#0052CC'
            : props.index === 2
            ? '#f5c200'
            : '#ff6050'};
    height: 50%;
`

const Handle = styled('div')`
    position: absolute;
    top: -7px;
    background: #0052cc;
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 100%;
    left: -2px;
    cursor: pointer;
`

const OpacitySlider = ({
    title,
    handleOnChange,
    handleOnDrag,
    currentOpacity,
}) => {
    // const [values, setValues] = React.useState([1])
    const [values, setValues] = useState([1])
    const rangerRef = useRef(null)

    const rangerInstance = useRanger({
        getRangerElement: () => rangerRef.current,
        values,
        min: 0,
        max: 1,
        stepSize: 0.1,
        onDrag: (instance) => {
            setValues(instance.sortedValues)
            handleOnDrag(instance.sortedValues)
        },
        onChange: (instance) => handleOnChange(instance.sortedValues),
    })

    // const { getTrackProps, ticks, segments, handles } = useRanger({
    //     values,
    //     onDrag: (e) => {
    //         console.log('on drag ranger', e)
    //         setValues(e)
    //         handleOnDrag(e)
    //     },
    //     onChange: (e) => {
    //         console.log('on change ranger', e)
    //         setValues(e)
    //         handleOnChange(e)
    //     },
    //     min: 0,
    //     max: 1,
    //     steps: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    //     ticks: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
    // })

    useEffect(() => {
        let arr = currentOpacity ? [currentOpacity] : [0]
        setValues(arr)
    }, [])

    return (
        <Fragment>
            <SliderContainer
                data-parent="floating-toolbar"
                className={` pr-4 py-1 `}
            >
                {title && <div className=" text-sm text-left">{title}</div>}
                {/* <Track
                    className=" relative"
                    data-parent="floating-toolbar"
                    {...getTrackProps()}
                >
                    {ticks.map(({ value, getTickProps }) => (
                        <Tick
                            data-parent="floating-toolbar"
                            {...getTickProps()}
                        >
                            
                        </Tick>
                    ))}
                    {segments.map(({ getSegmentProps }, i) => (
                        <Segment
                            data-parent="floating-toolbar"
                            {...getSegmentProps()}
                            index={i}
                        />
                    ))}
                    {handles.map(({ value, active, getHandleProps }) => (
                        <div
                            data-parent="floating-toolbar"
                            {...getHandleProps()}
                        >
                            <Handle
                                data-parent="floating-toolbar"
                                active={active}
                            ></Handle>
                        </div>
                    ))}
                </Track> */}
                <div
                    ref={rangerRef}
                    className="mt-2"
                    style={{
                        position: 'relative',
                        userSelect: 'none',
                        height: '4px',
                        background: '#ddd',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,.6)',
                        borderRadius: '2px',
                    }}
                >
                    {rangerInstance
                        .handles()
                        .map(
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
                                    key={i}
                                    onKeyDown={onKeyDownHandler}
                                    onMouseDown={onMouseDownHandler}
                                    onTouchStart={onTouchStart}
                                    role="slider"
                                    aria-valuemin={rangerInstance.options.min}
                                    aria-valuemax={rangerInstance.options.max}
                                    aria-valuenow={value}
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: `${rangerInstance.getPercentageForValue(
                                            value
                                        )}%`,
                                        zIndex: isActive ? '1' : '0',
                                        transform: 'translate(-50%, -50%)',
                                        width: '14px',
                                        height: '14px',
                                        outline: 'none',
                                        borderRadius: '100%',
                                        background:
                                            'linear-gradient(to bottom, #eee 45%, #ddd 55%)',
                                        border: 'solid 1px #888',
                                    }}
                                />
                            )
                        )}
                </div>
            </SliderContainer>
        </Fragment>
    )
}

// OpacitySlider.defaultProps = {
//     currentOpacity: 1,
// }

OpacitySlider.propTypes = {
    currentOpacity: PropTypes.number,
    handleOnChange: PropTypes.func,
}

export default OpacitySlider
