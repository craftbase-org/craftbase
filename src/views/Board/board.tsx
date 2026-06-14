import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    type ReactNode,
} from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { useParams, useNavigate } from 'react-router-dom'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import {
    GET_COMPONENTS_FOR_BOARD_QUERY,
    GET_COMPONENT_TYPES,
} from '../../schema/queries'
import {
    UPDATE_USER_REVISIT_COUNT,
    INSERT_USER_ONE,
    INSERT_COMPONENT,
    INSERT_BULK_COMPONENTS,
    DELETE_COMPONENT_BY_ID,
    DELETE_BULK_COMPONENTS,
    UPDATE_COMPONENT_INFO,
    CREATE_BOARD,
} from '../../schema/mutations'
import Canvas from '../../newCanvas'
import ZoomControls from '../../components/ZoomControls'
import Sidebar from '../../components/sidebar/primary'
import ElementPropertiesToolbar from '../../components/sidebar/elementProperties'
import PointTooltip from '../../components/elements/pointTooltip'
import ClusterLayer from '../../components/elements/clusterLayer'
import controlsIcon from '../../assets/controls.svg'
import PermissionErrorModal from '../../components/modals/PermissionErrorModal'
import StorageLimitModal from '../../components/modals/StorageLimitModal'
import { generateUUID, generateRandomUsernames } from '../../utils/misc'
import { prefetchElementModule } from '../../elementModules'
import {
    pollUntilElement,
    getShapeTextNodes,
    applyShapeText,
    shapeTextStyleFromMeta,
} from '../../utils/canvasUtils'
import { reflowTextForShape } from '../../utils/shapeTextFit'
import { lineHeightFor } from '../../utils/textLayout'
import {
    TEXT_SIZES_OBJECT,
    MOBILE_TEXT_SIZES_OBJECT,
} from '../../utils/constants'
import {
    RUBBER_MODE_KEY,
    GROUP_COMPONENT,
    DRAFT_STORAGE_KEY,
    ARROW_DRAW_MODE_KEY,
    TEXT_DRAW_MODE_KEY,
    PENDING_SHAPE_TYPE_KEY,
    PENDING_SHAPE_PROPS_KEY,
    LAST_ADDED_ELEMENT_ID_KEY,
    PENCIL_MODE_KEY,
    BACKGROUND_BOARD_STORAGE_KEY,
    VIEWPORT_KEY_PREFIX,
    MOBILE_VIEWPORT_KEY_PREFIX,
    VIEWPORT_TTL_MS,
    DEFAULT_TEXT_SIZE,
    GEO_DRAW_MODE_KEY,
    GEO_DRAW_TYPE_KEY,
    GEO_DRAW_PROPS_KEY,
    GEO_POINT_PLACE_MODE_KEY,
    DEFAULT_GEO_RESIST,
    WELCOME_DISMISSED_KEY,
} from '../../constants/misc'
import {
    isWelcomeComponent,
    playWelcomeSketchEntrance,
    playWelcomeSketchExit,
} from '../../utils/welcomeSketch'
import { useDrawingModes } from '../../hooks/useDrawingModes'
import { useElementDefaults } from '../../hooks/useElementDefaults'
import { useMobileToolbarPanels } from '../../hooks/useMobileToolbarPanels'
import { useLocalDraftPersistence } from '../../hooks/useLocalDraftPersistence'
import {
    useComponentHistory,
    type HistoryEntry,
} from '../../hooks/useComponentHistory'
import { createApplyProperty } from '../../utils/applyProperty'
import { createApplyGroupProperty } from '../../utils/applyGroupProperty'
import type {
    BoardProps,
    BoardContextValue,
    ComponentRecord,
    ComponentStore,
    CameraChangeEvent,
} from '../../types/board'
import { BoardContext, useBoardContext } from './boardContext'

// Re-exported so existing importers (`from '.../views/Board/board'`) and the
// public lib.ts surface keep working — the canonical definition now lives in
// the stable boardContext module (see the comment there for the HMR rationale).
export { BoardContext, useBoardContext }

// Strips __typename fields injected by Apollo before sending data back to Hasura
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripTypename(obj: any): any {
    if (Array.isArray(obj)) return obj.map(stripTypename)
    if (obj && typeof obj === 'object') {
        const { __typename, ...rest } = obj
        return Object.fromEntries(
            Object.entries(rest).map(([k, v]) => [k, stripTypename(v)])
        )
    }
    return obj
}

