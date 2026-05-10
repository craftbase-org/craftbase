import { useState, useEffect } from 'react'
import {
    RUBBER_MODE_KEY,
    ARROW_DRAW_MODE_KEY,
    TEXT_DRAW_MODE_KEY,
    PENDING_SHAPE_TYPE_KEY,
    PENDING_SHAPE_PROPS_KEY,
    LAST_ADDED_ELEMENT_ID_KEY,
    PENCIL_MODE_KEY,
    PAN_MODE_KEY,
} from '../constants/misc'

export function useDrawingModes() {
    const [pointerToggle, setPointerToggle] = useState(false)
    const [isPencilMode, setPencilMode] = useState(false)
    const [isArrowDrawMode, setIsArrowDrawMode] = useState(false)
    const [isTextDrawMode, setIsTextDrawMode] = useState(false)
    const [isRubberMode, setIsRubberMode] = useState(() => {
        try {
            return localStorage.getItem(RUBBER_MODE_KEY) === 'true'
        } catch (_) {
            return false
        }
    })
    const [isPanMode, setPanMode] = useState(() => {
        try {
            return localStorage.getItem(PAN_MODE_KEY) === 'true'
        } catch (_) {
            return false
        }
    })

    const togglePointer = (
        pointerVal,
        { cancelPendingElement, setSelectedComponent, toggleToolbar } = {}
    ) => {
        setPointerToggle(pointerVal)
        setPencilMode(false)
        if (pointerVal) {
            cancelPendingElement?.()
            setSelectedComponent?.(null)
            toggleToolbar?.(false)
            setIsRubberMode(false)
            setPanMode(false)
            try {
                localStorage.removeItem(RUBBER_MODE_KEY)
                localStorage.removeItem(PAN_MODE_KEY)
            } catch (_) {}
            document.getElementById('main-two-root').style.cursor = 'default'
        }
    }

    const togglePencilMode = (value, { cancelPendingElement, toggleToolbar } = {}) => {
        toggleToolbar?.(false)
        setPencilMode(value)
        if (value) {
            cancelPendingElement?.()
            setIsRubberMode(false)
            setPanMode(false)
            try {
                localStorage.removeItem(RUBBER_MODE_KEY)
                localStorage.removeItem(PAN_MODE_KEY)
            } catch (_) {}
            localStorage.setItem(PENCIL_MODE_KEY, 'TRUE')
            document.getElementById('main-two-root').style.cursor = 'crosshair'
        } else {
            localStorage.removeItem(PENCIL_MODE_KEY)
        }
    }

    const togglePanMode = (
        value,
        { cancelPendingElement, setSelectedComponent, toggleToolbar } = {}
    ) => {
        setPanMode(value)
        const root = document.getElementById('main-two-root')
        if (value) {
            cancelPendingElement?.()
            setSelectedComponent?.(null)
            toggleToolbar?.(false)
            setPencilMode(false)
            setIsRubberMode(false)
            try {
                localStorage.setItem(PAN_MODE_KEY, 'true')
                localStorage.removeItem(PENCIL_MODE_KEY)
                localStorage.removeItem(RUBBER_MODE_KEY)
                localStorage.removeItem(ARROW_DRAW_MODE_KEY)
                localStorage.removeItem(TEXT_DRAW_MODE_KEY)
                localStorage.removeItem(PENDING_SHAPE_TYPE_KEY)
                localStorage.removeItem(PENDING_SHAPE_PROPS_KEY)
            } catch (_) {}
            if (root) root.style.cursor = 'grab'
            // Clear any active selection so single-finger drag pans cleanly.
            try {
                window.dispatchEvent(new CustomEvent('clearSelector', {}))
            } catch (_) {}
        } else {
            try {
                localStorage.removeItem(PAN_MODE_KEY)
            } catch (_) {}
            if (root) root.style.cursor = 'default'
        }
    }

    const setRubberModeInBoard = (val) => {
        setIsRubberMode(!!val)
        if (val) {
            setPanMode(false)
            try {
                localStorage.removeItem(PAN_MODE_KEY)
            } catch (_) {}
            localStorage.setItem(RUBBER_MODE_KEY, 'true')
            document.getElementById('main-two-root').style.cursor = 'crosshair'
        } else {
            localStorage.removeItem(RUBBER_MODE_KEY)
            document.getElementById('main-two-root').style.cursor = 'default'
        }
    }

    const setArrowDrawModeInBoard = (val) => setIsArrowDrawMode(val)
    const setTextDrawModeInBoard = (val) => setIsTextDrawMode(val)

    // Reflect any active draw mode as a class on #main-two-root so CSS can
    // force the crosshair cursor on inner SVG nodes (.dragger-picker, text)
    // that would otherwise win with their own cursor: pointer rule.
    useEffect(() => {
        const root = document.getElementById('main-two-root')
        if (!root) return
        const active = isPencilMode || isArrowDrawMode || isRubberMode
        root.classList.toggle('draw-mode-active', active)
    }, [isPencilMode, isArrowDrawMode, isRubberMode])

    const clearDrawModesFromStorage = () => {
        localStorage.removeItem(PENDING_SHAPE_TYPE_KEY)
        localStorage.removeItem(PENDING_SHAPE_PROPS_KEY)
        localStorage.removeItem(ARROW_DRAW_MODE_KEY)
        localStorage.removeItem(TEXT_DRAW_MODE_KEY)
        localStorage.removeItem(LAST_ADDED_ELEMENT_ID_KEY)
        localStorage.removeItem(RUBBER_MODE_KEY)
        localStorage.removeItem(PAN_MODE_KEY)
        setIsRubberMode(false)
        setPanMode(false)
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
        isRubberMode,
        isPanMode,
        setPanMode,
        togglePointer,
        togglePencilMode,
        togglePanMode,
        setRubberModeInBoard,
        setArrowDrawModeInBoard,
        setTextDrawModeInBoard,
        clearDrawModesFromStorage,
    }
}
