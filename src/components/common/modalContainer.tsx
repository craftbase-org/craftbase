import type { ReactElement, ReactNode } from 'react'

import Modal from './modal'

interface ModalContainerProps {
    closeModal: () => void
    showModal: boolean
    children: ReactNode
}

const ModalContainer = ({
    closeModal,
    showModal,
    children,
}: ModalContainerProps): ReactElement => {
    return (
        <Modal onClose={closeModal} open={showModal}>
            {children}
        </Modal>
    )
}

export default ModalContainer
