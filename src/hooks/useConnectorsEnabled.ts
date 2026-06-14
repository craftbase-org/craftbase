import { useState, useEffect } from 'react'
import {
    getConnectorsEnabled,
    setConnectorsEnabled,
    subscribeConnectorsEnabled,
} from '../utils/featureFlags'

// React binding for the live connectors feature flag. Returns the current value
// and a setter; re-renders when the flag changes from anywhere (other tabs of
// the same component, the Settings modal, etc.).
export function useConnectorsEnabled(): [boolean, (enabled: boolean) => void] {
    const [enabled, setEnabled] = useState<boolean>(getConnectorsEnabled)

    useEffect(() => subscribeConnectorsEnabled(setEnabled), [])

    return [enabled, setConnectorsEnabled]
}
