import React, { useRef, useState, useEffect } from 'react'
import { useMutation } from '@apollo/client'

import Button from '../common/button'
import Modal from '../common/modal'
import ShareIcon from '../../assets/share-android.svg'
import CopyIcon from '../../assets/copy.svg'
import Spinner from '../common/spinnerWithSize'
import { useBoardContext } from '../../views/Board/board'
import { UPDATE_BOARD_VISIBILITY } from '../../schema/mutations'

const ShareLinkPopup = ({}) => {
    const refNode = useRef(null)
    const [showLink, setShowLink] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [isPersisting, setIsPersisting] = useState(false)
    const [shareUrl, setShareUrl] = useState(null)
    const { isPersisted, persistBoard, backgroundBoardId } = useBoardContext()
    const [updateBoardVisibility] = useMutation(UPDATE_BOARD_VISIBILITY)

    useEffect(() => {
        document.addEventListener('mousedown', handleClick, false)

        return () => {
            document.removeEventListener('mousedown', handleClick, false)
        }
    }, [])

    const handleClick = (e) => {
        if (refNode && refNode.current.contains(e.target)) {
            return
        }

        setShowLink(false)
    }

    const handleShareClick = (e) => {
        e.preventDefault()
        if (!isPersisted) {
            setShowConfirmModal(true)
        } else {
            setShareUrl(window.location.href)
            setShowLink(!showLink)
        }
    }

    const handleConfirmShare = async () => {
        setIsPersisting(true)
        try {
            const serverBoardId = await persistBoard()
            await updateBoardVisibility({ variables: { id: serverBoardId } })
            const url = `${window.location.origin}/board/${serverBoardId}`
            setShareUrl(url)
            setShowConfirmModal(false)
            setShowLink(true)
            window.open(url, '_blank', 'noopener,noreferrer')
        } finally {
            setIsPersisting(false)
        }
    }

    const previewUrl = backgroundBoardId
        ? `${window.location.origin}/board/${backgroundBoardId}`
        : `${window.location.origin}/board/...`

    return (
        <>
            <div className="relative " ref={refNode} style={{ right: '-9px' }}>
                <div
                    className="w-10 h-10 flex items-center justify-center rounded-md bg-accent text-ink font-semibold shadow-card cursor-pointer"
                    onClick={handleShareClick}
                >
                    <img src={ShareIcon} className="w-5 h-5" />
                </div>

                <div
                    className="absolute top-12 right-0 transition-all ease-in duration-200"
                    style={{
                        opacity: showLink ? 1 : 0,
                        zIndex: showLink ? 1 : -1,
                    }}
                >
                    <div
                        className="
                        bg-card-bg text-ink-mid border border-border-panel
                        rounded-md px-2 py-4 shadow-card
                        "
                        style={{ width: '560px' }}
                    >
                        <div className="text-base text-left">
                            Board Link (Public)
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                            <div className="text-sm rounded-md bg-sidebar border border-border-card text-ink px-2 py-2">
                                {shareUrl}
                            </div>
                            <div
                                className="ml-2 rounded-md
                                px-2 py-2 cursor-pointer bg-sidebar border border-border-card
                                hover:bg-border-panel
                                "
                                onClick={(e) => {
                                    e.stopPropagation()
                                    navigator?.clipboard?.writeText(shareUrl)
                                    setShowLink(false)
                                }}
                            >
                                <img src={CopyIcon} className="w-5 h-5 " />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                open={showConfirmModal}
                onClose={() => !isPersisting && setShowConfirmModal(false)}
                locked={isPersisting}
            >
                <div style={{ minWidth: '440px', maxWidth: '520px' }}>
                    {backgroundBoardId ? (
                        <>
                            <h2 className="text-lg font-semibold mb-3 font-display">
                                Share this board
                            </h2>
                            <p className="text-sm text-ink-mid mb-2">
                                We'll generate a unique board link so you can
                                share your work with others.
                            </p>
                            <p className="text-sm text-ink-mid mb-4">
                                This board will be visible to anyone you share
                                the link with. Your shareable URL will be:
                            </p>
                            <div className="text-sm rounded-md bg-sidebar border border-border-card text-ink px-3 py-2 mb-4 break-all">
                                {previewUrl}
                            </div>
                            <p className="text-sm text-ink-mid mb-4">
                                Would you like to proceed?
                            </p>
                            <div className="flex gap-2 justify-end">
                                <Button
                                    intent="secondary"
                                    size="medium"
                                    label="Cancel"
                                    onClick={() => setShowConfirmModal(false)}
                                    disabled={isPersisting}
                                />
                                <Button
                                    intent="primary"
                                    size="medium"
                                    label="Yes, share"
                                    onClick={handleConfirmShare}
                                    loading={isPersisting}
                                    disabled={isPersisting}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="text-lg font-semibold mb-3 font-display">
                                Nothing to share yet
                            </h2>
                            <p className="text-sm text-ink-mid mb-4">
                                Before you share, please create something on the
                                board to make it shareable.
                            </p>
                            <div className="flex justify-end">
                                <Button
                                    intent="primary"
                                    size="medium"
                                    label="Okay"
                                    onClick={() => setShowConfirmModal(false)}
                                />
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </>
    )
}

export default ShareLinkPopup
