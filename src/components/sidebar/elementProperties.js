import React, { Fragment, useEffect, useMemo, useState } from 'react'

import { useBoardContext } from '../../views/Board/board'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import ColorPicker from '../utils/colorPicker'
import OpacitySlider from '../utils/opacitySlider'
import { TEXT_SIZES_ARRAY } from '../../utils/constants'

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

// What sections each "set" should render, in display order.
const SETS = {
    SHAPE: ['fill', 'stroke', 'strokeWidth', 'strokeType', 'opacity'],
    ARROW: ['stroke', 'strokeWidth', 'strokeType', 'opacity'],
    PENCIL: ['stroke', 'strokeWidth', 'strokeType'],
    TEXT: ['textColor', 'textSize', 'textFont', 'opacity'],
    RECT_WITH_TEXT: [
        'fill',
        'stroke',
        'strokeWidth',
        'strokeType',
        'opacity',
        'textColor',
        'textSize',
        'textFont',
    ],
}

const SET_LABELS = {
    SHAPE: 'Shape',
    ARROW: 'Arrow',
    PENCIL: 'Pencil',
    TEXT: 'Text',
    RECT_WITH_TEXT: 'Shape',
}

function resolveSetKey({
    isRubberMode,
    isPencilMode,
    selectedComponent,
    isArrowDrawMode,
    isTextDrawMode,
}) {
    if (isRubberMode) return null
    if (isPencilMode) return 'PENCIL'
    if (selectedComponent) {
        const shapeType = selectedComponent?.shape?.type
        const hasText = typeof selectedComponent?.text?.data?.value === 'string'
        if (shapeType === 'rectangle' && hasText) return 'RECT_WITH_TEXT'
        if (
            shapeType === 'rectangle' ||
            shapeType === 'circle' ||
            shapeType === 'ellipse' ||
            shapeType === 'diamond' ||
            shapeType === 'path' ||
            shapeType === 'rounded-rectangle'
        )
            return 'SHAPE'
        if (shapeType === 'arrowLine') return 'ARROW'
        if (shapeType === 'newText') return 'TEXT'
        // Diamond is a custom Path; the elementData carries the type.
        const elementType =
            selectedComponent?.group?.data?.elementData?.componentType
        if (
            elementType === 'diamond' ||
            elementType === 'rectangle' ||
            elementType === 'circle'
        )
            return 'SHAPE'
        if (elementType === 'arrowLine') return 'ARROW'
        if (elementType === 'newText') return 'TEXT'
        if (elementType === 'pencil') return 'PENCIL'
        return 'SHAPE'
    }
    if (isArrowDrawMode) return 'ARROW'
    if (isTextDrawMode) return 'TEXT'
    return 'SHAPE'
}

function readEffectiveValues({
    setKey,
    selectedComponent,
    isMobile,
    defaults,
}) {
    if (!selectedComponent) {
        // Pure default mode — pencil/arrow/shape all share the same defaults.
        return {
            fill: defaults.defaultFill,
            stroke: defaults.defaultStrokeColor,
            linewidth: defaults.defaultLinewidth,
            strokeType: defaults.defaultStrokeType ?? 'solid',
            opacity: defaults.defaultOpacity ?? 1,
            textColor: defaults.defaultTextColor,
            textSize: defaults.defaultTextSize,
            textFontFamily: defaults.defaultTextFontFamily,
        }
    }

    const shapeData = selectedComponent?.shape?.data
    const elementData = selectedComponent?.group?.data?.elementData
    const textData = selectedComponent?.text?.data

    // For rectangle-with-text + plain text, the text properties live in
    // different places. Resolve here so the rest is symmetric.
    const isText = selectedComponent?.shape?.type === 'newText'
    const textNode = isText ? shapeData : textData

    const textSizeNumeric = textNode?.size
    const textSizeLabel =
        TEXT_SIZES_ARRAY.find((s) =>
            isMobile
                ? s.mobileValue === textSizeNumeric
                : s.value === textSizeNumeric
        )?.label || defaults.defaultTextSize

    return {
        fill: shapeData?.fill ?? defaults.defaultFill,
        stroke: shapeData?.stroke ?? defaults.defaultStrokeColor,
        linewidth: shapeData?.linewidth ?? defaults.defaultLinewidth,
        strokeType: elementData?.strokeType ?? 'solid',
        opacity: elementData?.metadata?.opacity ?? 1,
        textColor: isText
            ? (shapeData?.fill ?? defaults.defaultTextColor)
            : (textData?.fill ?? defaults.defaultTextColor),
        textSize: textSizeLabel,
        textFontFamily: textNode?.family ?? defaults.defaultTextFontFamily,
    }
}

