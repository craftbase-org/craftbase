import React, { Fragment } from 'react'
import ColorPicker from './utils/colorPicker'
import { useMediaQueryUtils } from '../constants/exportHooks'
import { essentialShades } from '../utils/constants'

const STROKE_TYPES = [
    { value: 'solid', display: '—' },
    { value: 'dashed', display: '- -' },
    { value: 'dotted', display: '...' },
]

const STROKE_WIDTHS = [
    { value: 1, strokeHeight: '1px' },
    { value: 2, strokeHeight: '2px' },
    { value: 4, strokeHeight: '4px' },
    { value: 6, strokeHeight: '6px' },
]

const PencilToolbar = ({
    pencilStrokeColor,
    defaultLinewidth,
    defaultStrokeType,
    onColorChange,
    onLinewidthChange,
    onStrokeTypeChange,
}) => {
    const { isMobile } = useMediaQueryUtils()
    const currentType = defaultStrokeType ?? 'solid'

    if (isMobile) {
        return (
            <div
                style={{
                    position: 'fixed',
                    bottom: '60px',
                    right: '10px',
                    zIndex: 10,
                    background: '#EDE8DC',
                    border: '1px solid #D4C9B4',
                    width: '192px',
                }}
                className="shadow-card px-3 py-2.5 rounded-xl flex flex-col gap-2"
            >
                {/* Color dots */}
                <div className="flex flex-row flex-wrap gap-1.5">
                    {essentialShades.map((color) => {
                        const isSelected = pencilStrokeColor === color
                        return (
                            <button
                                key={color}
                                title={color}
                                onClick={() => onColorChange(color)}
                                style={{
                                    background: color,
                                    border:
                                        color === '#FFFFFF'
                                            ? '1px solid #d1d5db'
                                            : '1px solid transparent',
                                    outline: isSelected
                                        ? '2px solid #C4901A'
                                        : 'none',
                                    outlineOffset: '1px',
                                }}
                                className="w-6 h-6 rounded-full flex-shrink-0 cursor-pointer transition-all duration-150"
                            />
                        )
                    })}
                </div>

                <hr className="border-border-panel" />

                {/* Stroke type */}
                <div className="flex flex-row gap-1.5">
                    {STROKE_TYPES.map((type) => {
                        const isSelected = currentType === type.value
                        return (
                            <button
                                key={type.value}
                                onClick={() => onStrokeTypeChange(type.value)}
                                className={`flex-1 h-7 flex items-center justify-center rounded cursor-pointer transition-all ease-in-out duration-200
                                    ${isSelected ? 'bg-accent/20' : 'hover:bg-accent/20'}`}
                                style={{
                                    border: isSelected
                                        ? '2px solid #C4901A'
                                        : '1px solid #C4B89A',
                                }}
                            >
                                <span
                                    className="text-sm font-bold tracking-widest"
                                    style={{
                                        color: isSelected
                                            ? '#C4901A'
                                            : '#8C7E6A',
                                        paddingBottom:
                                            type.value === 'dotted'
                                                ? '0.35rem'
                                                : '0px',
                                    }}
                                >
                                    {type.display}
                                </span>
                            </button>
                        )
                    })}
                </div>

                <hr className="border-border-panel" />

                {/* Stroke width */}
                <div className="flex flex-row gap-1.5">
                    {STROKE_WIDTHS.map(({ value, strokeHeight }) => {
                        const isSelected = defaultLinewidth === value
                        return (
                            <button
                                key={value}
                                onClick={() => onLinewidthChange(value)}
                                className={`flex-1 h-7 flex items-center justify-center rounded cursor-pointer transition-all ease-in-out duration-200
                                    ${isSelected ? 'bg-accent/20' : 'hover:bg-accent/20'}`}
                                style={{
                                    border: isSelected
                                        ? '2px solid #C4901A'
                                        : '1px solid #C4B89A',
                                }}
                            >
                                <div
                                    className="rounded-full"
                                    style={{
                                        width: '16px',
                                        height: strokeHeight,
                                        backgroundColor: isSelected
                                            ? '#C4901A'
                                            : '#8C7E6A',
                                    }}
                                />
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    // Desktop — unchanged from original
    return (
        <div
            style={{
                position: 'fixed',
                right: 16,
                top: 65,
                zIndex: 1,
                background: '#EDE8DC',
                border: '1px solid #D4C9B4',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
            }}
            className="shadow-card px-2 py-2 rounded-md"
        >
            <div className="py-2">
                <ColorPicker
                    title="Stroke Color"
                    currentColor={pencilStrokeColor}
                    onChangeComplete={onColorChange}
                />
            </div>
            {/* <hr className="my-2 w-full" /> */}
            <div className="w-full text-left text-xs py-2">
                <label
                    htmlFor="pencil-border-widths-row"
                    className="text-ink-muted"
                >
                    Stroke Width
                </label>
                <div
                    id="pencil-border-widths-row"
                    data-parent="floating-toolbar"
                    className="flex gap-4 my-2 w-48"
                >
                    {STROKE_WIDTHS.map(({ value, strokeHeight }) => {
                        const isSelected = defaultLinewidth === value
                        return (
                            <button
                                key={value}
                                data-parent="floating-toolbar"
                                onClick={() => onLinewidthChange(value)}
                                className={`flex-1 w-1/4 h-8 flex items-center justify-center rounded cursor-pointer transition-all ease-in-out duration-200 ${
                                    isSelected
                                        ? 'bg-accent/20'
                                        : 'hover:bg-accent/20'
                                }`}
                                style={{
                                    border: isSelected
                                        ? '2px solid #C4901A'
                                        : '1px solid #C4B89A',
                                }}
                            >
                                <div
                                    className="w-full my-2 mx-2 rounded-full"
                                    style={{
                                        height: strokeHeight,
                                        backgroundColor: isSelected
                                            ? '#C4901A'
                                            : '#8C7E6A',
                                    }}
                                />
                            </button>
                        )
                    })}
                </div>
            </div>
            {/* <hr className="my-2 w-full" /> */}
            <div className="w-full text-left text-xs py-2">
                <label
                    htmlFor="pencil-stroke-type-row"
                    className="text-ink-muted"
                >
                    Stroke Type
                </label>
                <div
                    id="pencil-stroke-type-row"
                    data-parent="floating-toolbar"
                    className="flex gap-2 my-2 w-48"
                >
                    {STROKE_TYPES.map((type) => {
                        const isSelected = currentType === type.value
                        return (
                            <button
                                key={type.value}
                                data-parent="floating-toolbar"
                                onClick={() => onStrokeTypeChange(type.value)}
                                className={`flex-1 h-8 flex items-center justify-center rounded cursor-pointer transition-all ease-in-out duration-200 ${
                                    isSelected
                                        ? 'bg-accent/20'
                                        : 'hover:bg-accent/20'
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
                                        color: isSelected
                                            ? '#C4901A'
                                            : '#8C7E6A',
                                        paddingBottom:
                                            type.value === 'dotted'
                                                ? '0.4rem'
                                                : '0px',
                                    }}
                                >
                                    {type.display}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default PencilToolbar
