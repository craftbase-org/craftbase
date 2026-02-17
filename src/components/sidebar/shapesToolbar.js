import React from 'react'
import { staticPrimaryElementData } from 'utils/constants'
import { useBoardContext } from 'views/Board/board'

const allElements = staticPrimaryElementData.flatMap((section) => section.elements)

const ShapesToolbar = ({ addElement }) => {
    const { currentElement, setCurrentElementInBoard } = useBoardContext()

    return (
        <div
            className="fixed top-2 left-1/2 bg-white rounded-lg shadow-md flex items-center px-2 py-1 gap-1"
            style={{ transform: 'translateX(-50%)', zIndex: 10 }}
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
        </div>
    )
}

export default ShapesToolbar
