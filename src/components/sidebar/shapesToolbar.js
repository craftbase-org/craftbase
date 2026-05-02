import React, { useEffect } from 'react'
import { staticPrimaryElementData } from 'utils/constants'
import { useBoardContext } from 'views/Board/board'
import UndoIcon from 'assets/undo_amber.svg?react'
import RedoIcon from 'assets/redo.svg?react'
import { useMediaQueryUtils } from 'constants/exportHooks'

const allElements = staticPrimaryElementData.flatMap(
    (section) => section.elements
)

const ShapesToolbar = ({ addElement }) => {
    const {
        currentElement,
        setCurrentElementInBoard,
        undoLastAction,
        redoLastAction,
        historyLog,
        bucketLog,
    } = useBoardContext()
    const { isMobile } = useMediaQueryUtils()

    useEffect(() => {
        setCurrentElementInBoard('pointer')
    }, [])

    const btnSize = isMobile ? 'w-8 h-8' : 'w-9 h-9'
    const iconSize = isMobile ? 'w-4 h-4' : 'w-5 h-5'

    return (
        <div
            className={`fixed bg-sidebar border border-border-panel shadow-card rounded-card flex items-center flex-row
                ${isMobile ? 'px-1 py-1 gap-0.5' : 'top-2 left-1/2 px-2 py-1 gap-1'}`}
            style={
                isMobile
                    ? { bottom: '16px', left: '10px', zIndex: 10 }
                    : { transform: 'translateX(-50%)', zIndex: 10 }
            }
        >
            {allElements.map((element) => {
                const Icon = element.elementIcon
                const isActive = currentElement === element.elementName
                return (
                    <div
                        key={element.elementName}
                        title={element.elementDisplayName}
                        className={`
                            
                            ${btnSize} flex items-center justify-center rounded cursor-pointer
                            transition-all ease-in-out duration-200
                            ${
                                isActive
                                    ? 'bg-accent text-ink'
                                    : 'text-ink-muted hover:bg-accent/30 hover:text-ink'
                            }
                        `}
                        onClick={() => {
                            addElement(element.elementName)
                            setCurrentElementInBoard(element.elementName)
                        }}
                    >
                        <Icon
                            className={iconSize}
                            aria-label={element.elementDisplayName}
                        />
                    </div>
                )
            })}
            <div
                className={`bg-border-panel ${isMobile ? 'w-px h-4 mx-0.5' : 'w-px h-6 mx-1'}`}
            />
            <div
                title="Undo"
                className={`
                    ${btnSize} flex items-center justify-center rounded cursor-pointer
                    transition-all ease-in-out duration-200 text-ink-muted
                    ${historyLog.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-accent/30 hover:text-ink'}
                `}
                onClick={() => {
                    if (historyLog.length > 0) {
                        undoLastAction()
                    }
                }}
            >
                <UndoIcon className={iconSize} aria-label="Undo" />
            </div>
            <div
                title="Redo"
                className={`
                    ${btnSize} flex items-center justify-center rounded cursor-pointer
                    transition-all ease-in-out duration-200 text-ink-muted
                    ${bucketLog.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-accent/30 hover:text-ink'}
                `}
                onClick={() => {
                    if (bucketLog.length > 0) {
                        redoLastAction()
                    }
                }}
            >
                <RedoIcon className={iconSize} aria-label="Redo" />
            </div>
        </div>
    )
}

export default ShapesToolbar
