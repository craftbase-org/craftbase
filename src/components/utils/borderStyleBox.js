import React, { Fragment, useState } from 'react'
import PropTypes from 'prop-types'
import styled, { css } from 'styled-components'
import { allColorShades, essentialShades } from '../../utils/constants'

import { motion } from 'framer-motion'
import ColorPicker from './colorPicker'

const BorderStyleBoxContainer = styled.div`
    width: 200px;
    margin: 0 auto;
    height: auto;
    background: transparent;
    text-align: left;
`

const STROKE_TYPES = [
    { value: 'solid', display: '—' },
    { value: 'dashed', display: '- -' },
    { value: 'dotted', display: '...' },
]

const BorderStyleBox = ({
    currentType,
    currentWidth,
    currentColor,
    onChangeColor,
    onChangeBorderWidth,
    onChangeStrokeType,
}) => {
    const renderBorderType = () => {
        return STROKE_TYPES.map((type, index) => {
            const isSelected = currentType === type.value
            return (
                <Fragment key={index}>
                    <button
                        data-parent="floating-toolbar"
                        onClick={() =>
                            onChangeStrokeType && onChangeStrokeType(type.value)
                        }
                        className={`flex-1 h-8 flex items-center justify-center rounded cursor-pointer transition-all ease-in-out duration-200 ${
                            isSelected ? 'bg-accent/20' : 'hover:bg-accent/20'
                        }`}
                        style={{
                            border: isSelected
                                ? '2px solid #C4901A'
                                : '1px solid #C4B89A',
                        }}
                    >
                        <span
                            className="text-base font-bold tracking-widest"
                            style={{
                                color: isSelected ? '#C4901A' : '#8C7E6A',
                                paddingBottom:
                                    type.value === 'dotted' ? '0.4rem' : '0px',
                            }}
                        >
                            {type.display}
                        </span>
                    </button>
                </Fragment>
            )
        })
    }

    const renderBorderWidths = () => {
        const widths = [
            { value: 0, strokeHeight: '0px' },
            { value: 2, strokeHeight: '2px' },
            { value: 4, strokeHeight: '4px' },
            { value: 6, strokeHeight: '6px' },
        ]
        return widths.map(({ value, strokeHeight }) => {
            const isSelected = currentWidth === value
            return (
                <button
                    key={value}
                    data-parent="floating-toolbar"
                    onClick={() => onChangeBorderWidth(value)}
                    className={`flex-1 w-1/4 h-8 flex items-center justify-center rounded cursor-pointer transition-all ease-in-out duration-200 ${
                        isSelected ? 'bg-accent/20' : 'hover:bg-accent/20'
                    }`}
                    style={{
                        border: isSelected
                            ? '2px solid #C4901A'
                            : '1px solid #C4B89A',
                    }}
                >
                    {value === 0 ? (
                        <>
                            <div
                                className="my-2 w-0.5 h-0.5 rotate-45"
                                style={{
                                    // height: strokeHeight, // e.g. 1.5px, 2.5px, 4px
                                    background:
                                        currentWidth === value
                                            ? '#C4901A'
                                            : '#8C7E6A',
                                }}
                            ></div>
                        </>
                    ) : (
                        <>
                            <div
                                className="w-full my-2 mx-1 rounded-full"
                                style={{
                                    height: strokeHeight, // e.g. 1.5px, 2.5px, 4px
                                    backgroundColor:
                                        currentWidth === value
                                            ? '#C4901A'
                                            : '#8C7E6A',
                                }}
                            ></div>
                        </>
                    )}
                </button>
            )
        })
    }

    return (
        <Fragment>
            <BorderStyleBoxContainer className={`text-left p-0 text-xs`}>
                <label htmlFor="border-widths-row" className="text-ink-muted">
                    Stroke Width
                </label>
                <div
                    id="border-widths-row"
                    data-parent="floating-toolbar"
                    className="flex gap-4 my-2 w-48"
                >
                    {renderBorderWidths()}
                </div>

                <label htmlFor="border-type-row" className="text-ink-muted">
                    Stroke Type
                </label>
                <div
                    id="border-type-row"
                    data-parent="floating-toolbar"
                    className="flex gap-2 my-2 w-48"
                >
                    {renderBorderType()}
                </div>
                <div className="pt-2">
                    <ColorPicker
                        title="Stroke Fill"
                        currentColor={currentColor}
                        onChangeComplete={(color) => {
                            onChangeColor(color)
                        }}
                    />
                </div>
                <hr className="my-2" />
            </BorderStyleBoxContainer>
        </Fragment>
    )
}

// BorderStyleBox.defaultProps = {
//     currentType: 'solid',
//     currentWidth: '',
// }

export default BorderStyleBox
