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

    return (
        <div
            className={`fixed bg-white rounded-lg shadow-md px-2 py-1 gap-1
                ${isMobile ? 'flex flex-col' : 'top-2 left-1/2 flex flex-row items-center'}`}
            style={isMobile
                ? { top: '56px', left: '10px', zIndex: 10 }
                : { transform: 'translateX(-50%)', zIndex: 10 }
            }
        >
            {allElements.map((element) => (
                <div
                    key={element.elementName}
                    title={element.elementDisplayName}
                    className={`
                        w-9 h-9 flex items-center justify-center rounded cursor-pointer
                        transition-all ease-in-out duration-200
                        ${currentElement === element.elementName ? 'bg-blues-b50' : 'hover:bg-blues-b50'}
                    `}
                    onClick={() => {
                        addElement(element.elementName)
                        setCurrentElementInBoard(element.elementName)
                    }}
                >
                    <img
                        className="w-5 h-5"
                        src={element.elementSVG}
                        alt={element.elementDisplayName}
                    />
                </div>
            ))}
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <div
                title="Undo"
                className={`
                    w-9 h-9 flex items-center justify-center rounded cursor-pointer
                    transition-all ease-in-out duration-200
                    ${historyLog.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blues-b50'}
                `}
                onClick={() => {
                    if (historyLog.length > 0) {
                        undoLastAction()
                    }
                }}
            >
                <img className="w-5 h-5" src={undoIcon} alt="Undo" />
            </div>
        </div>
    )
}

export default ShapesToolbar
