import React, { useState } from 'react'

import { useBoardContext } from 'views/Board/board'

const STROKE_TYPES = [
    { label: '—', value: 'solid' },
    { label: '- -', value: 'dashed' },
]

const STROKE_WIDTHS = [
    { label: '1', borderClass: 'border', value: 1 },
    { label: '2', borderClass: 'border-2', value: 2 },
    { label: '4', borderClass: 'border-4', value: 4 },
]

const ElementsDropdown = () => {
    const {
        defaultLinewidth,
        setDefaultLinewidthInBoard,
        currentElement,
        setCurrentElementInBoard,
    } = useBoardContext()
    const [selectedStrokeType, setSelectedStrokeType] = useState('solid')

    return (
        <div
            className="secondary-sidebar-content fixed bg-white block text-left pb-4 rounded-md shadow-lg w-24"
            style={{ left: '10px' }}
        >
            <div className="w-full px-2 font-bold text-xs pt-1 pb-1 border-b-2">
                {' '}
                Defaults{' '}
            </div>
            <div id="stroke-width-section" className="pt-2 px-2">
                <div className="w-full text-black font-normal text-xs pl-0 mb-2">
                    Stroke width
                </div>
                <div className="flex gap-2">
                    {STROKE_WIDTHS.map(({ label, borderClass, value }) => (
                        <button
                            key={value}
                            onClick={() => setDefaultLinewidthInBoard(value)}
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
                                className={`w-full mx-2 ${borderClass}`}
                                style={{ borderColor: '#0052cc' }}
                            />
                        </button>
                    ))}
                </div>
            </div>

            <div id="stroke-type-section" className="pt-3 px-2">
                <div className="w-full text-black font-normal text-xs pl-0 mb-2">
                    Stroke type
                </div>
                <div className="flex gap-2">
                    {STROKE_TYPES.map(({ label, value }) => (
                        <button
                            key={value}
                            onClick={() => setSelectedStrokeType(value)}
                            className={`flex-1 w-4 h-6 flex items-center justify-center rounded cursor-pointer transition-all ease-in-out duration-200 ${
                                selectedStrokeType === value
                                    ? 'bg-blues-b50'
                                    : 'hover:bg-blues-b50'
                            }`}
                            style={{
                                border:
                                    selectedStrokeType === value
                                        ? '2px solid #0052cc'
                                        : '1px solid #e5e7eb',
                            }}
                        >
                            <span
                                className="text-base font-bold tracking-widest"
                                style={{ color: '#0052cc' }}
                            >
                                {label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default ElementsDropdown
