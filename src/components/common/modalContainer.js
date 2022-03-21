import React from 'react'

import Modal from './modal'

const ModalContainer = ({ closeModal, showModal }) => {
    return (
        <>
            <Modal onClose={closeModal} open={showModal}>
                {props.children}
            </Modal>
        </>
    )
}

export default ModalContainer
