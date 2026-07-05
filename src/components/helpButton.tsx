import { useState } from 'react'
import type { ReactElement } from 'react'
import { useMediaQueryUtils } from '../constants/exportHooks'
import ShortcutsModal from './sidebar/shortcutsModal'
import HelpIcon from '../assets/help.svg?react'

/**
 * Floating help button pinned to the bottom-right corner. Opens the keyboard
 * shortcuts modal. Hidden on mobile — there the same modal is reachable from the
 * hamburger menu drawer instead (see menuDrawer.tsx).
 */
const HelpButton = (): ReactElement | null => {
    const { isMobile } = useMediaQueryUtils()
    const [open, setOpen] = useState(false)

    if (isMobile) return null

    return (
        <>
            <button
                type="button"
                title="Keyboard shortcuts"
                aria-label="Keyboard shortcuts"
                onClick={(): void => setOpen(true)}
                className="fixed bottom-5 right-5 z-10 w-9 h-9 flex items-center justify-center
                    rounded-card bg-card-bg border border-border-panel text-ink-mid
                    shadow-sm cursor-pointer transition-colors ease-in-out duration-200
                    hover:bg-accent/30"
            >
                <HelpIcon className="w-5 h-5" stroke="currentColor" aria-hidden="true" />
            </button>

            <ShortcutsModal open={open} onClose={(): void => setOpen(false)} />
        </>
    )
}

export default HelpButton
