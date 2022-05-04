import React from 'react'

import Modal from './modal'

const ModalContainer = ({ closeModal, showModal, children }) => {
    return (
        <>
            <Modal onClose={closeModal} open={showModal}>
                {children}
            </Modal>
        </>
    )
}

export default ModalContainer
