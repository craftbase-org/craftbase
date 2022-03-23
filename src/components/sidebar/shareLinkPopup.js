import React, { useRef, useState, useEffect } from 'react'

import Button from 'components/common/button'
import LinkIcon from 'assets/link_white.svg'
import CopyIcon from 'assets/copy.svg'

const ShareLinkPopup = ({}) => {
    const refNode = useRef(null)
    const [showLink, setShowLink] = useState(false)

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

    return (
        <>
            <div className="relative text-sm pr-2" ref={refNode}>
                <a
                    className=" flex items-center px-4 py-2 rounded-md bg-primary-blue text-white shadow-md"
                    href=""
                    onClick={(e) => {
                        e.preventDefault()
                        setShowLink(!showLink)
                    }}
                >
                    <span className="text-sm">Share</span>
                    <img src={LinkIcon} className="ml-2 w-5 h-5" />
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
                                {window.location.href}
                            </div>
                            <div
                                className="ml-2 rounded-md   
                                px-2 py-2  cursor-pointer bg-neutrals-n40
                                hover:shadow-md
                                "
                                onClick={(e) => {
                                    e.stopPropagation()
                                    navigator?.clipboard?.writeText(
                                        window.location.href
                                    )
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
