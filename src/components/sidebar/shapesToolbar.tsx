import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import {
    staticPrimaryElementData,
    geoElementData,
    type PrimaryElement,
} from '../../utils/constants'
import { useBoardContext } from '../../views/Board/boardContext'
import UndoIcon from '../../assets/undo_amber.svg?react'
import RedoIcon from '../../assets/redo.svg?react'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import {
    POINT_CATEGORIES,
    DEFAULT_POINT_CATEGORY,
    sizedCategoryIcon,
} from '../../constants/misc'

const allElementsRaw = staticPrimaryElementData.flatMap(
    (section) => section.elements
)

// Whiteboard-only tools hidden once geo objects are enabled — the geo workflow
// uses point/area/route + the zoom-resistant geoText instead. 'shapes' is the
// mobile drawer; rectangle/circle/diamond are its desktop-flattened children.
// 'lines' is the line/curvedLine drawer (kept as a drawer on both platforms).
// 'text' is replaced by 'geoText' (see geoElementData).
const GEO_HIDDEN_TOOLS = new Set([
    'shapes',
    'rectangle',
    'circle',
    'diamond',
    'lines',
    'arrowLine',
    'pencil',
    'text',
])

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
    addElement: (label: string, category?: string) => void
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
        geoObjectsEnabled,
        selectedComponent,
        applyProperty,
    } = useBoardContext()
    const { isMobile } = useMediaQueryUtils()
    const [openDrawer, setOpenDrawer] = useState<string | null>(null)
    const [drawerAnchor, setDrawerAnchor] = useState<DrawerAnchor | null>(null)
    const drawerRef = useRef<HTMLDivElement | null>(null)
    // Last category chosen for *new* points (so the drawer reflects the user's
    // pick across placements). A selected point's own category takes priority
    // when the drawer is opened with one focused.
    const [pointCategory, setPointCategory] = useState<string>(
        DEFAULT_POINT_CATEGORY
    )

    // When a point is selected, the same drawer recolors it in place (via
    // applyProperty) instead of starting a new draw. Read its current category
    // so the active chip reflects the selection.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectedElementData = (selectedComponent as any)?.group?.data
        ?.elementData
    const isPointSelected = selectedElementData?.componentType === 'point'
    const activePointCategory = isPointSelected
        ? (selectedElementData?.metadata?.category ?? DEFAULT_POINT_CATEGORY)
        : pointCategory

    // With geo objects enabled, pan is the default/home tool, but the pointer
    // stays available so points can be selected (to edit category / tooltip);
    // otherwise the usual pointer/select default.
    const homeTool = geoObjectsEnabled ? 'pan' : 'pointer'

    const allElements = (() => {
        const list = (
            isMobile ? allElementsRaw : flattenShapesForDesktop(allElementsRaw)
        )
            // Whiteboard shape tools are hidden in geo mode in favour of the
            // geo toolset (point/area/route/geoText).
            .filter(
                (el) =>
                    !geoObjectsEnabled || !GEO_HIDDEN_TOOLS.has(el.elementName)
            )
            // Geo tools (point/area/route/geoText) appear alongside the shape
            // tools only when the consumer opts in via the geoObjectsEnabled
            // Board prop.
            .concat(geoObjectsEnabled ? geoElementData : [])

        // The eraser (rubber) always sits last in the toolbar order, after any
        // geo tools appended above.
        const rubberIdx = list.findIndex((el) => el.elementName === 'rubber')
        if (rubberIdx !== -1) {
            const [rubber] = list.splice(rubberIdx, 1)
            list.push(rubber!)
        }
        return list
    })()

    useEffect(() => {
        // Pan needs activating (addElement) to become the live mode; pointer is
        // the board's resting state, so a highlight is enough.
        if (geoObjectsEnabled) addElement('pan')
        setCurrentElementInBoard(homeTool)
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
        allElements.find((el) => el.elementName === openDrawer)?.drawerData ??
        []

    const undoButton = (
        <div
            title="Undo"
            className={`
                ${btnSize} flex items-center justify-center rounded cursor-pointer
                transition-all ease-in-out duration-200 text-ink-muted
                ${historyLog.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-accent/50 hover:text-ink'}
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
                ${bucketLog.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-accent/50 hover:text-ink'}
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
                    className="fixed bg-card-bg border border-border-panel rounded-card flex items-center flex-row px-1 py-1 gap-0.5"
                    style={{ bottom: '64px', left: '10px', zIndex: 10 }}
                >
                    {undoButton}
                    {redoButton}
                </div>
            )}
            <div
                className={`fixed bg-card-bg border border-border-panel rounded-card flex items-center flex-row
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
                        openDrawer === element.elementName ||
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
                                        ? 'bg-accent/50 text-ink dark:bg-accent/50/30 dark:text-white'
                                        : 'text-ink-muted hover:bg-accent/50 dark:hover:bg-accent/50/30 hover:text-ink'
                                }
                            `}
                            onClick={(e): void => {
                                // Point opens a category drawer rather than
                                // drawing immediately — the chosen category
                                // seeds the new point (or recolors a selected
                                // one). Don't touch currentElement here so a
                                // focused point stays selected for re-skinning.
                                if (element.elementName === 'point') {
                                    const rect =
                                        e.currentTarget.getBoundingClientRect()
                                    setDrawerAnchor({
                                        left: rect.left,
                                        top: rect.bottom,
                                        rectTop: rect.top,
                                    })
                                    setOpenDrawer(
                                        openDrawer === 'point' ? null : 'point'
                                    )
                                } else if (element.hasDrawer) {
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
                                            ? homeTool
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
                    className={`fixed bg-card-bg rounded-card flex items-center flex-row
                        ${isMobile ? 'px-1 py-1 gap-0.5 border-t-2 border-accent-dark' : 'px-2 py-1 gap-1 border-b-2 border-accent-dark'}`}
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
                                            ? 'bg-accent/50 text-ink dark:bg-accent/50/30 dark:text-white'
                                            : 'text-ink-muted hover:bg-accent/50 dark:hover:bg-accent/50/30 hover:text-ink'
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

            {/* Point categories — a swatch row beneath the toolbar. Picking one
                seeds the next placed point, or recolors the focused point. */}
            {openDrawer === 'point' && drawerAnchor && (
                <div
                    className={`fixed bg-sidebar rounded-card flex items-center flex-row
                        ${isMobile ? 'px-1 py-1 gap-1 border-b-4 border-accent-dark' : 'px-2 py-1 gap-1.5 border-t-4 border-accent-dark'}`}
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
                    {Object.values(POINT_CATEGORIES).map((cat) => {
                        const isActive = activePointCategory === cat.id
                        return (
                            <button
                                key={cat.id}
                                title={cat.label}
                                aria-label={cat.label}
                                className={`${btnSize} flex items-center justify-center rounded-lg cursor-pointer transition-transform duration-150 hover:scale-105 ${
                                    isActive ? 'scale-105' : ''
                                }`}
                                style={{
                                    background: cat.bg,
                                    border: cat.border
                                        ? `2px solid ${cat.border}`
                                        : 'none',
                                    boxShadow: isActive
                                        ? '0 0 0 2px #E8C87A'
                                        : '2px 2px 0 #C4B89A',
                                }}
                                onClick={(): void => {
                                    if (isPointSelected) {
                                        // Recolor the focused point in place.
                                        applyProperty?.('pointCategory', cat.id)
                                    } else {
                                        // Seed + arm a fresh point placement.
                                        setPointCategory(cat.id)
                                        addElement('point', cat.id)
                                        setCurrentElementInBoard('point')
                                    }
                                    setOpenDrawer(null)
                                }}
                            >
                                <span
                                    className="flex items-center justify-center pointer-events-none"
                                    // Category icons are pre-colored SVG strings.
                                    dangerouslySetInnerHTML={{
                                        __html: sizedCategoryIcon(
                                            cat.svgIcon,
                                            isMobile ? 16 : 18
                                        ),
                                    }}
                                />
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default ShapesToolbar
