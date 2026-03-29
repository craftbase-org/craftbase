import React, { Fragment, useState } from 'react'
import PropTypes from 'prop-types'
import styled, { css } from 'styled-components'
import { allColorShades, essentialShades } from 'utils/constants'

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
                            isSelected ? 'bg-blues-b50' : 'hover:bg-blues-b50'
                        }`}
                        style={{
                            border: isSelected
                                ? '2px solid #0052cc'
                                : '1px solid #e5e7eb',
                        }}
                    >
                        <span
                            className="text-base font-bold tracking-widest"
                            style={{
                                color: isSelected ? '#0052cc' : '#6b7280',
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
            { value: 1, strokeHeight: '1px' },
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
                        isSelected ? 'bg-blues-b50' : 'hover:bg-blues-b50'
                    }`}
                    style={{
                        border: isSelected
                            ? '2px solid #0052cc'
                            : '1px solid #e5e7eb',
                    }}
                >
                    <div
                        className="w-full my-2 mx-2 rounded-full"
                        style={{
                            height: strokeHeight,
                            backgroundColor: isSelected ? '#0052cc' : '#6b7280',
                        }}
                    />
                </button>
            )
        })
    }

    return (
        <Fragment>
            <BorderStyleBoxContainer className={`text-left p-0 text-xs`}>
                <label htmlFor="border-widths-row">Stroke Width</label>
                <div
                    id="border-widths-row"
                    data-parent="floating-toolbar"
                    className="flex gap-4 my-2 w-48"
                >
                    {renderBorderWidths()}
                </div>
                <hr className="my-2" />
                <label htmlFor="border-type-row">Stroke Type</label>
                <div
                    id="border-type-row"
                    data-parent="floating-toolbar"
                    className="flex gap-2 my-2 w-48"
                >
                    {renderBorderType()}
                </div>
                <hr className="my-2" />
                <ColorPicker
                    title="Stroke Fill"
                    currentColor={currentColor}
                    onChangeComplete={(color) => {
                        onChangeColor(color)
                    }}
                />
            </BorderStyleBoxContainer>
        </Fragment>
    )
}

// BorderStyleBox.defaultProps = {
//     currentType: 'solid',
//     currentWidth: '',
// }

export default BorderStyleBox
