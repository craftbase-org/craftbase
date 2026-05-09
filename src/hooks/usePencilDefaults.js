import { useState } from 'react'
import { PENCIL_DEFAULT_COLOR } from '../constants/misc'

export function usePencilDefaults({ toggleToolbar, setSelectedComponent } = {}) {
    const [defaultLinewidth, setDefaultLinewidth] = useState(2)
    const [defaultStrokeType, setDefaultStrokeType] = useState(null)
    const [pencilDefaultLinewidth, setPencilDefaultLinewidth] = useState(2)
    const [pencilDefaultStrokeType, setPencilDefaultStrokeType] = useState(null)
    const [pencilStrokeColor, setPencilStrokeColor] = useState(PENCIL_DEFAULT_COLOR)

    const setDefaultLinewidthInBoard = (val) => {
        setDefaultLinewidth(val)
        setPencilDefaultLinewidth(val)
        toggleToolbar?.(false)
        setSelectedComponent?.(null)
    }

    const setDefaultStrokeTypeInBoard = (val) => {
        setDefaultStrokeType(val)
        setPencilDefaultStrokeType(val)
        toggleToolbar?.(false)
        setSelectedComponent?.(null)
    }

    const setPencilStrokeColorInBoard = (val) => setPencilStrokeColor(val)

    return {
        defaultLinewidth,
        setDefaultLinewidth,
        defaultStrokeType,
        setDefaultStrokeType,
        pencilDefaultLinewidth,
        setPencilDefaultLinewidth,
        pencilDefaultStrokeType,
        setPencilDefaultStrokeType,
        pencilStrokeColor,
        setPencilStrokeColor,
        setDefaultLinewidthInBoard,
        setDefaultStrokeTypeInBoard,
        setPencilStrokeColorInBoard,
    }
}