const SectionLabel = ({ children }) => (
    <div className="w-full text-ink-muted font-normal text-xs pl-0 mb-2">
        {children}
    </div>
)

const StrokeWidthRow = ({ value, onChange }) => (
    <div id="stroke-width-section" className="pt-2 px-2">
        <SectionLabel>Stroke Width</SectionLabel>
        <div className="flex gap-2">
            {STROKE_WIDTHS.map(({ value: w, strokeHeight }) => {
                const isSelected = value === w
                return (
                    <button
                        key={w}
                        onClick={() => onChange(w)}
                        className={`flex-1 w-4 h-6 flex items-center justify-center rounded cursor-pointer transition-all ease-in-out duration-200 ${
                            isSelected ? 'bg-accent/20' : 'hover:bg-accent/20'
                        }`}
                        style={{
                            border: isSelected
                                ? '2px solid #C4901A'
                                : '2px solid #C4B89A',
                        }}
                    >
                        {w === 0 ? (
                            <div
                                className="my-2 w-0.5 h-0.5 rotate-45"
                                style={{
                                    background: isSelected
                                        ? '#C4901A'
                                        : '#8C7E6A',
                                }}
                            />
                        ) : (
                            <div
                                className="w-full my-2 mx-1 rounded-full"
                                style={{
                                    height: strokeHeight,
                                    backgroundColor: isSelected
                                        ? '#C4901A'
                                        : '#8C7E6A',
                                }}
                            />
                        )}
                    </button>
                )
            })}
        </div>
    </div>
)

