import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

const STORAGE_KEY = 'craftbase:elementDefaults'

export type TextSizeLabel = 'S' | 'M' | 'L' | 'XL'

export interface ElementDefaultsState {
    // Shape defaults — also used by pencil and arrow (single unified set).
    defaultFill: string
    defaultStrokeColor: string
    defaultLinewidth: number
    defaultStrokeType: string | null
    defaultOpacity: number
    // Text defaults
    defaultTextColor: string
    defaultTextSize: TextSizeLabel
    defaultTextFontFamily: string
}

const INITIAL_DEFAULTS: ElementDefaultsState = {
    defaultFill: '#FFFFFF',
    defaultStrokeColor: '#3A342C',
    defaultLinewidth: 2,
    defaultStrokeType: null,
    defaultOpacity: 1,
    defaultTextColor: '#1A1612',
    defaultTextSize: 'M',
    defaultTextFontFamily: 'Caveat',
}

function loadFromStorage(): ElementDefaultsState {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return INITIAL_DEFAULTS
        const parsed = JSON.parse(raw) as Partial<ElementDefaultsState>
        return { ...INITIAL_DEFAULTS, ...parsed }
    } catch {
        return INITIAL_DEFAULTS
    }
}

export interface ElementDefaultsApi extends ElementDefaultsState {
    // raw setters (used by undo/history to restore prior defaults silently)
    setDefaultFill: Dispatch<SetStateAction<string>>
    setDefaultStrokeColor: Dispatch<SetStateAction<string>>
    setDefaultLinewidth: Dispatch<SetStateAction<number>>
    setDefaultStrokeType: Dispatch<SetStateAction<string | null>>
    setDefaultOpacity: Dispatch<SetStateAction<number>>
    setDefaultTextColor: Dispatch<SetStateAction<string>>
    setDefaultTextSize: Dispatch<SetStateAction<TextSizeLabel>>
    setDefaultTextFontFamily: Dispatch<SetStateAction<string>>
    // board-facing setters (currently identical to raw; kept for API symmetry)
    setDefaultFillInBoard: (val: string) => void
    setDefaultStrokeColorInBoard: (val: string) => void
    setDefaultLinewidthInBoard: (val: number) => void
    setDefaultStrokeTypeInBoard: (val: string | null) => void
    setDefaultOpacityInBoard: (val: number) => void
    setDefaultTextColorInBoard: (val: string) => void
    setDefaultTextSizeInBoard: (val: TextSizeLabel) => void
    setDefaultTextFontFamilyInBoard: (val: string) => void
}

export function useElementDefaults(): ElementDefaultsApi {
    const initial = loadFromStorage()

    const [defaultFill, setDefaultFill] = useState(initial.defaultFill)
    const [defaultStrokeColor, setDefaultStrokeColor] = useState(
        initial.defaultStrokeColor
    )
    const [defaultLinewidth, setDefaultLinewidth] = useState(
        initial.defaultLinewidth
    )
    const [defaultStrokeType, setDefaultStrokeType] = useState<string | null>(
        initial.defaultStrokeType
    )
    const [defaultOpacity, setDefaultOpacity] = useState(initial.defaultOpacity)

    const [defaultTextColor, setDefaultTextColor] = useState(
        initial.defaultTextColor
    )
    const [defaultTextSize, setDefaultTextSize] = useState<TextSizeLabel>(
        initial.defaultTextSize
    )
    const [defaultTextFontFamily, setDefaultTextFontFamily] = useState(
        initial.defaultTextFontFamily
    )

    const isFirstRender = useRef(true)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    defaultFill,
                    defaultStrokeColor,
                    defaultLinewidth,
                    defaultStrokeType,
                    defaultOpacity,
                    defaultTextColor,
                    defaultTextSize,
                    defaultTextFontFamily,
                })
            )
        } catch {
            /* noop */
        }
    }, [
        defaultFill,
        defaultStrokeColor,
        defaultLinewidth,
        defaultStrokeType,
        defaultOpacity,
        defaultTextColor,
        defaultTextSize,
        defaultTextFontFamily,
    ])

    // Pure setters — these never deselect or close anything.
    const setDefaultLinewidthInBoard = (val: number): void =>
        setDefaultLinewidth(val)
    const setDefaultStrokeTypeInBoard = (val: string | null): void =>
        setDefaultStrokeType(val)
    const setDefaultFillInBoard = (val: string): void => setDefaultFill(val)
    const setDefaultStrokeColorInBoard = (val: string): void =>
        setDefaultStrokeColor(val)
    const setDefaultOpacityInBoard = (val: number): void =>
        setDefaultOpacity(val)
    const setDefaultTextColorInBoard = (val: string): void =>
        setDefaultTextColor(val)
    const setDefaultTextSizeInBoard = (val: TextSizeLabel): void =>
        setDefaultTextSize(val)
    const setDefaultTextFontFamilyInBoard = (val: string): void =>
        setDefaultTextFontFamily(val)

    return {
        defaultFill,
        defaultStrokeColor,
        defaultLinewidth,
        defaultStrokeType,
        defaultOpacity,
        defaultTextColor,
        defaultTextSize,
        defaultTextFontFamily,
        setDefaultFill,
        setDefaultStrokeColor,
        setDefaultLinewidth,
        setDefaultStrokeType,
        setDefaultOpacity,
        setDefaultTextColor,
        setDefaultTextSize,
        setDefaultTextFontFamily,
        setDefaultFillInBoard,
        setDefaultStrokeColorInBoard,
        setDefaultLinewidthInBoard,
        setDefaultStrokeTypeInBoard,
        setDefaultOpacityInBoard,
        setDefaultTextColorInBoard,
        setDefaultTextSizeInBoard,
        setDefaultTextFontFamilyInBoard,
    }
}
