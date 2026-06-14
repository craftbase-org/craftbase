import type { ReactElement } from 'react'
import Modal from '../common/modal'
import ToggleSwitch from '../common/toggleSwitch'
import { useConnectorsEnabled } from '../../hooks/useConnectorsEnabled'

interface SettingsModalProps {
    open: boolean
    onClose: () => void
}

const SettingsModal = ({ open, onClose }: SettingsModalProps): ReactElement => {
    const [connectorsEnabled, setConnectorsEnabled] = useConnectorsEnabled()

    return (
        <Modal open={open} onClose={onClose}>
            <div style={{ minWidth: '360px', maxWidth: '460px' }}>
                <h2 className="text-lg font-semibold mb-4 font-display">
                    Settings
                </h2>

                <div className="flex items-start justify-between gap-4">
                    <label
                        htmlFor="connectors-toggle"
                        className="flex-1 cursor-pointer"
                    >
                        <span className="block text-sm font-medium text-ink-mid">
                            Connectors
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-muted">
                            Show connection ports on shapes and let arrows snap
                            to them, so connectors stay attached when you move or
                            resize a shape.
                        </span>
                    </label>

                    <ToggleSwitch
                        id="connectors-toggle"
                        label="Connectors"
                        checked={connectorsEnabled}
                        onChange={setConnectorsEnabled}
                    />
                </div>
            </div>
        </Modal>
    )
}

export default SettingsModal
