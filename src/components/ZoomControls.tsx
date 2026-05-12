import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { useBoardContext } from '../views/Board/board'
import zoomInIcon from '../assets/zoom-in.svg'
import zoomOutIcon from '../assets/zoom-out.svg'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZuiWrapperLike = { zui: any } | null

const ZoomControls = (): ReactElement => {
    const { zuiInBoard, twoJSInstance, scaleToDisplay } = useBoardContext()
    const zui = zuiInBoard as ZuiWrapperLike
    const [scale, setScale] = useState(1)

    useEffect(() => {
        if (zui) {
            setScale(zui.zui.scale)
        }
    }, [zui])

    useEffect(() => {
        const handler = (e: Event): void => {
            const detail = (e as CustomEvent<{ scale: number }>).detail
            if (detail) setScale(detail.scale)
        }
        window.addEventListener('zoomChanged', handler)
        return (): void => window.removeEventListener('zoomChanged', handler)
    }, [])

    const zoom = (delta: number): void => {
        if (!zui || !twoJSInstance) return
        zui.zui.zoomBy(delta, window.innerWidth / 2, window.innerHeight / 2)
        twoJSInstance.update()
        window.dispatchEvent(
            new CustomEvent('zoomChanged', {
                detail: { scale: zui.zui.scale },
            })
        )
    }

    return (
        <div
            style={{ position: 'fixed', bottom: 20, left: 10, zIndex: 10 }}
            className="flex items-center gap-1 bg-card-bg rounded-lg shadow-card px-2 py-1"
        >
            <button
                onClick={(): void => zoom(-0.2)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent transition-colors duration-150"
                title="Zoom out"
            >
                <img src={zoomOutIcon} className="w-5 h-5" alt="Zoom out" />
            </button>
            <span className="text-xs font-medium w-10 text-center select-none">
                {scaleToDisplay
                    ? scaleToDisplay(scale)
                    : `${Math.round(scale * 100)}%`}
            </span>
            <button
                onClick={(): void => zoom(0.2)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent transition-colors duration-150"
                title="Zoom in"
            >
                <img src={zoomInIcon} className="w-5 h-5" alt="Zoom in" />
            </button>
        </div>
    )
}

export default ZoomControls
