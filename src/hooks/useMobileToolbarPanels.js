import { useState, useEffect } from 'react'

export function useMobileToolbarPanels({ isMobile, selectedComponent } = {}) {
    const [showMobileToolbarPanel, setShowMobileToolbarPanel] = useState(false)

    // Reset mobile toolbar panel whenever the selected component changes,
    // so the panel doesn't stay stuck open across selection swaps.
    useEffect(() => {
        setShowMobileToolbarPanel(false)
    }, [selectedComponent])

    // Close the panel as soon as the user touches the canvas on mobile —
    // gives them an unobstructed view of what they're drawing/selecting.
    useEffect(() => {
        if (!isMobile || !showMobileToolbarPanel) return
        const canvasEl = document.getElementById('main-two-root')
        if (!canvasEl) return
        const handleCanvasTouch = () => setShowMobileToolbarPanel(false)
        canvasEl.addEventListener('touchstart', handleCanvasTouch, {
            passive: true,
        })
        return () =>
            canvasEl.removeEventListener('touchstart', handleCanvasTouch)
    }, [isMobile, showMobileToolbarPanel])

    return {
        showMobileToolbarPanel,
        setShowMobileToolbarPanel,
    }
}
