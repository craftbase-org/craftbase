import type { ComponentType, ReactElement, SVGProps } from 'react'

import SunIcon from '../../assets/sun.svg?react'
import MoonIcon from '../../assets/moon.svg?react'
import WindowIcon from '../../assets/window.svg?react'
import { useTheme } from '../../hooks/useTheme'
import type { ThemePreference } from '../../hooks/useTheme'

type ThemeOption = {
    value: ThemePreference
    label: string
    Icon: ComponentType<SVGProps<SVGSVGElement>>
}

// Left → right: Light, Dark, System.
const THEME_OPTIONS: ThemeOption[] = [
    { value: 'light', label: 'Light', Icon: SunIcon },
    { value: 'dark', label: 'Dark', Icon: MoonIcon },
    // { value: 'system', label: 'System', Icon: WindowIcon },
]

/**
 * Segmented theme toggle: a rounded pill with three icon buttons (sun / moon /
 * window). The active option is highlighted with a filled accent circle; the
 * others are muted. Always visible — no dropdown.
 */
const ThemeSwitcher = (): ReactElement => {
    const { theme, setTheme } = useTheme()

    return (
        <div
            role="radiogroup"
            aria-label="Theme"
            className="flex items-center gap-1 px-1 py-1 rounded-md bg-card-bg border border-border-panel"
        >
            {THEME_OPTIONS.map(({ value, label, Icon }) => {
                const isActive = value === theme
                return (
                    <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        aria-label={`${label} theme`}
                        title={label}
                        onClick={(): void => setTheme(value)}
                        className={`w-9 h-9 flex items-center justify-center rounded-md transition-colors ${
                            isActive
                                ? 'bg-accent/50 text-topbar dark:bg-accent/30 dark:text-white'
                                : 'text-ink-muted hover:text-ink hover:bg-accent/50'
                        }`}
                    >
                        {/* color="currentColor" cancels the SVG's hardcoded blue
                            so it inherits the button's text color. */}
                        <Icon
                            className="w-5 h-5"
                            stroke="currentColor"
                            color="currentColor"
                            aria-hidden="true"
                        />
                    </button>
                )
            })}
        </div>
    )
}

export default ThemeSwitcher
