import React, { Fragment } from 'react'
import ColorPicker from 'components/utils/colorPicker'

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
    const currentType = defaultStrokeType ?? 'solid'

    return (
        <div
            style={{
                position: 'fixed',
                right: 16,
                top: 65,
                zIndex: 1,
                background: 'rgba(255, 255, 255, 1)',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
            }}
            className="shadow-lg px-2 py-2 rounded-md"
        >
            <ColorPicker
                title="Stroke Color"
                currentColor={pencilStrokeColor}
                onChangeComplete={onColorChange}
            />
            <hr className="my-2 w-full" />
            <div className="w-full text-left text-xs">
                <label htmlFor="pencil-stroke-type-row">Stroke Type</label>
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
                                        ? 'bg-blues-b50'
                                        : 'hover:bg-blues-b50'
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
                                    }}
                                >
                                    {type.display}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>
            <hr className="my-2 w-full" />
            <div className="w-full text-left text-xs">
                <label htmlFor="pencil-border-widths-row">Stroke Width</label>
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
                                        ? 'bg-blues-b50'
                                        : 'hover:bg-blues-b50'
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
                                        backgroundColor: isSelected
                                            ? '#0052cc'
                                            : '#6b7280',
                                    }}
                                />
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default PencilToolbar
