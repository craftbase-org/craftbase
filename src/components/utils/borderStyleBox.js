import React, { Fragment, useState } from 'react'
import PropTypes from 'prop-types'
import styled, { css } from 'styled-components'
import { allColorShades, essentialShades } from 'utils/constants'

import { motion } from 'framer-motion'
import ColorPicker from './colorPicker'

const BorderStyleBoxContainer = styled.div`
    width: 250px;
    margin: 0 auto;
    height: auto;
    background: transparent;
    text-align: left;
`

const BorderStyleBox = ({
    currentType,
    currentWidth,
    currentColor,
    onChangeColor,
    onChangeBorderWidth,
}) => {
    const renderBorderType = () => {
        const types = [
            { value: 'solid', display: '—' },
            { value: 'dashed', display: '- -' },
        ].map((type, index) => {
            return (
                <Fragment key={index}>
                    <button
                        data-parent="floating-toolbar"
                        className={`${
                            currentType === type.value
                                ? `bg-blues-b50 `
                                : `bg-transparent text-blues-b400`
                        }  
            mr-2 hover:bg-blues-b400  font-semibold hover:text-white 
            py-1 px-2 border border-blues-b400 hover:border-transparent rounded`}
                    >
                        {type.display}
                    </button>
                </Fragment>
            )
        })
        return types
    }

    const renderBorderWidths = () => {
        const widths = [0, 1, 2, 4, 6].map((width, index) => {
            return (
                <Fragment key={width}>
                    <button
                        data-parent="floating-toolbar"
                        className={`${currentWidth === width ? `` : ``} ${
                            width == 1 ? `border` : `border-${width}`
                        } w-8 h-8  border-blues-b400 
                        mr-2  bg-blues-b50 font-semibold py-2 rounded`}
                        onClick={() => {
                            onChangeBorderWidth(width)
                        }}
                    ></button>
                </Fragment>
            )
        })
        return widths
    }

    return (
        <Fragment>
            <BorderStyleBoxContainer className={`text-left p-0  text-sm`}>
                <label htmlFor="border-type-row ">Border Type</label>
                <div
                    id="border-type-row"
                    data-parent="floating-toolbar"
                    className="flex flex-row my-2"
                >
                    {renderBorderType()}
                </div>
                <hr className="my-2" />
                <label htmlFor="border-widths-row">Border Width</label>
                <div
                    id="border-widths-row"
                    data-parent="floating-toolbar"
                    className="flex flex-row my-2"
                >
                    {renderBorderWidths()}
                </div>
                <hr className="my-2" />
                <ColorPicker
                    title="Border Fill"
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
