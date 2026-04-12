import React, { useEffect } from 'react'
import { staticPrimaryElementData } from 'utils/constants'
import { useBoardContext } from 'views/Board/board'
import undoIcon from 'assets/undo_amber.svg'
import { useMediaQueryUtils } from 'constants/exportHooks'

const allElements = staticPrimaryElementData.flatMap(
    (section) => section.elements
)

const ShapesToolbar = ({ addElement }) => {
    const {
        currentElement,
        setCurrentElementInBoard,
        undoLastAction,
        historyLog,
    } = useBoardContext()
    const { isMobile } = useMediaQueryUtils()

    useEffect(() => {
        setCurrentElementInBoard('pointer')
    }, [])

    const btnSize = isMobile ? 'w-7 h-7' : 'w-9 h-9'
    const iconSize = isMobile ? 'w-4 h-4' : 'w-5 h-5'

    return (
        <div
            className={`fixed bg-white rounded-lg shadow-md flex items-center flex-row
                ${isMobile ? 'px-1 py-1 gap-0.5' : 'top-2 left-1/2 px-2 py-1 gap-1'}`}
            style={isMobile
                ? { top: '8px', left: '56px', zIndex: 10 }
                : { transform: 'translateX(-50%)', zIndex: 10 }
            }
        >
            {allElements.map((element) => (
                <div
                    key={element.elementName}
                    title={element.elementDisplayName}
                    className={`
                        ${btnSize} flex items-center justify-center rounded cursor-pointer
                        transition-all ease-in-out duration-200
                        ${currentElement === element.elementName ? 'bg-blues-b50' : 'hover:bg-blues-b50'}
                    `}
                    onClick={() => {
                        addElement(element.elementName)
                        setCurrentElementInBoard(element.elementName)
                    }}
                >
                    <img
                        className={iconSize}
                        src={element.elementSVG}
                        alt={element.elementDisplayName}
                    />
                </div>
            ))}
            <div className={`bg-gray-200 ${isMobile ? 'w-px h-4 mx-0.5' : 'w-px h-6 mx-1'}`} />
            <div
                title="Undo"
                className={`
                    ${btnSize} flex items-center justify-center rounded cursor-pointer
                    transition-all ease-in-out duration-200
                    ${historyLog.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blues-b50'}
                `}
                onClick={() => {
                    if (historyLog.length > 0) {
                        undoLastAction()
                    }
                }}
            >
                <img className={iconSize} src={undoIcon} alt="Undo" />
            </div>
        </div>
    )
}

export default ShapesToolbar
