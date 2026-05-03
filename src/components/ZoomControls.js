import React, { useState, useEffect } from 'react'
import { useBoardContext } from 'views/Board/board'
import zoomInIcon from 'assets/zoom-in.svg'
import zoomOutIcon from 'assets/zoom-out.svg'

const ZoomControls = () => {
    const { zuiInBoard, twoJSInstance } = useBoardContext()
    const [scale, setScale] = useState(1)

    useEffect(() => {
        if (zuiInBoard) {
            setScale(zuiInBoard.zui.scale)
        }
    }, [zuiInBoard])

    useEffect(() => {
        const handler = (e) => setScale(e.detail.scale)
        window.addEventListener('zoomChanged', handler)
        return () => window.removeEventListener('zoomChanged', handler)
    }, [])

    const zoom = (delta) => {
        if (!zuiInBoard || !twoJSInstance) return
        zuiInBoard.zui.zoomBy(
            delta,
            window.innerWidth / 2,
            window.innerHeight / 2
        )
        twoJSInstance.update()
        window.dispatchEvent(
            new CustomEvent('zoomChanged', {
                detail: { scale: zuiInBoard.zui.scale },
            })
        )
    }

    return (
        <div
            style={{ position: 'fixed', bottom: 20, left: 10, zIndex: 10 }}
            className="flex items-center gap-1 bg-card-bg rounded-lg shadow-md px-2 py-1"
        >
            <button
                onClick={() => zoom(-0.2)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent transition-colors duration-150"
                title="Zoom out"
            >
                <img src={zoomOutIcon} className="w-5 h-5" alt="Zoom out" />
            </button>
            <span className="text-xs font-medium w-10 text-center select-none">
                {Math.round(scale * 100)}%
            </span>
            <button
                onClick={() => zoom(0.2)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent transition-colors duration-150"
                title="Zoom in"
            >
                <img src={zoomInIcon} className="w-5 h-5" alt="Zoom in" />
            </button>
        </div>
    )
}

export default ZoomControls
