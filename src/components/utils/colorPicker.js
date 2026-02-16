import React, { Fragment, useState } from 'react'
import PropTypes from 'prop-types'
import styled, { css } from 'styled-components'
import { allColorShades, essentialShades } from 'utils/constants'
import Icon from 'icons/icon'
import { motion, AnimatePresence } from 'framer-motion'

const ColorPickerContainer = styled.div`
    width: 250px;
    margin: 0 auto;
    height: auto;
    background: transparent;
    text-align: left;
`

const ColorSelector = styled(motion.button)`
    border-radius: 50%;
    ${(props) =>
        props.colorpaint &&
        css`
            background: ${props.colorpaint};
            border: ${props.colorpaint === `#FFFFFF`
                ? `1px solid #000`
                : `1px solid transparent`};
        `}
`

const CurrentColorIndicator = styled.div`
    border-radius: 50%;
    ${(props) =>
        props.colorpaint &&
        css`
            background: ${props.colorpaint};
        `};
`

const ColorPicker = ({ title, onChangeComplete, currentColor }) => {
    const [showAllColors, ToggleShowAllColors] = useState(false)

    const renderColorBtns = () => {
        const colorsArr = showAllColors ? allColorShades : essentialShades
        const showColors = colorsArr.map((color, index) => {
            return (
                <Fragment key={index}>
                    <AnimatePresence>
                        <div
                            className={`${
                                currentColor === color
                                    ? `inline-block bg-slate-300`
                                    : `inline-block`
                            }`}
                        >
                            <ColorSelector
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                title={
                                    color == 'rgba(0,0,0,0.0)'
                                        ? 'transparent'
                                        : color
                                }
                                data-parent="floating-toolbar"
                                className={`m-1 w-4 h-4`}
                                colorpaint={color}
                                currentColor={currentColor}
                                onClick={() => {
                                    onChangeComplete(color)
                                }}
                            />
                        </div>
                    </AnimatePresence>
                </Fragment>
            )
        })
        return showColors
    }

    return (
        <Fragment>
            {title && <div className="p-0 text-left text-sm">{title}</div>}
            <ColorPickerContainer
                id="color-picker-toolbar"
                data-parent="floating-toolbar"
                className={`p-0 `}
            >
                {/* <div className="flex justify-start items-center my-2">
                    <div className="border-2 border-4 border-8 border-radius-50 border-gray-500">
                        {' '}
                        <CurrentColorIndicator
                            title={
                                currentColor == 'rgba(0,0,0,0.0)'
                                    ? 'transparent'
                                    : currentColor
                            }
                            data-parent="floating-toolbar"
                            className={`m-1 w-4 h-4 `}
                            colorpaint={currentColor}
                            // onClick={() => {
                            //   onChangeComplete(color);
                            // }}
                        />
                    </div>
                    <input
                        className="shadow appearance-none border w-40 py-1 px-3 ml-2
                         text-gray-700 text-sm leading-tight focus:outline-none focus:shadow-outline"
                        // id="color-code-input"
                        type="text"
                        placeholder="Color"
                        value={
                            currentColor == 'rgba(0,0,0,0.0)'
                                ? 'transparent'
                                : currentColor
                        }
                        disabled
                    />
                </div> */}

                <div className="mt-2 mb-1">
                    <div className=" inline w-full">
                        {renderColorBtns()}{' '}
                        <button
                            className={`mb-1 inline-block transition duration-300 ${
                                showAllColors && `transform-rotate-45`
                            }`}
                            onClick={() => ToggleShowAllColors(!showAllColors)}
                        >
                            <Icon icon="ICON_ADD" width={18} height={18} />
                        </button>
                    </div>
                </div>
            </ColorPickerContainer>
        </Fragment>
    )
}

// ColorPicker.defaultProps = {
//     leftPos: 4,
//     currentColor: '#fff',
// }

ColorPicker.propTypes = {
    leftPos: PropTypes.number,
    currentColor: PropTypes.string,
    onChangeComplete: PropTypes.func,
}

export default ColorPicker
