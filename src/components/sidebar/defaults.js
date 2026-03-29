import React from 'react'

import { useBoardContext } from 'views/Board/board'

const STROKE_TYPES = [
    { label: '—', value: 'solid' },
    { label: '- -', value: 'dashed' },
    { label: '...', value: 'dotted' },
]

const STROKE_WIDTHS = [
    { label: '1', value: 1, strokeHeight: '1px' },
    { label: '2', value: 2, strokeHeight: '2px' },
    { label: '4', value: 4, strokeHeight: '4px' },
    { label: '6', value: 6, strokeHeight: '6px' },
]
const DefaultsDropdown = () => {
    const {
        defaultLinewidth,
        setDefaultLinewidthInBoard,
        defaultStrokeType,
        setDefaultStrokeTypeInBoard,
        currentElement,
        setCurrentElementInBoard,
    } = useBoardContext()

    return (
        <div
            className="secondary-sidebar-content fixed bg-white block text-left pb-4 rounded-md shadow-lg w-36"
            style={{ left: '10px' }}
        >
            <div className="w-full px-2 font-bold text-xs pt-1 pb-1 border-b-2">
                {' '}
                Defaults{' '}
            </div>
            <div id="stroke-width-section" className="pt-2 px-2">
                <div className="w-full text-black font-normal text-xs pl-0 mb-2">
                    Stroke Width
                </div>
                <div className="flex gap-2">
                    {STROKE_WIDTHS.map(
                        ({ label, borderClass, strokeHeight, value }) => (
                            <button
                                key={value}
                                onClick={() =>
                                    setDefaultLinewidthInBoard(value)
                                }
                                className={`flex-1 w-4 h-6 flex items-center justify-center rounded cursor-pointer transition-all ease-in-out duration-200 ${
                                    defaultLinewidth === value
                                        ? 'bg-blues-b50'
                                        : 'hover:bg-blues-b50'
                                }`}
                                style={{
                                    border:
                                        defaultLinewidth === value
                                            ? '2px solid #0052cc'
                                            : '1px solid #e5e7eb',
                                }}
                            >
                                <div
                                    className="w-full my-2 mx-1 rounded-full"
                                    style={{
                                        height: strokeHeight, // e.g. 1.5px, 2.5px, 4px
                                        backgroundColor:
                                            defaultLinewidth === value
                                                ? '#0052cc'
                                                : '#6b7280',
                                    }}
                                />
                            </button>
                        )
                    )}
                </div>
            </div>

            <div id="stroke-type-section" className="pt-3 px-2">
                <div className="w-full text-black font-normal text-xs pl-0 mb-2">
                    Stroke Type
                </div>
                <div className="flex gap-2">
                    {STROKE_TYPES.map(({ label, value }) => {
                        const isSelected =
                            (defaultStrokeType ?? 'solid') === value
                        return (
                            <button
                                key={value}
                                onClick={() =>
                                    setDefaultStrokeTypeInBoard(
                                        value === 'solid' ? null : value
                                    )
                                }
                                className={`flex-1 w-4 h-6 flex items-center justify-center rounded cursor-pointer transition-all ease-in-out duration-200 ${
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
                                        color: isSelected
                                            ? '#0052cc'
                                            : '#6b7280',
                                        paddingBottom:
                                            value === 'dotted'
                                                ? '0.4rem'
                                                : '0px',
                                    }}
                                >
                                    {label}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default DefaultsDropdown
