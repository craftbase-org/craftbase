import React, { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import routes from 'routes'

const HamburgerIcon = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <rect x="2" y="3.5" width="12" height="1.5" rx="0.75" fill="#344563" />
        <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="#344563" />
        <rect x="2" y="11" width="12" height="1.5" rx="0.75" fill="#344563" />
    </svg>
)

const ExternalIcon = () => (
    <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7"
            stroke="#8993A4"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M7.5 1.5H10.5M10.5 1.5V4.5M10.5 1.5L5.5 6.5"
            stroke="#8993A4"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
)

const MenuDrawer = () => {
    const refNode = useRef(null)
    const [showMenu, setShowMenu] = useState(false)

    useEffect(() => {
        document.addEventListener('mousedown', handleClick, false)
        return () => {
            document.removeEventListener('mousedown', handleClick, false)
        }
    }, [])

    const handleClick = (e) => {
        if (refNode && refNode.current && refNode.current.contains(e.target)) {
            return
        }
        setShowMenu(false)
    }

    return (
        <div
            ref={refNode}
            className="relative bg-white rounded-lg shadow-md"
            style={{ position: 'fixed', top: '8px', left: '10px', zIndex: 10 }}
        >
            {/* Trigger button — matches ShapesToolbar item sizing exactly */}
            <div
                title="Menu"
                className={`
                    w-9 h-9 flex items-center justify-center rounded cursor-pointer
                    transition-all ease-in-out duration-200
                    ${showMenu ? 'bg-blues-b50' : 'hover:bg-blues-b50'}
                `}
                onClick={() => setShowMenu((prev) => !prev)}
            >
                <HamburgerIcon />
            </div>

            {/* Dropdown panel */}
            <div
                className="absolute left-0 transition-all ease-in duration-200"
                style={{
                    top: '48px',
                    opacity: showMenu ? 1 : 0,
                    zIndex: showMenu ? 20 : -1,
                    pointerEvents: showMenu ? 'auto' : 'none',
                }}
            >
                <div
                    className="bg-white border border-neutrals-n40 rounded-lg shadow-lg py-1"
                    style={{ width: '188px' }}
                >
                    {/* Section label */}
                    <div className="px-3 pt-1 pb-1.5">
                        <span className="text-xs font-semibold text-neutrals-n300 uppercase tracking-wider">
                            More
                        </span>
                    </div>

                    <div className="h-px bg-neutrals-n40 mx-2 mb-1" />

                    <a
                        href="https://github.com/craftbase-org/craftbase/releases"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-3 py-2 mx-1 text-sm text-neutrals-n700
                            hover:bg-blues-b50 rounded cursor-pointer no-underline
                            transition-colors ease-in-out duration-150"
                        onClick={() => setShowMenu(false)}
                    >
                        <div className="flex items-center gap-2.5">
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M2 1h10a1 1 0 011 1v10a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1z"
                                    stroke="#505F79"
                                    strokeWidth="1.1"
                                />
                                <path
                                    d="M4 4.5h6M4 7h6M4 9.5h3.5"
                                    stroke="#505F79"
                                    strokeWidth="1.1"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span>Changelog</span>
                        </div>
                        <ExternalIcon />
                    </a>

                    <Link
                        to={routes.support}
                        className="flex items-center gap-2.5 px-3 py-2 mx-1 text-sm text-neutrals-n700
                            hover:bg-blues-b50 rounded cursor-pointer no-underline
                            transition-colors ease-in-out duration-150"
                        onClick={() => setShowMenu(false)}
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <circle
                                cx="7"
                                cy="7"
                                r="5.5"
                                stroke="#505F79"
                                strokeWidth="1.1"
                            />
                            <path
                                d="M7 4.5v3.5M7 9.5v.5"
                                stroke="#505F79"
                                strokeWidth="1.1"
                                strokeLinecap="round"
                            />
                        </svg>
                        <span>Support</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default MenuDrawer
