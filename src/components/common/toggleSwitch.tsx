import type { ReactElement } from 'react'

interface ToggleSwitchProps {
    checked: boolean
    onChange: (checked: boolean) => void
    id?: string
    label?: string
    disabled?: boolean
}

// A small accessible on/off switch. Uses the amber `accent` token when on and a
// neutral track when off; the knob slides between the two ends.
const ToggleSwitch = ({
    checked,
    onChange,
    id,
    label,
    disabled = false,
}: ToggleSwitchProps): ReactElement => (
    <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={(): void => onChange(!checked)}
        className={`
            relative inline-flex h-6 w-11 shrink-0 items-center rounded-full
            transition-colors ease-in-out duration-200
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
            disabled:opacity-50 disabled:cursor-default cursor-pointer
            ${checked ? 'bg-accent' : 'bg-border-panel'}
        `}
    >
        <span
            className={`
                inline-block h-5 w-5 transform rounded-full bg-white shadow
                transition-transform ease-in-out duration-200
                ${checked ? 'translate-x-[22px]' : 'translate-x-[2px]'}
            `}
        />
    </button>
)

export default ToggleSwitch
