import { Fragment } from 'react'
import type { ReactElement } from 'react'
import styled from 'styled-components'

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
] as const

type StrokeTypeValue = (typeof STROKE_TYPES)[number]['value']

export interface BorderStyleBoxProps {
    currentType?: StrokeTypeValue | string
    currentWidth?: number
    currentColor?: string
    onChangeColor: (color: string) => void
    onChangeBorderWidth: (width: number) => void
    onChangeStrokeType?: (type: StrokeTypeValue) => void
}

const BorderStyleBox = ({
    currentType,
    currentWidth,
    currentColor,
    onChangeColor,
    onChangeBorderWidth,
    onChangeStrokeType,
}: BorderStyleBoxProps): ReactElement => {
    const renderBorderType = (): ReactElement[] => {
        return STROKE_TYPES.map((type, index) => {
            const isSelected = currentType === type.value
            return (
                <Fragment key={index}>
                    <button
                        data-parent="floating-toolbar"
                        onClick={(): void =>
                            onChangeStrokeType?.(type.value)
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

    const renderBorderWidths = (): ReactElement[] => {
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
                    onClick={(): void => onChangeBorderWidth(value)}
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
                        <div
                            className="my-2 w-0.5 h-0.5 rotate-45"
                            style={{
                                background:
                                    currentWidth === value
                                        ? '#C4901A'
                                        : '#8C7E6A',
                            }}
                        ></div>
                    ) : (
                        <div
                            className="w-full my-2 mx-1 rounded-full"
                            style={{
                                height: strokeHeight,
                                backgroundColor:
                                    currentWidth === value
                                        ? '#C4901A'
                                        : '#8C7E6A',
                            }}
                        ></div>
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
                        onChangeComplete={(color: string): void => {
                            onChangeColor(color)
                        }}
                    />
                </div>
                <hr className="my-2" />
            </BorderStyleBoxContainer>
        </Fragment>
    )
}

export default BorderStyleBox