const BoardViewPage: React.FC<BoardProps> = (props) => {
    const routeParams = useParams()
    const boardIdFromUrl = routeParams.id
    const [localBoardId, setLocalBoardId] = useState(() => {
        if (boardIdFromUrl) return boardIdFromUrl
        // Reuse the boardId stored with the local draft so viewport persistence
        // keys stay stable across page refreshes in local (non-persisted) mode.
        try {
            const draft = localStorage.getItem(DRAFT_STORAGE_KEY)
            if (draft) {
                const parsed = JSON.parse(draft)
                if (parsed?.boardId) return parsed.boardId
            }
        } catch (_) {}
        return generateUUID()
    })
    const [isPersisted, setIsPersisted] = useState(!!boardIdFromUrl)
    const isPersistedRef = useRef(!!boardIdFromUrl)
    const boardId = boardIdFromUrl || localBoardId
    const [backgroundBoardId, setBackgroundBoardId] = useState<string | null>(
        null
    )
    const backgroundBoardIdRef = useRef<string | null>(null)
    const boardCreationInFlightRef = useRef<boolean>(false)

    const {
        loading: getComponentsForBoardLoading,
        data: getComponentsForBoardData,
        error: getComponentsForBoardError,
    } = useQuery(GET_COMPONENTS_FOR_BOARD_QUERY, {
        variables: { boardId },
        fetchPolicy: 'cache-first',
        skip: !isPersisted,
    })

    const { data: getComponentTypesData } = useQuery(GET_COMPONENT_TYPES)

    const [insertComponent] = useMutation(INSERT_COMPONENT, {
        ignoreResults: true,
    })

    const [updateComponentInfo] = useMutation(UPDATE_COMPONENT_INFO, {
        ignoreResults: true,
    })

    const [
        deleteComponent,
        {
            loading: deleteComponentLoading,
            data: deleteComponentData,
            error: deleteComponentError,
        },
    ] = useMutation(DELETE_COMPONENT_BY_ID)

    const [deleteBulkComponents] = useMutation(DELETE_BULK_COMPONENTS)

    const [
        updateUserRevisit,
        {
            loading: updateUserRevisitLoading,
            data: updateUserRevisitData,
            error: updateUserRevisitError,
        },
    ] = useMutation(UPDATE_USER_REVISIT_COUNT)

    const [insertUser] = useMutation(INSERT_USER_ONE)

    const navigate = useNavigate()

    const [
        createBoard,
        { loading: createBoardLoading, data: createBoardData },
    ] = useMutation(CREATE_BOARD)

    const [insertBulkComponents] = useMutation(INSERT_BULK_COMPONENTS, {
        ignoreResults: true,
    })

    const [componentStore, setComponentStore] = useState<ComponentStore>({})
    const [lastAddedElement, setLastAddedElement] =
        useState<ComponentRecord | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [twoJSInstance, setTwoJSInstance] = useState<any>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [zuiInBoard, setZuiInBoard] = useState<any>(null)
    const [selectedComponent, setSelectedComponent] = useState<unknown>(null)
    const [selectedGroup, setSelectedGroup] = useState<unknown>(null)
    // Mirror of selectedGroup as a ref — useComponentHistory's applyBatch needs
    // to read the currently-focused group at undo/redo time without re-running.
    const selectedGroupRef = useRef<unknown>(null)
    const [currentElement, setCurrentElement] = useState<string | null>(null)
    const [showPermissionErrorModal, setShowPermissionErrorModal] =
        useState(false)
    const { isDesktop, isMobile, isLaptop, isTablet } = useMediaQueryUtils()

    const stateRefForComponentStore = useRef<ComponentStore>({})
    // newCanvas owns reorderSelected (it needs reconcileZOrder + the live zui
    // selection). It populates this ref on mount; the context exposes a stable
    // wrapper so the properties toolbar can trigger reordering too. No-op until
    // Canvas mounts.
    const reorderSelectedRef = useRef<
        ((op: 'front' | 'forward' | 'backward' | 'back') => void) | null
    >(null)
    const reorderSelected = useCallback(
        (op: 'front' | 'forward' | 'backward' | 'back'): void => {
            reorderSelectedRef.current?.(op)
        },
        []
    )
    // Guards the one-shot welcome-sketch soft-land entrance.
    const welcomeEntrancePlayedRef = useRef(false)
    // Guards the one-shot welcome-sketch exit so a burst of first adds only
    // fades the sketch out once.
    const welcomeDismissInFlightRef = useRef(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const twoJSInstanceRef = useRef<any>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zuiInBoardRef = useRef<any>(null)
    const skipComponentStoreResetRef = useRef<boolean>(false)

    const {
        pointerToggle,
        setPointerToggle,
        isPencilMode,
        setPencilMode,
        isArrowDrawMode,
        setIsArrowDrawMode,
        isTextDrawMode,
        setIsTextDrawMode,
        isRubberMode,
        isPanMode,
        togglePanMode: togglePanModeFromHook,
        setArrowDrawModeInBoard,
        setTextDrawModeInBoard,
        setRubberModeInBoard,
        clearDrawModesFromStorage,
    } = useDrawingModes()

    const { showMobileToolbarPanel, setShowMobileToolbarPanel } =
        useMobileToolbarPanels({ isMobile, selectedComponent })

    const {
        // values
        defaultFill,
        defaultStrokeColor,
        defaultLinewidth,
        defaultStrokeType,
        defaultOpacity,
        defaultTextColor,
        defaultTextSize,
        defaultTextFontFamily,
        // raw setters (used by createApplyProperty + history)
        setDefaultFill,
        setDefaultStrokeColor,
        setDefaultLinewidth,
        setDefaultStrokeType,
        setDefaultOpacity,
        setDefaultTextColor,
        setDefaultTextSize,
        setDefaultTextFontFamily,
        // board-facing setters (kept for any external callers)
        setDefaultLinewidthInBoard,
        setDefaultStrokeTypeInBoard,
        resetDefaults,
    } = useElementDefaults()

    const onStorageLimitRef = useRef<(() => Promise<void>) | null>(null)

    const {
        showStorageLimitModal,
        setShowStorageLimitModal,
        storageLimitBoardUrl,
        setStorageLimitBoardUrl,
        handleStartNewCanvas,
        handleContinueOnSavedBoard,
    } = useLocalDraftPersistence({
        isPersisted,
        localBoardId,
        componentStore,
        setComponentStore,
        backgroundBoardIdRef,
        setBackgroundBoardId,
        onStorageLimitRef,
        welcomeSketch: props.welcomeSketch,
        isMobile,
    })

    const {
        historyLog,
        historyLogRef,
        bucketLog,
        bucketLogRef,
        recordToHistoryLog,
        recordBatchToHistoryLog,
        undoLastAction,
        redoLastAction,
        clearHistory,
    } = useComponentHistory({
        twoJSInstanceRef,
        stateRefForComponentStore,
        isPersistedRef,
        boardId,
        isPersisted,
        insertComponent,
        deleteComponent,
        updateComponentInfo,
        setComponentStore,
        setShowPermissionErrorModal,
        setDefaultLinewidth,
        setDefaultStrokeType,
        selectedComponent,
        selectedGroupRef,
        stripTypename,
    })

    // Clear stale interaction flags from localStorage on mount so a page refresh
    // never triggers SCENARIO_DRAW_SHAPE / SCENARIO_ARROW_DRAW / etc. on the
    // first mousedown. These keys are only meaningful within a single page session.
    //
    // This parent effect runs AFTER the child shapesToolbar effect that sets the
    // pan default, so the sweep above (which clears PAN_MODE_KEY) would otherwise
    // wipe it out — leaving pan highlighted but inert. Re-activate it here so the
    // pan default actually takes effect when geo objects are enabled.
    useEffect(() => {
        clearDrawModesFromStorage()
        if (props.geoObjectsEnabled) togglePanMode(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Sweep viewport entries older than VIEWPORT_TTL_MS or missing savedAt.
    // Each new local draft writes its own craftbase_viewport_<id> key; without
    // this sweep, localStorage accumulates dead entries indefinitely.
    useEffect(() => {
        try {
            const now = Date.now()
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i)
                if (
                    !key ||
                    (!key.startsWith(VIEWPORT_KEY_PREFIX) &&
                        !key.startsWith(MOBILE_VIEWPORT_KEY_PREFIX))
                )
                    continue
                try {
                    const parsed = JSON.parse(
                        localStorage.getItem(key) ?? 'null'
                    )
                    if (
                        !parsed?.savedAt ||
                        now - parsed.savedAt > VIEWPORT_TTL_MS
                    ) {
                        localStorage.removeItem(key)
                    }
                } catch (_) {
                    localStorage.removeItem(key)
                }
            }
        } catch (_) {}
    }, [])

    // Reset component store whenever the board changes (persisted mode only).
    // In local mode the boardId is a stable UUID and draft restore handles initialization.
    // skipComponentStoreResetRef lets persistBoard() rotate localBoardId without wiping the store.
    const prevBoardIdRef = useRef(boardId)
    useEffect(() => {
        if (prevBoardIdRef.current !== boardId) {
            if (!skipComponentStoreResetRef.current) {
                setComponentStore({})
            }
            skipComponentStoreResetRef.current = false
            prevBoardIdRef.current = boardId
        }
    }, [boardId])

    // Update revisit count on every board open, persisted or local.
    // A null payload means there's no revisit row for this userId — i.e.
    // the user was never created in this DB. Self-heal by inserting the
    // user with the known id; the `after_user_insert` Postgres trigger
    // then creates the revisits row (count = 1) for this visit.
    useEffect(() => {
        const userId = localStorage.getItem('userId')
        if (!userId) return
        // Capture the revisit moment client-side as an ISO 8601 string;
        // Hasura coerces it into the timestamptz `last_visit` column for
        // cohort analysis in the DB.
        updateUserRevisit({
            variables: { userId, lastVisit: new Date().toISOString() },
        })
            .then(({ data }) => {
                if (data?.update_users_user_revisits_by_pk) return
                const { nickname, firstName, lastName } =
                    generateRandomUsernames()
                return insertUser({
                    variables: {
                        object: { id: userId, nickname, firstName, lastName },
                    },
                })
            })
            .catch(() => {
                // Non-blocking: revisit tracking is best-effort and must
                // never break board mount (network/permission/conflict).
            })
    }, [])

    // Track last opened board only once it's persisted
    useEffect(() => {
        if (isPersisted && boardId) {
            localStorage.setItem('lastOpenBoard', boardId)
        }
    }, [isPersisted])

    useEffect(() => {
        if (
            !getComponentsForBoardLoading &&
            getComponentsForBoardData &&
            getComponentsForBoardData.components
        ) {
            if (getComponentsForBoardData.components.length > 0) {
                const baseComponentStore: ComponentStore = { ...componentStore }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                getComponentsForBoardData.components.forEach((item: any) => {
                    baseComponentStore[item.id] = item as ComponentRecord
                })
                setComponentStore(baseComponentStore)
            }
        }
    }, [getComponentsForBoardData])

    useEffect(() => {
        isPersistedRef.current = isPersisted
    }, [isPersisted])

    // Warm the core element chunks once the board is idle after mount, so the
    // first use of any of them finds its chunk already cached (the per-arm
    // prefetch in primary.tsx still covers the quick-draw race). Best-effort:
    // gated on idle so it never competes with initial paint/board-load.
    //
    // `groupobject` is included because group-selection lazy-loads it on
    // demand; without warming, the group can't mount until its ~580ms (Slow 4G)
    // chunk arrives, leaving the selected elements invisible — the group-select
    // "blink". Geo-only components (point/area/route/geoText/cluster) are left
    // out; warm them separately if/when geo mode needs it.
    useEffect(() => {
        const CORE_ELEMENT_CHUNKS = [
            'rectangle',
            'circle',
            'diamond',
            'arrowLine',
            'divider',
            'pencil',
            'newText',
            'groupobject',
        ]
        const warm = (): void => {
            CORE_ELEMENT_CHUNKS.forEach(prefetchElementModule)
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ric = (window as any).requestIdleCallback as
            | ((cb: () => void, opts?: { timeout: number }) => number)
            | undefined
        if (ric) {
            const handle = ric(warm, { timeout: 3000 })
            return (): void => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ;(window as any).cancelIdleCallback?.(handle)
            }
        }
        const t = setTimeout(warm, 1500)
        return (): void => clearTimeout(t)
    }, [])

    useEffect(() => {
        console.log('change in componentStore in Board', componentStore)
        stateRefForComponentStore.current = componentStore
    }, [componentStore])

    // One-shot soft-land entrance for the welcome sketch. Fires once the seeded
    // welcome elements are in the store AND the Two.js instance is live; the
    // animation polls per-element for its mounted node, so this only needs to
    // catch the first time both conditions hold.
    useEffect(() => {
        if (welcomeEntrancePlayedRef.current) return
        const two = twoJSInstanceRef.current
        if (!two) return
        const hasWelcome = Object.values(componentStore).some((comp) =>
            isWelcomeComponent(comp)
        )
        if (!hasWelcome) return
        welcomeEntrancePlayedRef.current = true
        playWelcomeSketchEntrance(two, componentStore)
    }, [componentStore, twoJSInstance])

    // NOTE: the persisted-board loading gate lives in the parent
    // (views/Board/index.tsx). Never add a conditional `return` here — this
    // component runs hundreds of hooks below this point and an early return
    // changes the hook count between renders (Rules of Hooks violation).

    const setRootCursor = (cursor: string) => {
        const root = document.getElementById('main-two-root')
        if (root) root.style.cursor = cursor
    }

    const updateLastAddedElement = (obj: unknown) => {
        setLastAddedElement(obj as ComponentRecord | null)
        setRootCursor('crosshair')
    }

    const togglePointer = (pointerVal: boolean) => {
        setPointerToggle(pointerVal)
        setPencilMode(false)
        if (pointerVal) {
            cancelPendingElement()
            setSelectedComponent(null)
            setRubberModeInBoard(false)
            setRootCursor('default')
        }
    }

    const togglePencilMode = (value: boolean) => {
        setPencilMode(value)
        if (value) {
            cancelPendingElement()
            setRubberModeInBoard(false)
            localStorage.setItem(PENCIL_MODE_KEY, 'TRUE')
            setRootCursor('crosshair')
        } else {
            localStorage.removeItem(PENCIL_MODE_KEY)
        }
    }

    const togglePanMode = (value: boolean) => {
        togglePanModeFromHook(value, {
            cancelPendingElement,
            setSelectedComponent,
            toggleToolbar: setShowMobileToolbarPanel,
        })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setTwoJSInstanceInBoard = (two: any) => {
        twoJSInstanceRef.current = two
        setTwoJSInstance(two)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setZuiInstanceInBoard = (zuiInst: any) => {
        zuiInBoardRef.current = zuiInst
        setZuiInBoard(zuiInst)
    }

    const setSelectedComponentInBoard = (shape: unknown) => {
        setSelectedComponent(shape ?? null)
    }

    // Creates a board in the background on first interaction (non-blocking).
    // Stores the server board ID in state + ref + localStorage for later use.
    const ensureBackgroundBoard = async () => {
        if (isPersistedRef.current) return
        if (backgroundBoardIdRef.current) return
        if (boardCreationInFlightRef.current) return

        boardCreationInFlightRef.current = true
        try {
            const userId = localStorage.getItem('userId')
            const { data: boardData } = await createBoard({
                variables: { object: {} },
            })
            const newBoardId = boardData?.board?.id
            if (!newBoardId) return
            backgroundBoardIdRef.current = newBoardId
            setBackgroundBoardId(newBoardId)
            localStorage.setItem(BACKGROUND_BOARD_STORAGE_KEY, newBoardId)
        } catch (e) {
            console.error('Background board creation failed:', e)
        } finally {
            boardCreationInFlightRef.current = false
        }
    }

    // Gently fades + lifts the welcome-sketch elements out, then clears them
    // from the store, on the user's first real interaction. The exit tween runs
    // node-direct via the same primitive as the soft-land entrance (and
    // supersedes it if still in flight); the store sweep is gated on the tween
    // finishing so elements aren't yanked mid-fade. Guarded so a burst of first
    // adds only triggers one dismissal.
    const dismissWelcomeSketch = (): void => {
        if (welcomeDismissInFlightRef.current) return
        const welcomeIds = Object.keys(
            stateRefForComponentStore.current
        ).filter((id) =>
            isWelcomeComponent(stateRefForComponentStore.current[id])
        )
        if (welcomeIds.length === 0) return

        welcomeDismissInFlightRef.current = true
        localStorage.setItem(WELCOME_DISMISSED_KEY, '1')

        const sweepStore = (): void => {
            const two = twoJSInstanceRef.current
            const next = { ...stateRefForComponentStore.current }
            welcomeIds.forEach((id) => {
                delete next[id]
                // The exit tween only fades opacity to 0; the node stays in the
                // Two.js scene and remains hit-testable. Remove it outright so a
                // dismissed welcome element (e.g. the "Drag me" rect) can't be
                // clicked after the user draws. The element's React wrapper never
                // unmounts, so nothing else removes it from the scene.
                if (two) {
                    const el = two.scene.children.find(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (child: any) => child?.elementData?.id === id
                    )
                    if (el) two.remove(el)
                }
                window.dispatchEvent(
                    new CustomEvent('elementRemoved', { detail: { id } })
                )
            })
            stateRefForComponentStore.current = next
            setComponentStore(next)
            if (two) {
                try {
                    two.update()
                } catch {
                    // See CLAUDE.md "Two.js scene.subtractions Pitfall": if the
                    // render throws, the bad subtraction stays queued and every
                    // later two.update() repeats the crash. Clear it so the
                    // canvas keeps rendering.
                    two.scene.subtractions.length = 0
                    two.scene._flagSubtractions = false
                }
            }
        }

        playWelcomeSketchExit(twoJSInstanceRef.current, welcomeIds, sweepStore)
    }

    // Records ADD action, updates store and syncs to DB
    const addToLocalComponentStore = (
        id: string,
        type: string,
        componentInfo: ComponentRecord,
        skipHistory: boolean = false
    ) => {
        // groupobject is a transient visual construct and must never be persisted
        if (
            type === GROUP_COMPONENT ||
            componentInfo?.componentType === GROUP_COMPONENT
        ) {
            return
        }

        // Strip transient grouping coords — not part of DB schema
        const {
            relativeX: _rX,
            relativeY: _rY,
            ...safeInfo
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } = (componentInfo ?? {}) as any

        // Assign a z-order position so the element renders deterministically
        // (and survives a refresh). New elements go on top: max(position)+1.
        // Computed from the synchronous ref — not `componentStore` state —
        // so back-to-back adds (rapid drawing, multi-paste) get increasing
        // positions instead of colliding. A pre-set position is preserved so
        // undo-of-delete and clipboard paste keep their original stacking.
        if (safeInfo.position == null) {
            const maxPos = Object.values(
                stateRefForComponentStore.current
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ).reduce((m: number, c: any) => {
                const p = c?.position
                return Number.isFinite(p) ? Math.max(m, p) : m
            }, 0)
            safeInfo.position = maxPos + 1
        }

        // User's first real element dismisses the onboarding sketch. Welcome
        // elements are seeded via setComponentStore directly (never through
        // this path), so any add here is by definition "real" user content.
        if (!isWelcomeComponent(safeInfo as ComponentRecord)) {
            dismissWelcomeSketch()
        }

        // Trigger background board creation on first interaction
        ensureBackgroundBoard()

        if (!skipHistory) {
            recordToHistoryLog({
                action: 'ADD',
                id,
                componentInfo: safeInfo,
            })
        }

        const updatedComponentStore = {
            ...stateRefForComponentStore.current,
            [id]: safeInfo,
        }
        stateRefForComponentStore.current = updatedComponentStore
        setComponentStore(updatedComponentStore)

        if (isPersistedRef.current && safeInfo) {
            insertComponent({ variables: { object: safeInfo } }).catch(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (error: any) => {
                    const isPermissionError = error.graphQLErrors?.some(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (e: any) => e.extensions?.code === 'permission-error'
                    )
                    if (isPermissionError) {
                        undoLastAction()
                        setShowPermissionErrorModal(true)
                    }
                }
            )
        }
    }

    // Builds a text-element shapeData object using the dynamic defaults
    // returned by GET_COMPONENT_TYPES (so dblclick/T-key paths produce the
    // exact same shape the sidebar Text button does).
    const buildTextShapeData = (
        id: string,
        x: number,
        y: number,
        // 'newText' is the standard whiteboard text; 'geoText' is the
        // zoom-resistant map variant (counter-scales like a point pin).
        componentType: 'newText' | 'geoText' = 'newText'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): any | null => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let typeItem: any = null
        if (getComponentTypesData) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            getComponentTypesData.componentTypes.forEach((item: any) => {
                if (item.label === 'text') typeItem = item
            })
        }
        // Fallback when the Hasura catalog isn't reachable — keeps text
        // creation working when craftbase runs standalone as a library.
        if (!typeItem) {
            typeItem = {
                width: 120,
                height: 36,
                fill: 'transparent',
                textColor: '#3A342C',
                metadata: {},
            }
        }
        const userId = localStorage.getItem('userId')
        const sizesMap = isMobile ? MOBILE_TEXT_SIZES_OBJECT : TEXT_SIZES_OBJECT
        const fontSizePx =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (sizesMap as any)[defaultTextSize] ?? typeItem.metadata?.fontSize
        return {
            id,
            componentType,
            // geoText is anchored to the map, so flag it geo (mirrors point/
            // area/route) and seed the counter-scale resist it reads on mount.
            ...(componentType === 'geoText' && { objectClass: 'geo' }),
            linewidth: defaultLinewidth,
            strokeType: defaultStrokeType,
            children: {},
            metadata: {
                ...(typeItem.metadata || {}),
                ...(fontSizePx !== undefined && { fontSize: fontSizePx }),
                ...(defaultTextFontFamily && {
                    textFontFamily: defaultTextFontFamily,
                }),
                ...(componentType === 'geoText' && {
                    resist: DEFAULT_GEO_RESIST,
                }),
                opacity: 1,
            },
            x: Math.trunc(x),
            y: Math.trunc(y),
            x2: 0,
            boardId: boardId,
            width: typeItem.width,
            height: typeItem.height,
            fill: typeItem.fill,
            textColor: defaultTextColor ?? typeItem.textColor,
            updatedBy: userId,
        }
    }

    // One-shot text-draw mode: cursor → crosshair, next mousedown on canvas
    // places the pending text element via SCENARIO_TEXT_DRAW in newCanvas.js.
    const enableTextDrawMode = (
        componentType: 'newText' | 'geoText' = 'newText'
    ) => {
        togglePencilMode(false)
        togglePointer(false)
        const id = generateUUID()
        const shapeData = buildTextShapeData(id, -9999, -9999, componentType)
        if (!shapeData) return
        updateLastAddedElement(shapeData)
        setRootCursor('crosshair')
        localStorage.setItem(TEXT_DRAW_MODE_KEY, 'true')
        localStorage.setItem(LAST_ADDED_ELEMENT_ID_KEY, id)
        setTextDrawModeInBoard(true)
        addToLocalComponentStore(id, componentType, shapeData)
    }

    // Place a text element at the given surface coords and immediately open
    // the editing textarea. We can't dispatch triggerTextInput on a fixed
    // timer — the NewText component is lazy-loaded, so on first use the
    // listener may not be registered for several hundred ms. Poll the Two.js
    // scene for the element instead, then dispatch once it's mounted.
    const createTextAtSurface = (x: number, y: number) => {
        const id = generateUUID()
        const shapeData = buildTextShapeData(id, x, y)
        if (!shapeData) return
        addToLocalComponentStore(id, 'newText', shapeData)
        const two = twoJSInstanceRef.current
        if (!two) return
        pollUntilElement(two, id, () => {
            window.dispatchEvent(
                new CustomEvent('triggerTextInput', {
                    detail: { elementId: id },
                })
            )
        })
    }

    // Snapshots only the properties being changed before applying bulk updates
    const updateComponentBulkPropertiesInLocalStore = (
        id: string,
        bulkObj: Partial<ComponentRecord>,
        skipHistory: boolean = false,
        syncDefaults: boolean = false
    ) => {
        const userId = localStorage.getItem('userId')

        if (!skipHistory) {
            // Snapshot only the properties that bulkObj will overwrite
            const currentComponent = stateRefForComponentStore.current[id]
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prevProps: Record<string, any> = {}
            Object.keys(bulkObj).forEach((key) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const val = (currentComponent as any)?.[key]
                if (val !== undefined) {
                    prevProps[key] = val
                }
            })

            recordToHistoryLog({
                action: 'UPDATE_BULK',
                id,
                prevProps,
                bulkObj,
                syncDefaults,
            })
        }

        const updatedComponentStore = { ...stateRefForComponentStore.current }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const merged: any = {
            ...updatedComponentStore[id],
            ...bulkObj,
            updatedBy: userId,
        }
        delete merged.relativeX
        delete merged.relativeY
        updatedComponentStore[id] = merged
        stateRefForComponentStore.current = updatedComponentStore
        setComponentStore(updatedComponentStore)

        if (isPersistedRef.current) {
            updateComponentInfo({
                variables: {
                    id: id,
                    updateObj: {
                        ...bulkObj,
                        updatedBy: userId,
                    },
                },
            })
        }
    }

    // Snapshots current x,y before updating position, then updates store and DB
    const updateComponentVerticesInLocalStore = (
        id: string,
        x: number,
        y: number
    ) => {
        const userId = localStorage.getItem('userId')

        recordToHistoryLog({
            action: 'UPDATE_VERTICES',
            id,
            prevX: stateRefForComponentStore.current[id]?.x ?? 0,
            prevY: stateRefForComponentStore.current[id]?.y ?? 0,
        })

        const updatedComponentStore = { ...stateRefForComponentStore.current }
        updatedComponentStore[id] = {
            ...updatedComponentStore[id],
            x: Math.trunc(x),
            y: Math.trunc(y),
            updatedBy: userId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any
        stateRefForComponentStore.current = updatedComponentStore
        setComponentStore(updatedComponentStore)

        if (isPersistedRef.current) {
            updateComponentInfo({
                variables: {
                    id: id,
                    updateObj: {
                        x: Math.trunc(x),
                        y: Math.trunc(y),
                        updatedBy: userId,
                    },
                },
            })
        }
    }

    const deleteBulkComponentsFromLocalStore = (ids: string[]) => {
        ensureBackgroundBoard()

        const batchEntries: HistoryEntry[] = ids.map((id) => ({
            action: 'DELETE',
            id,
            prevState: {
                ...stateRefForComponentStore.current[id],
            } as ComponentRecord,
        }))
        recordBatchToHistoryLog(batchEntries)

        const updatedComponentStore = { ...stateRefForComponentStore.current }
        ids.forEach((id) => {
            delete updatedComponentStore[id]
            window.dispatchEvent(
                new CustomEvent('elementRemoved', { detail: { id } })
            )
        })
        stateRefForComponentStore.current = updatedComponentStore
        setComponentStore(updatedComponentStore)

        if (isPersistedRef.current && ids.length > 0) {
            deleteBulkComponents({ variables: { _in: ids } })
        }
    }

    // Snapshots full component state before deletion, then removes from store and DB
    const deleteComponentFromLocalStore = (id: string) => {
        ensureBackgroundBoard()

        recordToHistoryLog({
            action: 'DELETE',
            id,
            prevState: {
                ...stateRefForComponentStore.current[id],
            } as ComponentRecord,
        })

        const updatedComponentStore = { ...stateRefForComponentStore.current }
        delete updatedComponentStore[id]
        stateRefForComponentStore.current = updatedComponentStore
        setComponentStore(updatedComponentStore)

        // Tell Canvas to untrack this id so a future restore (undo) gets a fresh wrapper
        window.dispatchEvent(
            new CustomEvent('elementRemoved', { detail: { id } })
        )

        if (isPersistedRef.current) {
            deleteComponent({
                variables: { id },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                errorPolicy: import.meta.env.VITE_GRAPHQL_ERROR_POLICY as any,
            })
        }
    }

    const setCurrentElementInBoard = (val: string | null) => {
        setCurrentElement(val)
    }

    const onCreateBoard = () => {
        const userId = localStorage.getItem('userId')
        createBoard({
            variables: {
                object: {},
            },
        })
    }

    const persistBoard = async (): Promise<string> => {
        // Always create a fresh board at share time. The background board
        // pre-created by ensureBackgroundBoard may be stale (e.g. DB was reset
        // between sessions) — using its ID would cause a FK violation on insert.
        const { data: boardData } = await createBoard({
            variables: { object: {} },
        })
        const serverBoardId = boardData?.board?.id
        if (!serverBoardId) throw new Error('createBoard returned no id')

        // Insert all components to DB under the server board ID.
        // Generate a fresh UUID for each component's id so re-sharing from '/'
        // never hits a "duplicate key" uniqueness violation.
        const allEntries = Object.entries(stateRefForComponentStore.current)
        const componentsForDB = allEntries
            // Skip corrupt/partial store entries (no componentType). These come
            // from undo/redo restore paths and would abort the whole bulk
            // insert with a NOT NULL violation on componentType.
            .filter(([, comp]) => (comp as ComponentRecord)?.componentType)
            // Welcome-sketch seeds are onboarding scaffolding — never share them.
            .filter(([, comp]) => !isWelcomeComponent(comp as ComponentRecord))
            .map(([, comp]) => {
                const {
                    relativeX: _rX,
                    relativeY: _rY,
                    ...cleaned
                } = stripTypename(comp)
                return {
                    ...cleaned,
                    id: generateUUID(),
                    boardId: serverBoardId,
                }
            })

        const skipped = allEntries.filter(
            ([, comp]) => !(comp as ComponentRecord)?.componentType
        )
        if (skipped.length > 0) {
            console.warn(
                '[persistBoard] skipped',
                skipped.length,
                'malformed component(s) with no componentType:',
                Object.fromEntries(skipped)
            )
        }

        if (componentsForDB.length > 0) {
            await insertBulkComponents({
                variables: { objects: componentsForDB },
            })
        }

        // Mint a new local board ID so the '/' session continues independently
        // from the now-shared board. Components keep their visual state; only the
        // local identity rotates.
        const newLocalId = generateUUID()

        const updatedStore: ComponentStore = {}
        Object.entries(stateRefForComponentStore.current).forEach(
            ([id, comp]) => {
                updatedStore[id] = { ...comp, boardId: newLocalId }
            }
        )
        stateRefForComponentStore.current = updatedStore

        // Rotate localBoardId without wiping the Two.js scene or componentStore
        skipComponentStoreResetRef.current = true
        setLocalBoardId(newLocalId)
        setComponentStore(updatedStore)

        // Persist draft immediately under the new local ID
        try {
            localStorage.setItem(
                DRAFT_STORAGE_KEY,
                JSON.stringify({
                    boardId: newLocalId,
                    components: updatedStore,
                    timestamp: Date.now(),
                })
            )
        } catch (_) {}

        // Clear the background board (its work is now on the shared board)
        backgroundBoardIdRef.current = null
        setBackgroundBoardId(null)
        localStorage.removeItem(BACKGROUND_BOARD_STORAGE_KEY)
        localStorage.setItem('lastOpenBoard', serverBoardId)

        // Stay in local (non-persisted) mode — new drawings on '/' are a fresh session
        return serverBoardId
    }

    // Assign storage-limit handler ref so useLocalDraftPersistence can call it
    // without a direct dependency on persistBoard being defined at hook-call time.
    onStorageLimitRef.current = async () => {
        try {
            const serverBoardId = await persistBoard()
            setStorageLimitBoardUrl(
                `${window.location.origin}/board/${serverBoardId}`
            )
            setShowStorageLimitModal(true)
        } catch (e) {
            console.error('Failed to auto-persist board on storage limit:', e)
        }
    }

    const clearBoard = () => {
        if (isPersisted) {
            const ids = Object.keys(componentStore)
            if (ids.length > 0) {
                deleteBulkComponents({ variables: { _in: ids } })
            }
        }
        // Tear down any active selection before scene clear so the
        // selectionController doesn't hold stale group/shape refs that
        // suppress the next selection's UI.
        window.dispatchEvent(new Event('clearSelector'))
        setSelectedComponent(null)
        twoJSInstanceRef.current?.clear()
        twoJSInstanceRef.current?.update()
        setComponentStore({})
        clearHistory(isPersisted)
        // Reset element defaults to factory values so a previously-set default
        // (e.g. linewidth:0) doesn't leak into shapes drawn after clearing.
        resetDefaults()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sel: any = selectedComponent
    const isArrowSelected =
        selectedComponent !== null &&
        (sel?.shape?.type === 'arrowLine' ||
            sel?.group?.data?.elementData?.isLineCircle === true)

    // Mirror text-property changes to a live editing textarea so the overlay
    // visually matches what Two.js will render on blur. No-op when no
    // textarea is open. fontSize is in surface units; we scale to screen
    // pixels using the current scene zoom.
    const syncOpenTextarea = ({
        fontSize,
        fontFamily,
    }: {
        fontSize?: number
        fontFamily?: string
    }) => {
        const ta = document.querySelector<HTMLElement>('.temp-input-area')
        if (!ta) return
        const sceneScale = twoJSInstance?.scene?.scale || 1
        if (typeof fontSize === 'number') {
            const cssFontSize = fontSize * sceneScale
            const lineH = Math.ceil(cssFontSize * 1.6)
            ta.style.fontSize = `${cssFontSize}px`
            ta.style.lineHeight = `${lineH}px`
        }
        if (fontFamily) {
            ta.style.fontFamily = fontFamily
        }
    }

    const handleTextSizeChange = (newLabel: string) => {
        const sizesMap = isMobile ? MOBILE_TEXT_SIZES_OBJECT : TEXT_SIZES_OBJECT
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const textSize = (sizesMap as any)[newLabel]
        const twoText = sel?.shape?.data
        if (!twoText) return
        // Standalone multiline text is a stack of Two.Text line nodes (line 1
        // is `twoText`, lines 2..N are satellites in the same group). Size
        // EVERY node and re-stack the block at the new line height — sizing
        // only line 1 left the rest unchanged until a reload.
        const sizeNodes = getShapeTextNodes(sel?.group?.data)
        const nodes = sizeNodes.length > 0 ? sizeNodes : [twoText]
        const n = nodes.length
        const lineH = lineHeightFor(textSize)
        nodes.forEach((node, i) => {
            node.size = textSize
            node.leading = textSize
            node.translation.set(0, (i - (n - 1) / 2) * lineH)
        })
        const componentId = sel?.group?.data?.elementData?.id
        const existingMetadata =
            sel?.group?.data?.elementData?.metadata ?? {}
        const updatedMetadata = {
            ...existingMetadata,
            fontSize: textSize,
            // Reconstruct the raw multiline string from every line node,
            // not just line 1 — otherwise a reload would drop lines 2..N.
            content: nodes.map((node) => node.value).join('\n'),
        }
        // Keep the in-place elementData.metadata current too. Other property
        // handlers (e.g. opacity in applyProperty) read it as the merge base; if
        // left stale they'd write the OLD fontSize back to the store and the
        // resize would silently revert on reload.
        if (sel?.group?.data?.elementData) {
            sel.group.data.elementData.metadata = updatedMetadata
        }
        updateComponentBulkPropertiesInLocalStore(componentId, {
            metadata: updatedMetadata,
        })
        twoJSInstance?.update()
        syncOpenTextarea({ fontSize: textSize })
    }

    // After a text style change (size/family) on a shape-with-text, re-wrap
    // the text to the shape's current width at the NEW style and grow the
    // shape's height to fit the resulting line count — then persist height +
    // metadata together. This keeps the live scene and a post-reload render
    // identical (a bigger font re-wraps to more lines and the box grows
    // vertically, instead of the text spilling out). Width stays user-driven.
    const reflowShapeTextAfterStyleChange = (
        componentId: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updatedMetadata: any
    ) => {
        const group = sel?.group?.data
        const shapePath = sel?.shape?.data
        const kind = group?.elementData?.componentType
        // While the inline editor is open the text layer is hidden and the
        // blur path owns the reflow+persist — don't fight it; just persist
        // the metadata so the editor reads the latest style.
        const editingActive = !!document.querySelector('.temp-input-area')
        if (editingActive || !group || !shapePath || !kind) {
            updateComponentBulkPropertiesInLocalStore(componentId, {
                metadata: updatedMetadata,
            })
            return
        }

        const rawText =
            typeof updatedMetadata.textContent === 'string'
                ? updatedMetadata.textContent
                : ''
        const width = shapePath.width
        // Re-render the wrapped multiline layer at the new style.
        applyShapeText(twoJSInstance, group, kind, width, updatedMetadata)
        const { font } = shapeTextStyleFromMeta(updatedMetadata)
        const { requiredHeight } = reflowTextForShape(
            kind,
            width,
            rawText,
            font
        )
        const newH = Math.max(shapePath.height, requiredHeight)
        if (newH !== shapePath.height) shapePath.height = newH
        twoJSInstance?.update()
        updateComponentBulkPropertiesInLocalStore(componentId, {
            metadata: updatedMetadata,
            width: Math.round(width),
            height: Math.round(newH),
        })
    }

    const handleRectangleTextSizeChange = (newLabel: string) => {
        const sizesMap = isMobile ? MOBILE_TEXT_SIZES_OBJECT : TEXT_SIZES_OBJECT
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const textSize = (sizesMap as any)[newLabel]
        const twoText = sel?.text?.data
        if (!twoText) return
        // Size every line node in the text layer (not just the first), so
        // multiline updates live — not only after a reload.
        const sizeNodes = getShapeTextNodes(sel?.group?.data)
        ;(sizeNodes.length > 0 ? sizeNodes : [twoText]).forEach(
            (n) => (n.size = textSize)
        )
        twoJSInstance?.update()

        const componentId = sel?.group?.data?.elementData?.id
        // stateRefForComponentStore is always current; group.elementData.metadata
        // is only set at mount and is stale after blur updates the store.
        const existingMetadata =
            stateRefForComponentStore.current[componentId]?.metadata ?? {}
        const updatedMetadata = { ...existingMetadata, textFontSize: textSize }
        if (sel?.group?.data?.elementData) {
            sel.group.data.elementData.metadata = updatedMetadata
        }

        reflowShapeTextAfterStyleChange(componentId, updatedMetadata)
        syncOpenTextarea({ fontSize: textSize })
    }

    const handleTextFontFamilyChange = (fontFamily: string) => {
        const twoText = sel?.shape?.data
        if (!twoText) return
        // Apply to every line node (line 1 + satellites), not just line 1,
        // so multiline standalone text updates live. Family doesn't change
        // line height, so no re-stack is needed.
        const familyNodes = getShapeTextNodes(sel?.group?.data)
        const nodes = familyNodes.length > 0 ? familyNodes : [twoText]
        nodes.forEach((node) => (node.family = fontFamily))
        const componentId = sel?.group?.data?.elementData?.id
        const existingMetadata =
            sel?.group?.data?.elementData?.metadata ?? {}
        const updatedMetadata = {
            ...existingMetadata,
            textFontFamily: fontFamily,
            // Reconstruct the raw multiline string from every line node,
            // not just line 1 — otherwise a reload would drop lines 2..N.
            content: nodes.map((node) => node.value).join('\n'),
        }
        // Keep in-place elementData.metadata current so later handlers (opacity,
        // etc.) merge onto the new family instead of writing a stale one back.
        if (sel?.group?.data?.elementData) {
            sel.group.data.elementData.metadata = updatedMetadata
        }
        updateComponentBulkPropertiesInLocalStore(componentId, {
            metadata: updatedMetadata,
        })
        twoJSInstance?.update()
        syncOpenTextarea({ fontFamily })
        // Make selection universal: future new elements pick up this family.
        setDefaultTextFontFamily(fontFamily)
    }

    const handleRectangleTextFontFamilyChange = (fontFamily: string) => {
        const twoText = sel?.text?.data
        if (!twoText) return
        // Apply to every line node so multiline text updates live.
        const familyNodes = getShapeTextNodes(sel?.group?.data)
        ;(familyNodes.length > 0 ? familyNodes : [twoText]).forEach(
            (n) => (n.family = fontFamily)
        )
        twoJSInstance?.update()
        const componentId = sel?.group?.data?.elementData?.id
        const existingMetadata =
            stateRefForComponentStore.current[componentId]?.metadata ?? {}
        const updatedMetadata = {
            ...existingMetadata,
            textFontFamily: fontFamily,
        }
        if (sel?.group?.data?.elementData) {
            sel.group.data.elementData.metadata = updatedMetadata
        }
        // Re-wrap + grow height: some families (e.g. Fraunces) render wider
        // than Caveat at the same size, changing the wrap.
        reflowShapeTextAfterStyleChange(componentId, updatedMetadata)
        syncOpenTextarea({ fontFamily })
        // Make selection universal: future new elements pick up this family.
        setDefaultTextFontFamily(fontFamily)
    }

    const cancelPendingElement = () => {
        const pendingId = localStorage.getItem(LAST_ADDED_ELEMENT_ID_KEY)
        if (pendingId) {
            undoLastAction()
            setLastAddedElement(null)
        }
        localStorage.removeItem(LAST_ADDED_ELEMENT_ID_KEY)
        localStorage.removeItem(ARROW_DRAW_MODE_KEY)
        localStorage.removeItem(TEXT_DRAW_MODE_KEY)
        localStorage.removeItem(PENDING_SHAPE_TYPE_KEY)
        localStorage.removeItem(PENDING_SHAPE_PROPS_KEY)
        // Abort any in-progress geo draw (multi-click area/route, point place)
        // and tell the canvas to drop its preview vertices.
        localStorage.removeItem(GEO_DRAW_MODE_KEY)
        localStorage.removeItem(GEO_DRAW_TYPE_KEY)
        localStorage.removeItem(GEO_DRAW_PROPS_KEY)
        localStorage.removeItem(GEO_POINT_PLACE_MODE_KEY)
        window.dispatchEvent(new CustomEvent('cancelGeoDraw', {}))
        setIsArrowDrawMode(false)
        setIsTextDrawMode(false)
        // Detach selectionController so its hover listener stops overriding the cursor
        window.dispatchEvent(new CustomEvent('clearSelector', {}))
    }

    // Track which group (if any) is currently focused on the canvas. groupobject
    // dispatches groupFocused/groupBlurred on the window — this mirrors them
    // into React state so the sidebar can react. Independent of newCanvas.js's
    // own activeGroupRef listeners, which serve event-handler land.
    useEffect(() => {
        const onFocus = ((e: CustomEvent) => {
            const g = e?.detail?.group ?? null
            selectedGroupRef.current = g
            setSelectedGroup(g)
        }) as EventListener
        const onBlur = () => {
            selectedGroupRef.current = null
            setSelectedGroup(null)
        }
        window.addEventListener('groupFocused', onFocus)
        window.addEventListener('groupBlurred', onBlur)
        return () => {
            window.removeEventListener('groupFocused', onFocus)
            window.removeEventListener('groupBlurred', onBlur)
        }
    }, [])

    const applyGroupProperty = createApplyGroupProperty({
        selectedGroup,
        twoJSInstance,
        updateComponentBulkPropertiesInLocalStore,
        stateRefForComponentStore,
        recordBatchToHistoryLog,
    })

    const applyProperty = createApplyProperty({
        selectedComponent,
        twoJSInstance,
        updateComponentBulkPropertiesInLocalStore,
        updateBulkPropsForRectangleWithText: (id, obj) =>
            updateBulkPropsForRectangleWithText(id, obj),
        handleTextSizeChange: (value: unknown) =>
            handleTextSizeChange(value as string),
        handleRectangleTextSizeChange: (value: unknown) =>
            handleRectangleTextSizeChange(value as string),
        handleTextFontFamilyChange: (value: unknown) =>
            handleTextFontFamilyChange(value as string),
        handleRectangleTextFontFamilyChange: (value: unknown) =>
            handleRectangleTextFontFamilyChange(value as string),
        setDefaultFill,
        setDefaultStrokeColor,
        setDefaultLinewidth,
        setDefaultStrokeType,
        setDefaultOpacity,
        setDefaultTextColor,
        setDefaultTextSize: (value: string) =>
            setDefaultTextSize(value as never),
        setDefaultTextFontFamily,
    })

    const updateBulkPropsForRectangleWithText = (
        id: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        obj: any
    ) => {
        let finalObj = { ...obj }
        if (obj.textColor !== undefined) {
            const existingMeta =
                stateRefForComponentStore.current[id]?.metadata ?? {}
            const updatedMeta = { ...existingMeta, textFill: obj.textColor }
            finalObj.metadata = updatedMeta
            if (sel?.group?.data?.elementData) {
                sel.group.data.elementData.metadata = updatedMeta
            }
        }
        updateComponentBulkPropertiesInLocalStore(id, finalObj)
    }

    const contextValueForSidebar = {
        scaleToDisplay: props.scaleToDisplay,
        geoObjectsEnabled: props.geoObjectsEnabled,
        pointClusteringEnabled: props.pointClusteringEnabled,
        clusterPoints: props.clusterPoints,
        boardId,
        isPersisted,
        persistBoard,
        backgroundBoardId,
        isPencilMode,
        isArrowDrawMode,
        isTextDrawMode,
        isArrowSelected,
        isRubberMode,
        isPanMode,
        togglePanMode,
        setArrowDrawModeInBoard,
        setTextDrawModeInBoard,
        setRubberModeInBoard,
        cancelPendingElement,
        togglePencilMode,
        togglePointer,
        updateLastAddedElement,
        addToLocalComponentStore,
        enableTextDrawMode,
        createTextAtSurface,
        updateComponentVerticesInLocalStore,
        updateComponentBulkPropertiesInLocalStore,
        // Exposed so groupobject's blur path can snapshot prevProps for a
        // single batched history entry instead of one per child.
        stateRefForComponentStore,
        deleteComponentFromLocalStore,
        deleteBulkComponentsFromLocalStore,
        twoJSInstance,
        setTwoJSInstanceInBoard,
        setZuiInstanceInBoard,
        zuiInBoard,
        selectedComponent,
        setSelectedComponentInBoard,
        applyProperty,
        selectedGroup,
        applyGroupProperty,
        reorderSelected,
        // Defaults — read by ElementPropertiesToolbar, also still exposed
        // individually so legacy primary.js / Canvas reads keep working.
        defaultFill,
        defaultStrokeColor,
        defaultLinewidth,
        defaultStrokeType,
        defaultOpacity,
        defaultTextColor,
        defaultTextSize,
        defaultTextFontFamily,
        // Legacy named setters kept for primary sidebar / shape factory paths.
        setDefaultLinewidthInBoard,
        setDefaultStrokeTypeInBoard,
        // Mobile panel
        showMobileToolbarPanel,
        setShowMobileToolbarPanel,
        currentElement,
        setCurrentElementInBoard,
        onCreateBoard,
        createBoardLoading,
        historyLog,
        historyLogRef,
        bucketLog,
        bucketLogRef,
        recordBatchToHistoryLog,
        undoLastAction,
        redoLastAction,
        clearBoard,
    }

    return (
        <>
            <BoardContext.Provider
                value={contextValueForSidebar as unknown as BoardContextValue}
            >
                <div>
                    <Sidebar />
                    {!isRubberMode && isMobile && (
                        <button
                            title="Element properties"
                            onClick={() =>
                                setShowMobileToolbarPanel((prev) => !prev)
                            }
                            style={{
                                position: 'fixed',
                                bottom: '16px',
                                right: '10px',
                                zIndex: 20,
                            }}
                            className={`w-10 h-10 rounded-lg shadow-card flex items-center justify-center transition-colors duration-150 ${
                                showMobileToolbarPanel
                                    ? 'bg-accent'
                                    : 'bg-accent-dark'
                            }`}
                        >
                            <img
                                src={controlsIcon}
                                className="w-5 h-5"
                                alt="Element properties"
                            />
                        </button>
                    )}
                    <ElementPropertiesToolbar />
                    <Canvas
                        pointerToggle={pointerToggle}
                        isPencilMode={isPencilMode}
                        selectPanMode={false}
                        boardId={boardId}
                        selectedComponent={selectedComponent}
                        lastAddedElement={lastAddedElement}
                        componentStore={componentStore}
                        defaultLinewidth={defaultLinewidth}
                        defaultStrokeType={defaultStrokeType}
                        defaultStrokeColor={defaultStrokeColor}
                        defaultTextSize={
                            (isMobile
                                ? MOBILE_TEXT_SIZES_OBJECT
                                : TEXT_SIZES_OBJECT)[defaultTextSize] ??
                            DEFAULT_TEXT_SIZE
                        }
                        onCameraChange={props.onCameraChange}
                        renderBackground={props.renderBackground}
                        reorderSelectedRef={reorderSelectedRef}
                    />
                    <PointTooltip />
                    <ClusterLayer />
                    {!isMobile && <ZoomControls />}
                </div>
            </BoardContext.Provider>
            {/* {isMobile ? (
                <div>
                    <div className="px-4 py-4 text-xl ">
                        The mobile version isn't here yet. Please view Craftbase
                        on your tablet or desktop (or on bigger screens) in the
                        meantime.
                    </div>
                </div>
            ) : null} */}
            <PermissionErrorModal
                open={showPermissionErrorModal}
                onClose={() => setShowPermissionErrorModal(false)}
            />
            <StorageLimitModal
                open={showStorageLimitModal}
                onClose={() => setShowStorageLimitModal(false)}
                boardUrl={storageLimitBoardUrl}
                onStartNew={handleStartNewCanvas}
                onContinue={handleContinueOnSavedBoard}
            />
        </>
    )
}

export default BoardViewPage