const StrokeTypeRow = ({ value, onChange }) => (
    <div id="stroke-type-section" className="pt-3 px-2">
        <SectionLabel>Stroke Type</SectionLabel>
        <div className="flex gap-2">
            {STROKE_TYPES.map(({ label, value: v }) => {
                const isSelected = (value ?? 'solid') === v
                return (
                    <button
                        key={v}
                        onClick={() => onChange(v)}
                        className={`flex-1 w-4 h-6 flex items-center justify-center rounded cursor-pointer transition-all ease-in-out duration-200 ${
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
                                    v === 'dotted' ? '0.4rem' : '0px',
                            }}
                        >
                            {label}
                        </span>
                    </button>
                )
            })}
        </div>
    </div>
)

const TextSizeRow = ({ value, onChange }) => (
    <div className="pt-3 px-2">
        <SectionLabel>Text Size</SectionLabel>
        <div className="flex flex-row gap-2">
            {TEXT_SIZES_ARRAY.map(({ label }) => {
                const isSelected = value === label
                return (
                    <button
                        key={label}
                        onClick={() => onChange(label)}
                        className={`w-9 h-8 text-xs font-semibold border rounded transition-colors ${
                            isSelected
                                ? 'bg-accent/20 text-accent-dark border-accent-dark border-2'
                                : 'bg-card-bg text-ink-mid border-border-card hover:bg-accent/20'
                        }`}
                    >
                        {label}
                    </button>
                )
            })}
        </div>
    </div>
)

const FontFamilyRow = ({ value, onChange }) => {
    const families = [
        { label: 'Caveat', family: 'Caveat' },
        { label: 'Geist', family: 'Geist' },
    ]
    return (
        <div className="pt-3 px-2">
            <SectionLabel>Font</SectionLabel>
            <div className="flex flex-row gap-2">
                {families.map(({ family }) => {
                    const isSelected = value === family
                    return (
                        <button
                            key={family}
                            onClick={() => onChange(family)}
                            style={{ fontFamily: family }}
                            className={`w-12 h-8 text-sm border rounded transition-colors ${
                                isSelected
                                    ? 'bg-accent/20 text-accent-dark border-accent-dark border-2'
                                    : 'bg-card-bg text-ink-mid border-border-card hover:bg-accent/20'
                            }`}
                        >
                            Aa
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

const ElementPropertiesToolbar = () => {
    const ctx = useBoardContext()
    const {
        isPencilMode,
        isArrowDrawMode,
        isTextDrawMode,
        isRubberMode,
        selectedComponent,
        applyProperty,
        showMobileToolbarPanel,
        // defaults
        defaultFill,
        defaultStrokeColor,
        defaultLinewidth,
        defaultStrokeType,
        defaultOpacity,
        defaultTextColor,
        defaultTextSize,
        defaultTextFontFamily,
    } = ctx
    const { isMobile } = useMediaQueryUtils()

    const setKey = useMemo(
        () =>
            resolveSetKey({
                isRubberMode,
                isPencilMode,
                selectedComponent,
                isArrowDrawMode,
                isTextDrawMode,
            }),
        [
            isRubberMode,
            isPencilMode,
            selectedComponent,
            isArrowDrawMode,
            isTextDrawMode,
        ]
    )

    const defaults = {
        defaultFill,
        defaultStrokeColor,
        defaultLinewidth,
        defaultStrokeType,
        defaultOpacity,
        defaultTextColor,
        defaultTextSize,
        defaultTextFontFamily,
    }

    const [values, setValues] = useState(() =>
        readEffectiveValues({
            setKey: setKey || 'SHAPE',
            selectedComponent,
            isMobile,
            defaults,
        })
    )

    const [expandedSection, setExpandedSection] = useState(null)

    const toggleSection = (key) =>
        setExpandedSection((prev) => (prev === key ? null : key))

    // Collapse any open color picker when context changes (new selection, mode switch).
    useEffect(() => {
        setExpandedSection(null)
    }, [setKey, selectedComponent])

    // Re-sync local UI state whenever the source of truth changes (selection,
    // mode, or any default). Property mutations bump a default, which flows
    // through this effect to refresh the readouts.
    useEffect(() => {
        if (!setKey) return
        setValues(
            readEffectiveValues({
                setKey,
                selectedComponent,
                isMobile,
                defaults,
            })
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        setKey,
        selectedComponent,
        isMobile,
        defaultFill,
        defaultStrokeColor,
        defaultLinewidth,
        defaultStrokeType,
        defaultOpacity,
        defaultTextColor,
        defaultTextSize,
        defaultTextFontFamily,
    ])

    if (!setKey) return null
    if (isMobile && !showMobileToolbarPanel) return null

    const sections = SETS[setKey]
    const handle = (key) => (val) => {
        setValues((prev) => ({ ...prev, [key]: val }))
        applyProperty?.(key, val)
    }

    return (
        <div
            id="floating-toolbar"
            className="secondary-sidebar-content fixed bg-card-bg block text-left pb-4 rounded-card shadow-card border border-border-panel overflow-y-auto tablet:max-h-128"
            style={
                isMobile
                    ? {
                          bottom: '60px',
                          right: '10px',
                          width: '208px',
                          zIndex: 20,
                      }
                    : { left: '10px', top: '56px', width: '13rem' }
            }
        >
            <div className="w-full px-2 font-semibold text-xs pt-1 pb-1 border-b border-border-panel text-ink-muted">
                {SET_LABELS[setKey]}
            </div>

            {sections.includes('fill') && (
                <div
                    data-section="fill"
                    className="pt-2 px-2 pb-2 border-b border-[#EDE7D7]"
                >
                    <ColorPicker
                        title="Fill"
                        currentColor={values.fill}
                        onChangeComplete={handle('fill')}
                        isExpanded={expandedSection === 'fill'}
                        onToggleExpand={() => toggleSection('fill')}
                    />
                </div>
            )}

            {sections.includes('stroke') && (
                <div
                    data-section="stroke"
                    className="pt-2 px-2 pb-2 border-b border-[#EDE7D7]"
                >
                    <ColorPicker
                        title="Stroke"
                        currentColor={values.stroke}
                        onChangeComplete={handle('stroke')}
                        isExpanded={expandedSection === 'stroke'}
                        onToggleExpand={() => toggleSection('stroke')}
                    />
                </div>
            )}

            {sections.includes('strokeWidth') && (
                <StrokeWidthRow
                    value={values.linewidth}
                    onChange={handle('linewidth')}
                />
            )}

            {sections.includes('strokeType') && (
                <StrokeTypeRow
                    value={values.strokeType}
                    onChange={handle('strokeType')}
                />
            )}

            {sections.includes('textColor') && (
                <div
                    data-section="textColor"
                    className="pt-2 px-2 pb-2 border-b border-[#EDE7D7]"
                >
                    <ColorPicker
                        title="Text"
                        currentColor={values.textColor}
                        onChangeComplete={handle('textColor')}
                        isExpanded={expandedSection === 'textColor'}
                        onToggleExpand={() => toggleSection('textColor')}
                    />
                </div>
            )}

            {sections.includes('textSize') && (
                <TextSizeRow
                    value={values.textSize}
                    onChange={handle('textSize')}
                />
            )}

            {sections.includes('textFont') && (
                <FontFamilyRow
                    value={values.textFontFamily}
                    onChange={handle('textFontFamily')}
                />
            )}

            {sections.includes('opacity') && (
                <div className="pt-3 px-2">
                    <SectionLabel>Opacity</SectionLabel>
                    <OpacitySlider
                        currentOpacity={values.opacity}
                        handleOnDrag={(arr) =>
                            setValues((prev) => ({
                                ...prev,
                                opacity: arr[0],
                            }))
                        }
                        handleOnChange={(arr) => handle('opacity')(arr[0])}
                    />
                </div>
            )}
        </div>
    )
}

export default ElementPropertiesToolbar
