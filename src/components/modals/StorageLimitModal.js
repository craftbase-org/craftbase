import React from 'react'
import Modal from 'components/common/modal'
import Button from 'components/common/button'

export default function StorageLimitModal({ open, onClose, boardUrl, onStartNew, onContinue }) {
    return (
        <Modal open={open} onClose={onClose} locked={false}>
            <div className="p-4" style={{ minWidth: '400px' }}>
                <h2 className="text-lg font-semibold mb-2">Storage Limit Reached</h2>
                <p className="text-sm text-neutrals-n700 mb-4">
                    Your local storage is full. Your current work has been saved to the server.
                </p>
                {boardUrl && (
                    <p className="text-sm text-neutrals-n700 mb-4 break-all">
                        Saved board URL:{' '}
                        <a href={boardUrl} className="text-accent-dark underline">
                            {boardUrl}
                        </a>
                    </p>
                )}
                <div className="flex gap-2">
                    <Button
                        intent="primary"
                        size="medium"
                        label="Start New Canvas"
                        onClick={onStartNew}
                    />
                    <Button
                        intent="secondary"
                        size="medium"
                        label="Continue on Saved Board"
                        onClick={onContinue}
                    />
                </div>
            </div>
        </Modal>
    )
}
