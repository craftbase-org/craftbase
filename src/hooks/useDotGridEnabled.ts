import { useState, useEffect } from 'react'
import {
    getDotGridEnabled,
    setDotGridEnabled,
    subscribeDotGridEnabled,
} from '../utils/featureFlags'

// React binding for the live dot-grid background feature flag. Returns the
// current value and a setter; re-renders when the flag changes from anywhere
// (the Settings modal, etc.).
export function useDotGridEnabled(): [boolean, (enabled: boolean) => void] {
    const [enabled, setEnabled] = useState<boolean>(getDotGridEnabled)

    useEffect(() => subscribeDotGridEnabled(setEnabled), [])

    return [enabled, setDotGridEnabled]
}
