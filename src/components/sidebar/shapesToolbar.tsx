import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import {
    staticPrimaryElementData,
    type PrimaryElement,
} from '../../utils/constants'
import { useBoardContext } from '../../views/Board/board'
import UndoIcon from '../../assets/undo_amber.svg?react'
import RedoIcon from '../../assets/redo.svg?react'
import { useMediaQueryUtils } from '../../constants/exportHooks'

const allElementsRaw = staticPrimaryElementData.flatMap(
    (section) => section.elements
)

const flattenShapesForDesktop = (
    elements: PrimaryElement[]
): PrimaryElement[] =>
    elements.flatMap((el) =>
        el.elementName === 'shapes'
            ? el.drawerData.map((d) => ({
                  elementName: d.elementName,
                  elementDisplayName: d.elementDisplayName,
                  elementIcon: d.elementIcon,
                  hasDrawer: false,
                  noAction: false,
                  drawerData: [],
              }))
            : [el]
    )

interface ShapesToolbarProps {
    addElement: (label: string) => void
}

interface DrawerAnchor {
    left: number
    top: number
    rectTop: number
}

const ShapesToolbar = ({ addElement }: ShapesToolbarProps): ReactElement => {
    const {
        currentElement,
        setCurrentElementInBoard,
        undoLastAction,
        redoLastAction,
        historyLog,
        bucketLog,
    } = useBoardContext()
    const { isMobile } = useMediaQueryUtils()
    const [openDrawer, setOpenDrawer] = useState<string | null>(null)
    const [drawerAnchor, setDrawerAnchor] = useState<DrawerAnchor | null>(null)
    const drawerRef = useRef<HTMLDivElement | null>(null)

    const allElements = (
        isMobile ? allElementsRaw : flattenShapesForDesktop(allElementsRaw)
    ).filter((el) => (isMobile ? true : !el.mobileOnly))

    useEffect(() => {
        setCurrentElementInBoard('pointer')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!openDrawer) return
        const handleClickOutside = (e: MouseEvent): void => {
            if (
                drawerRef.current &&
                !drawerRef.current.contains(e.target as Node)
            ) {
                setOpenDrawer(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return (): void => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [openDrawer])

    const btnSize = isMobile ? 'w-8 h-8' : 'w-9 h-9'
    const iconSize = isMobile ? 'w-4 h-4' : 'w-5 h-5'

    const shapeDrawerElements =
        allElements.find((el) => el.elementName === openDrawer)?.drawerData ?? []

    const undoButton = (
        <div
            title="Undo"
            className={`
                ${btnSize} flex items-center justify-center rounded cursor-pointer
                transition-all ease-in-out duration-200 text-ink-muted
                ${historyLog.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-accent/30 hover:text-ink'}
            `}
            onClick={(): void => {
                if (historyLog.length > 0) {
                    undoLastAction()
                }
            }}
        >
            <UndoIcon className={iconSize} aria-label="Undo" />
        </div>
    )
    const redoButton = (
        <div
            title="Redo"
            className={`
                ${btnSize} flex items-center justify-center rounded cursor-pointer
                transition-all ease-in-out duration-200 text-ink-muted
                ${bucketLog.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-accent/30 hover:text-ink'}
            `}
            onClick={(): void => {
                if (bucketLog.length > 0) {
                    redoLastAction()
                }
            }}
        >
            <RedoIcon className={iconSize} aria-label="Redo" />
        </div>
    )

    return (
        <div ref={drawerRef}>
            {/* Mobile: undo/redo live in their own row above the primary toolbar
                so the bottom row stays uncrowded. Desktop keeps them inline. */}
            {isMobile && (
                <div
                    className="fixed bg-sidebar border border-border-panel shadow-card rounded-card flex items-center flex-row px-1 py-1 gap-0.5"
                    style={{ bottom: '64px', left: '10px', zIndex: 10 }}
                >
                    {undoButton}
                    {redoButton}
                </div>
            )}
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
                    const isActive =
                        currentElement === element.elementName ||
                        (element.hasDrawer &&
                            element.drawerData.some(
                                (d) => d.elementName === currentElement
                            ))
                    return (
                        <div
                            key={element.elementName}
                            title={element.elementDisplayName}
                            className={`
                                ${btnSize} flex items-center justify-center rounded cursor-pointer
                                transition-all ease-in-out duration-200
                                ${
                                    isActive
                                        ? isMobile
                                            ? 'bg-accent-dark text-white'
                                            : 'bg-accent text-ink'
                                        : 'text-ink-muted hover:bg-accent/30 hover:text-ink'
                                }
                            `}
                            onClick={(e): void => {
                                if (element.hasDrawer) {
                                    const rect =
                                        e.currentTarget.getBoundingClientRect()
                                    setDrawerAnchor({
                                        left: rect.left,
                                        top: rect.bottom,
                                        rectTop: rect.top,
                                    })
                                    const isToggleClose =
                                        openDrawer === element.elementName
                                    setOpenDrawer(
                                        isToggleClose
                                            ? null
                                            : element.elementName
                                    )
                                    setCurrentElementInBoard(
                                        isToggleClose
                                            ? 'pointer'
                                            : element.elementName
                                    )
                                } else {
                                    setOpenDrawer(null)
                                    addElement(element.elementName)
                                    setCurrentElementInBoard(
                                        element.elementName
                                    )
                                }
                            }}
                        >
                            <Icon
                                className={iconSize}
                                aria-label={element.elementDisplayName}
                            />
                        </div>
                    )
                })}
                {!isMobile && (
                    <>
                        <div className="bg-border-panel w-px h-6 mx-1" />
                        {undoButton}
                        {redoButton}
                    </>
                )}
            </div>

            {openDrawer && shapeDrawerElements.length > 0 && drawerAnchor && (
                <div
                    className={`fixed bg-sidebar shadow-card rounded-card flex items-center flex-row
                        ${isMobile ? 'px-1 py-1 gap-0.5 border-b-4 border-accent-dark' : 'px-2 py-1 gap-1 border-t-4 border-accent-dark'}`}
                    style={
                        isMobile
                            ? {
                                  bottom:
                                      window.innerHeight -
                                      drawerAnchor.rectTop +
                                      6,
                                  left: drawerAnchor.left,
                                  zIndex: 11,
                              }
                            : {
                                  top: drawerAnchor.top + 6,
                                  left: drawerAnchor.left,
                                  zIndex: 11,
                              }
                    }
                >
                    {shapeDrawerElements.map((item) => {
                        const Icon = item.elementIcon
                        const isActive = currentElement === item.elementName
                        return (
                            <div
                                key={item.elementName}
                                title={item.elementDisplayName}
                                className={`
                                    ${btnSize} flex items-center justify-center rounded cursor-pointer
                                    transition-all ease-in-out duration-200
                                    ${
                                        isActive
                                            ? isMobile
                                                ? 'bg-accent-dark text-white'
                                                : 'bg-accent text-ink'
                                            : 'text-ink-muted hover:bg-accent/30 hover:text-ink'
                                    }
                                `}
                                onClick={(): void => {
                                    addElement(item.elementName)
                                    setCurrentElementInBoard(item.elementName)
                                    setOpenDrawer(null)
                                }}
                            >
                                <Icon
                                    className={iconSize}
                                    aria-label={item.elementDisplayName}
                                />
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default ShapesToolbar
