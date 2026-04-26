import { useState, useEffect } from 'react'

export function useMobileToolbarPanels({ isPencilMode, isMobile, selectedComponent } = {}) {
    const [showToolbar, toggleToolbar] = useState(false)
    const [showMobileToolbarPanel, setShowMobileToolbarPanel] = useState(false)
    const [showMobilePencilPanel, setShowMobilePencilPanel] = useState(false)

    // Reset mobile toolbar panel whenever the selected component changes
    useEffect(() => {
        setShowMobileToolbarPanel(false)
    }, [selectedComponent])

    // Reset mobile pencil panel when pencil mode is turned off
    useEffect(() => {
        if (!isPencilMode) setShowMobilePencilPanel(false)
    }, [isPencilMode])

    // Close pencil panel as soon as the user touches the canvas on mobile
    useEffect(() => {
        if (!isPencilMode || !isMobile) return
        const canvasEl = document.getElementById('main-two-root')
        if (!canvasEl) return
        const handleCanvasTouch = () => setShowMobilePencilPanel(false)
        canvasEl.addEventListener('touchstart', handleCanvasTouch, { passive: true })
        return () => canvasEl.removeEventListener('touchstart', handleCanvasTouch)
    }, [isPencilMode, isMobile])

    return {
        showToolbar,
        toggleToolbar,
        showMobileToolbarPanel,
        setShowMobileToolbarPanel,
        showMobilePencilPanel,
        setShowMobilePencilPanel,
    }
}
