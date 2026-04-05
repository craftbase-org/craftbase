import React, { useRef, useState, useEffect } from 'react'

import Button from 'components/common/button'
import LinkIcon from 'assets/link_white.svg'
import CopyIcon from 'assets/copy.svg'
import Spinner from 'components/common/spinnerWithSize'
import { useBoardContext } from 'views/Board/board'

const ShareLinkPopup = ({}) => {
    const refNode = useRef(null)
    const [showLink, setShowLink] = useState(false)
    const [isPersisting, setIsPersisting] = useState(false)
    const [shareUrl, setShareUrl] = useState(window.location.href)
    const { isPersisted, persistBoard } = useBoardContext()

    useEffect(() => {
        document.addEventListener('mousedown', handleClick, false)

        // when component will unmount
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

    const handleShareClick = async (e) => {
        e.preventDefault()
        if (!isPersisted) {
            setIsPersisting(true)
            try {
                const serverBoardId = await persistBoard()
                setShareUrl(`${window.location.origin}/board/${serverBoardId}`)
                setShowLink(true)
            } finally {
                setIsPersisting(false)
            }
        } else {
            setShareUrl(window.location.href)
            setShowLink(!showLink)
        }
    }

    return (
        <>
            <div className="relative text-sm pr-2" ref={refNode}>
                <a
                    className=" flex items-center px-4 py-2 rounded-md bg-primary-blue text-white shadow-md"
                    href=""
                    onClick={handleShareClick}
                >
                    {isPersisting ? (
                        <Spinner loaderSize="sm" />
                    ) : (
                        <img src={LinkIcon} className="w-5 h-5" />
                    )}
                </a>

                <div
                    className="absolute top-12 right-0 transition-all ease-in duration-200"
                    style={{
                        opacity: showLink ? 1 : 0,
                        zIndex: showLink ? 1 : -1,
                    }}
                >
                    <div
                        className="
                        bg-white text-neutrals-n700 border border-neutrals-n40
                        rounded-md px-2 py-4 shadow-md
                        "
                        style={{ width: '560px' }}
                    >
                        <div className="text-base text-left">
                            Board Link (Public)
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                            <div className="text-sm rounded-md bg-neutrals-n40  text-black px-2 py-2 ">
                                {shareUrl}
                            </div>
                            <div
                                className="ml-2 rounded-md
                                px-2 py-2  cursor-pointer bg-neutrals-n40
                                hover:shadow-md
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
        </>
    )
}

export default ShareLinkPopup
