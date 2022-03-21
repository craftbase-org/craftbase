import React, { useRef, useState, useEffect } from 'react'

import Button from 'components/common/button'
import LinkIcon from 'assets/link_white.svg'
import CopyIcon from 'assets/copy.svg'

const randomBgColors = [
    '#BF2600',
    '#FF8B00',
    '#006644',
    '#008DA6',
    '#0747A6',
    '#403294',
    '#091E42',
    '#FF5630',
    '#FFAB00',
    '#36B37E',
    '#00B8D9',
    '#0065FF',
    '#6554C0',
]

const UserDetailsPopup = ({}) => {
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
                <div
                    className=" flex items-center  cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation()
                        setShowLink(!showLink)
                    }}
                >
                    <div
                        className="w-7 h-7 flex items-center justify-center 
                        rounded-50-percent border border-blues-b500  
                        text-sm text-white "
                        style={{ background: randomBgColors[0] }}
                    >
                        M
                    </div>
                    <div
                        className="w-7 h-7 flex items-center justify-center 
                        rounded-50-percent border border-blues-b500  
                        text-sm text-white -ml-2"
                        style={{ background: randomBgColors[1] }}
                    >
                        A
                    </div>
                </div>

                <div
                    className="absolute top-12 -right-20 transition-all ease-in duration-200"
                    style={{
                        opacity: showLink ? 1 : 0,
                        zIndex: showLink ? 1 : -1,
                    }}
                >
                    <div
                        className=" w-64 
                        bg-white text-neutrals-n700 border border-neutrals-n40
                        rounded-md px-2 py-4 shadow-md
                        "
                    >
                        <div className="w-full flex items-center">
                            <div
                                className="w-5 h-5 flex items-center justify-center 
                        rounded-50-percent 
                        text-xs text-white "
                                style={{ background: randomBgColors[0] }}
                            >
                                M
                            </div>
                            <div className="pl-2 text-sm text-left">
                                Meet Zaveri (You)
                            </div>
                        </div>

                        <div className="pt-2 w-full flex items-center">
                            <div
                                className="w-5 h-5 flex items-center justify-center 
                        rounded-50-percent   
                        text-xs text-white "
                                style={{ background: randomBgColors[1] }}
                            >
                                A
                            </div>
                            <div className="pl-2 text-sm text-left">
                                Arnub G.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default UserDetailsPopup
