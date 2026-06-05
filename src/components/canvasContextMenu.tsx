import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'

import Portal from './common/portal'

interface CanvasContextMenuProps {
    x: number
    y: number
    onClose: () => void
    onExportSvg: () => void
}

const MENU_WIDTH = 220
const MENU_MARGIN = 8

/**
 * Small fixed-position menu opened on canvas right-click / two-finger tap.
 * Closes on outside click or Escape. Positioned at the cursor and clamped to
 * the viewport so it never overflows off-screen.
 */
const CanvasContextMenu = ({
    x,
    y,
    onClose,
    onExportSvg,
}: CanvasContextMenuProps): ReactElement => {
    const refNode = useRef<HTMLDivElement | null>(null)
    const [height, setHeight] = useState(0)

    useEffect(() => {
        if (refNode.current) setHeight(refNode.current.offsetHeight)
    }, [])

    useEffect(() => {
        const handleClick = (e: MouseEvent): void => {
            if (refNode.current?.contains(e.target as Node)) return
            onClose()
        }
        const handleKey = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('mousedown', handleClick, false)
        document.addEventListener('keydown', handleKey, false)
        return (): void => {
            document.removeEventListener('mousedown', handleClick, false)
            document.removeEventListener('keydown', handleKey, false)
        }
    }, [onClose])

    const left = Math.min(x, window.innerWidth - MENU_WIDTH - MENU_MARGIN)
    const top = Math.min(
        y,
        window.innerHeight - (height || 60) - MENU_MARGIN
    )

    return (
        <Portal>
            <div
                ref={refNode}
                className="fixed z-[100] bg-card-bg border border-border-panel rounded-lg shadow-lg py-1"
                style={{
                    left: Math.max(MENU_MARGIN, left),
                    top: Math.max(MENU_MARGIN, top),
                    width: MENU_WIDTH,
                }}
            >
                <button
                    type="button"
                    onClick={onExportSvg}
                    className="w-full flex items-center justify-between px-3 py-2 mx-0 text-sm text-ink-mid
                        hover:bg-accent/30 rounded cursor-pointer
                        transition-colors ease-in-out duration-150"
                >
                    <div className="flex items-center gap-2.5">
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M7 1v8M7 9L4.5 6.5M7 9l2.5-2.5"
                                stroke="#8C7E6A"
                                strokeWidth="1.1"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M2 10v1.5a1 1 0 001 1h8a1 1 0 001-1V10"
                                stroke="#8C7E6A"
                                strokeWidth="1.1"
                                strokeLinecap="round"
                            />
                        </svg>
                        Export selection as SVG
                    </div>
                    <span className="text-[10px] text-ink-muted tracking-wide">
                        ⌘⇧D
                    </span>
                </button>
            </div>
        </Portal>
    )
}

export default CanvasContextMenu
