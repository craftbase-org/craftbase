import { useState } from 'react'
import {
    RUBBER_MODE_KEY,
    ARROW_DRAW_MODE_KEY,
    TEXT_DRAW_MODE_KEY,
    PENDING_SHAPE_TYPE_KEY,
    PENDING_SHAPE_PROPS_KEY,
    LAST_ADDED_ELEMENT_ID_KEY,
    PENCIL_MODE_KEY,
} from 'constants/misc'

export function useDrawingModes() {
    const [pointerToggle, setPointerToggle] = useState(false)
    const [isPencilMode, setPencilMode] = useState(false)
    const [isArrowDrawMode, setIsArrowDrawMode] = useState(false)
    const [isTextDrawMode, setIsTextDrawMode] = useState(false)

    const togglePointer = (pointerVal, { cancelPendingElement, setSelectedComponent, toggleToolbar } = {}) => {
        setPointerToggle(pointerVal)
        setPencilMode(false)
        if (pointerVal) {
            cancelPendingElement?.()
            setSelectedComponent?.(null)
            toggleToolbar?.(false)
            document.getElementById('main-two-root').style.cursor = 'default'
        }
    }

    const togglePencilMode = (value, { cancelPendingElement, toggleToolbar } = {}) => {
        toggleToolbar?.(false)
        setPencilMode(value)
        if (value) {
            cancelPendingElement?.()
            localStorage.setItem(PENCIL_MODE_KEY, 'TRUE')
            document.getElementById('main-two-root').style.cursor = 'crosshair'
        } else {
            localStorage.removeItem(PENCIL_MODE_KEY)
        }
    }

    const setRubberModeInBoard = (val) => {
        if (val) {
            localStorage.setItem(RUBBER_MODE_KEY, 'true')
            document.getElementById('main-two-root').style.cursor = 'crosshair'
        } else {
            localStorage.removeItem(RUBBER_MODE_KEY)
            document.getElementById('main-two-root').style.cursor = 'default'
        }
    }

    const setArrowDrawModeInBoard = (val) => setIsArrowDrawMode(val)
    const setTextDrawModeInBoard = (val) => setIsTextDrawMode(val)

    const clearDrawModesFromStorage = () => {
        localStorage.removeItem(PENDING_SHAPE_TYPE_KEY)
        localStorage.removeItem(PENDING_SHAPE_PROPS_KEY)
        localStorage.removeItem(ARROW_DRAW_MODE_KEY)
        localStorage.removeItem(TEXT_DRAW_MODE_KEY)
        localStorage.removeItem(LAST_ADDED_ELEMENT_ID_KEY)
        localStorage.removeItem(RUBBER_MODE_KEY)
    }

    return {
        pointerToggle,
        setPointerToggle,
        isPencilMode,
        setPencilMode,
        isArrowDrawMode,
        setIsArrowDrawMode,
        isTextDrawMode,
        setIsTextDrawMode,
        togglePointer,
        togglePencilMode,
        setRubberModeInBoard,
        setArrowDrawModeInBoard,
        setTextDrawModeInBoard,
        clearDrawModesFromStorage,
    }
}
