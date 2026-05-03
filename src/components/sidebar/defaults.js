import React from 'react'

import { useBoardContext } from 'views/Board/board'
import { useMediaQueryUtils } from 'constants/exportHooks'

const STROKE_TYPES = [
    { label: '—', value: 'solid' },
    { label: '- -', value: 'dashed' },
    { label: '...', value: 'dotted' },
]

const STROKE_WIDTHS = [
    { label: '0', value: 0, strokeHeight: '0px' },
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
    const { isMobile } = useMediaQueryUtils()

    if (isMobile) return null

    return (
        <div
            className="secondary-sidebar-content fixed bg-card-bg block text-left pb-4 rounded-card shadow-card border border-border-panel w-36"
            style={{ left: '10px', top: '56px' }}
        >
            <div className="w-full px-2 font-semibold text-xs pt-1 pb-1 border-b border-border-panel text-ink-muted">
                {' '}
                Defaults{' '}
            </div>
            <div id="stroke-width-section" className="pt-2 px-2">
                <div className="w-full text-ink-muted font-normal text-xs pl-0 mb-2">
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
                                        ? 'bg-accent/20'
                                        : 'hover:bg-accent/20'
                                }`}
                                style={{
                                    border:
                                        defaultLinewidth === value
                                            ? '2px solid #C4901A'
                                            : '2px solid #C4B89A',
                                }}
                            >
                                {value === 0 ? (
                                    <>
                                        <div
                                            className="my-2 w-0.5 h-0.5 rotate-45"
                                            style={{
                                                // height: strokeHeight, // e.g. 1.5px, 2.5px, 4px
                                                background:
                                                    defaultLinewidth === value
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
                                                    defaultLinewidth === value
                                                        ? '#C4901A'
                                                        : '#8C7E6A',
                                            }}
                                        ></div>
                                    </>
                                )}
                            </button>
                        )
                    )}
                </div>
            </div>

            <div id="stroke-type-section" className="pt-3 px-2">
                <div className="w-full text-ink-muted font-normal text-xs pl-0 mb-2">
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
