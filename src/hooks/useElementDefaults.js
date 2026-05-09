import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'craftbase:elementDefaults'

const INITIAL_DEFAULTS = {
    // Shape defaults — also used by pencil and arrow (single unified set).
    defaultFill: '#FFFFFF',
    defaultStrokeColor: '#3A342C',
    defaultLinewidth: 2,
    defaultStrokeType: null,
    defaultOpacity: 1,
    // Text defaults
    defaultTextColor: '#1A1612',
    defaultTextSize: 'M',
    defaultTextFontFamily: 'Caveat',
}

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return INITIAL_DEFAULTS
        const parsed = JSON.parse(raw)
        return { ...INITIAL_DEFAULTS, ...parsed }
    } catch (_) {
        return INITIAL_DEFAULTS
    }
}

export function useElementDefaults() {
    const initial = loadFromStorage()

    const [defaultFill, setDefaultFill] = useState(initial.defaultFill)
    const [defaultStrokeColor, setDefaultStrokeColor] = useState(
        initial.defaultStrokeColor
    )
    const [defaultLinewidth, setDefaultLinewidth] = useState(
        initial.defaultLinewidth
    )
    const [defaultStrokeType, setDefaultStrokeType] = useState(
        initial.defaultStrokeType
    )
    const [defaultOpacity, setDefaultOpacity] = useState(initial.defaultOpacity)

    const [defaultTextColor, setDefaultTextColor] = useState(
        initial.defaultTextColor
    )
    const [defaultTextSize, setDefaultTextSize] = useState(
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
        } catch (_) {}
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
    const setDefaultLinewidthInBoard = (val) => setDefaultLinewidth(val)
    const setDefaultStrokeTypeInBoard = (val) => setDefaultStrokeType(val)
    const setDefaultFillInBoard = (val) => setDefaultFill(val)
    const setDefaultStrokeColorInBoard = (val) => setDefaultStrokeColor(val)
    const setDefaultOpacityInBoard = (val) => setDefaultOpacity(val)
    const setDefaultTextColorInBoard = (val) => setDefaultTextColor(val)
    const setDefaultTextSizeInBoard = (val) => setDefaultTextSize(val)
    const setDefaultTextFontFamilyInBoard = (val) =>
        setDefaultTextFontFamily(val)

    return {
        // values
        defaultFill,
        defaultStrokeColor,
        defaultLinewidth,
        defaultStrokeType,
        defaultOpacity,
        defaultTextColor,
        defaultTextSize,
        defaultTextFontFamily,
        // raw setters (used by undo/history to restore prior defaults silently)
        setDefaultFill,
        setDefaultStrokeColor,
        setDefaultLinewidth,
        setDefaultStrokeType,
        setDefaultOpacity,
        setDefaultTextColor,
        setDefaultTextSize,
        setDefaultTextFontFamily,
        // board-facing setters (currently identical to raw, kept for API symmetry)
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
