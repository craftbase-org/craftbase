import React, {
    useState,
    useEffect,
    useRef,
    useContext,
    createContext,
} from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { useParams, useNavigate } from 'react-router-dom'
import { useMediaQueryUtils } from 'constants/exportHooks'
import {
    GET_COMPONENTS_FOR_BOARD_QUERY,
    GET_COMPONENT_TYPES,
} from 'schema/queries'
import {
    UPDATE_USER_REVISIT_COUNT,
    INSERT_COMPONENT,
    INSERT_BULK_COMPONENTS,
    DELETE_COMPONENT_BY_ID,
    DELETE_BULK_COMPONENTS,
    UPDATE_COMPONENT_INFO,
    CREATE_BOARD,
} from 'schema/mutations'
import Canvas from '../../newCanvas'
import ZoomControls from 'components/ZoomControls'
import Sidebar from 'components/sidebar/primary'
import ElementPropertiesToolbar from 'components/sidebar/elementProperties'
import controlsIcon from 'assets/controls.svg'
import Spinner from 'components/common/spinnerWithSize'
import PermissionErrorModal from 'components/modals/PermissionErrorModal'
import StorageLimitModal from 'components/modals/StorageLimitModal'
import { generateUUID } from 'utils/misc'
import { pollUntilElement } from 'utils/canvasUtils'
import { TEXT_SIZES_OBJECT, MOBILE_TEXT_SIZES_OBJECT } from 'utils/constants'
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
} from 'constants/misc'
import { useDrawingModes } from 'hooks/useDrawingModes'
import { useElementDefaults } from 'hooks/useElementDefaults'
import { useMobileToolbarPanels } from 'hooks/useMobileToolbarPanels'
import { useLocalDraftPersistence } from 'hooks/useLocalDraftPersistence'
import { useComponentHistory } from 'hooks/useComponentHistory'
import { createApplyProperty } from 'utils/applyProperty'
import { createApplyGroupProperty } from 'utils/applyGroupProperty'

export const BoardContext = createContext()

// Strips __typename fields injected by Apollo before sending data back to Hasura
function stripTypename(obj) {
    if (Array.isArray(obj)) return obj.map(stripTypename)
    if (obj && typeof obj === 'object') {
        const { __typename, ...rest } = obj
        return Object.fromEntries(
            Object.entries(rest).map(([k, v]) => [k, stripTypename(v)])
        )
    }
    return obj
}

const BoardViewPage = (props) => {
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
    const [backgroundBoardId, setBackgroundBoardId] = useState(null)
    const backgroundBoardIdRef = useRef(null)
    const boardCreationInFlightRef = useRef(false)

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

    const navigate = useNavigate()

    const [
        createBoard,
        { loading: createBoardLoading, data: createBoardData },
    ] = useMutation(CREATE_BOARD)

    const [insertBulkComponents] = useMutation(INSERT_BULK_COMPONENTS, {
        ignoreResults: true,
    })

    const [componentStore, setComponentStore] = useState({})
    const [lastAddedElement, setLastAddedElement] = useState(null)
    const [twoJSInstance, setTwoJSInstance] = useState(null)
    const [zuiInBoard, setZuiInBoard] = useState(null)
    const [selectedComponent, setSelectedComponent] = useState(null)
    const [selectedGroup, setSelectedGroup] = useState(null)
    // Mirror of selectedGroup as a ref — useComponentHistory's applyBatch needs
    // to read the currently-focused group at undo/redo time without re-running.
    const selectedGroupRef = useRef(null)
    const [currentElement, setCurrentElement] = useState(null)
    const [showPermissionErrorModal, setShowPermissionErrorModal] =
        useState(false)
    const { isDesktop, isMobile, isLaptop, isTablet } = useMediaQueryUtils()

    const stateRefForComponentStore = useRef()
    const twoJSInstanceRef = useRef(null)
    const zuiInBoardRef = useRef(null)
    const skipComponentStoreResetRef = useRef(false)

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
    } = useElementDefaults()

    const onStorageLimitRef = useRef(null)

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
    useEffect(() => {
        clearDrawModesFromStorage()
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
                    const parsed = JSON.parse(localStorage.getItem(key))
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

    // Update revisit count on every board open, persisted or local
    useEffect(() => {
        const userId = localStorage.getItem('userId')
        if (userId) {
            updateUserRevisit({ variables: { userId } })
        }
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
                let baseComponentStore = { ...componentStore }
                getComponentsForBoardData.components.forEach((item) => {
                    baseComponentStore[item.id] = item
                })
                setComponentStore(baseComponentStore)
            }
        }
    }, [getComponentsForBoardData])

    useEffect(() => {
        isPersistedRef.current = isPersisted
    }, [isPersisted])

    useEffect(() => {
        console.log('change in componentStore in Board', componentStore)
        stateRefForComponentStore.current = componentStore
    }, [componentStore])

    if (isPersisted && getComponentsForBoardLoading) {
        return (
            <>
                <div className="w-full h-full flex items-center justify-center">
                    <Spinner loaderSize="lg" />
                </div>
            </>
        )
    }

    const updateLastAddedElement = (obj) => {
        setLastAddedElement(obj)
        document.getElementById('main-two-root').style.cursor = 'crosshair'
    }

    const togglePointer = (pointerVal) => {
        setPointerToggle(pointerVal)
        setPencilMode(false)
        if (pointerVal) {
            cancelPendingElement()
            setSelectedComponent(null)
            setRubberModeInBoard(false)
            document.getElementById('main-two-root').style.cursor = 'default'
        }
    }

    const togglePencilMode = (value) => {
        setPencilMode(value)
        if (value) {
            cancelPendingElement()
            setRubberModeInBoard(false)
            localStorage.setItem(PENCIL_MODE_KEY, 'TRUE')
            document.getElementById('main-two-root').style.cursor = 'crosshair'
        } else {
            localStorage.removeItem(PENCIL_MODE_KEY)
        }
    }

    const togglePanMode = (value) => {
        togglePanModeFromHook(value, {
            cancelPendingElement,
            setSelectedComponent,
            toggleToolbar: setShowMobileToolbarPanel,
        })
    }

    const setTwoJSInstanceInBoard = (two) => {
        twoJSInstanceRef.current = two
        setTwoJSInstance(two)
    }

    const setZuiInstanceInBoard = (zuiInst) => {
        zuiInBoardRef.current = zuiInst
        setZuiInBoard(zuiInst)
    }

    const setSelectedComponentInBoard = (shape) => {
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
            const newBoardId = boardData.board.id
            backgroundBoardIdRef.current = newBoardId
            setBackgroundBoardId(newBoardId)
            localStorage.setItem(BACKGROUND_BOARD_STORAGE_KEY, newBoardId)
        } catch (e) {
            console.error('Background board creation failed:', e)
        } finally {
            boardCreationInFlightRef.current = false
        }
    }

    // Records ADD action, updates store and syncs to DB
    const addToLocalComponentStore = (
        id,
        type,
        componentInfo,
        skipHistory = false
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
        } = componentInfo ?? {}

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
                (error) => {
                    const isPermissionError = error.graphQLErrors?.some(
                        (e) => e.extensions?.code === 'permission-error'
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
    const buildTextShapeData = (id, x, y) => {
        if (!getComponentTypesData) return null
        let typeItem = null
        getComponentTypesData.componentTypes.forEach((item) => {
            if (item.label === 'text') typeItem = item
        })
        if (!typeItem) return null
        const userId = localStorage.getItem('userId')
        const sizesMap = isMobile ? MOBILE_TEXT_SIZES_OBJECT : TEXT_SIZES_OBJECT
        const fontSizePx =
            sizesMap[defaultTextSize] ?? typeItem.metadata?.fontSize
        return {
            id,
            componentType: 'newText',
            linewidth: defaultLinewidth,
            strokeType: defaultStrokeType,
            children: {},
            metadata: {
                ...(typeItem.metadata || {}),
                ...(fontSizePx !== undefined && { fontSize: fontSizePx }),
                ...(defaultTextFontFamily && {
                    textFontFamily: defaultTextFontFamily,
                }),
                opacity: defaultOpacity ?? 1,
            },
            x: parseInt(x),
            y: parseInt(y),
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
    const enableTextDrawMode = () => {
        togglePencilMode(false)
        togglePointer(false)
        const id = generateUUID()
        const shapeData = buildTextShapeData(id, -9999, -9999)
        if (!shapeData) return
        updateLastAddedElement(shapeData)
        document.getElementById('main-two-root').style.cursor = 'crosshair'
        localStorage.setItem(TEXT_DRAW_MODE_KEY, 'true')
        localStorage.setItem(LAST_ADDED_ELEMENT_ID_KEY, id)
        setTextDrawModeInBoard(true)
        addToLocalComponentStore(id, 'newText', shapeData)
    }

    // Place a text element at the given surface coords and immediately open
    // the editing textarea. We can't dispatch triggerTextInput on a fixed
    // timer — the NewText component is lazy-loaded, so on first use the
    // listener may not be registered for several hundred ms. Poll the Two.js
    // scene for the element instead, then dispatch once it's mounted.
    const createTextAtSurface = (x, y) => {
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
        id,
        bulkObj,
        skipHistory = false,
        syncDefaults = false
    ) => {
        const userId = localStorage.getItem('userId')

        if (!skipHistory) {
            // Snapshot only the properties that bulkObj will overwrite
            const currentComponent = stateRefForComponentStore.current[id]
            const prevProps = {}
            Object.keys(bulkObj).forEach((key) => {
                if (currentComponent?.[key] !== undefined) {
                    prevProps[key] = currentComponent[key]
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
        const merged = {
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
    const updateComponentVerticesInLocalStore = (id, x, y) => {
        const userId = localStorage.getItem('userId')

        recordToHistoryLog({
            action: 'UPDATE_VERTICES',
            id,
            prevX: stateRefForComponentStore.current[id]?.x,
            prevY: stateRefForComponentStore.current[id]?.y,
            x: parseInt(x),
            y: parseInt(y),
        })

        const updatedComponentStore = { ...stateRefForComponentStore.current }
        updatedComponentStore[id] = {
            ...updatedComponentStore[id],
            x: parseInt(x),
            y: parseInt(y),
            updatedBy: userId,
        }
        stateRefForComponentStore.current = updatedComponentStore
        setComponentStore(updatedComponentStore)

        if (isPersistedRef.current) {
            updateComponentInfo({
                variables: {
                    id: id,
                    updateObj: {
                        x: parseInt(x),
                        y: parseInt(y),
                        updatedBy: userId,
                    },
                },
            })
        }
    }

    const deleteBulkComponentsFromLocalStore = (ids) => {
        ensureBackgroundBoard()

        const batchEntries = ids.map((id) => ({
            action: 'DELETE',
            id,
            prevState: { ...stateRefForComponentStore.current[id] },
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
    const deleteComponentFromLocalStore = (id) => {
        ensureBackgroundBoard()

        recordToHistoryLog({
            action: 'DELETE',
            id,
            prevState: { ...stateRefForComponentStore.current[id] },
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
                errorPolicy: import.meta.env.VITE_GRAPHQL_ERROR_POLICY,
            })
        }
    }

    const setCurrentElementInBoard = (val) => {
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

    const persistBoard = async () => {
        // Always create a fresh board at share time. The background board
        // pre-created by ensureBackgroundBoard may be stale (e.g. DB was reset
        // between sessions) — using its ID would cause a FK violation on insert.
        const { data: boardData } = await createBoard({
            variables: { object: {} },
        })
        const serverBoardId = boardData.board.id

        // Insert all components to DB under the server board ID.
        // Generate a fresh UUID for each component's id so re-sharing from '/'
        // never hits a "duplicate key" uniqueness violation.
        const componentsForDB = Object.values(
            stateRefForComponentStore.current
        ).map((comp) => {
            const {
                relativeX: _rX,
                relativeY: _rY,
                ...cleaned
            } = stripTypename(comp)
            return { ...cleaned, id: generateUUID(), boardId: serverBoardId }
        })

        if (componentsForDB.length > 0) {
            await insertBulkComponents({
                variables: { objects: componentsForDB },
            })
        }

        // Mint a new local board ID so the '/' session continues independently
        // from the now-shared board. Components keep their visual state; only the
        // local identity rotates.
        const newLocalId = generateUUID()

        const updatedStore = {}
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
    }

    const isArrowSelected =
        selectedComponent !== null &&
        (selectedComponent?.shape?.type === 'arrowLine' ||
            selectedComponent?.group?.data?.elementData?.isLineCircle === true)

    // Mirror text-property changes to a live editing textarea so the overlay
    // visually matches what Two.js will render on blur. No-op when no
    // textarea is open. fontSize is in surface units; we scale to screen
    // pixels using the current scene zoom.
    const syncOpenTextarea = ({ fontSize, fontFamily }) => {
        const ta = document.querySelector('.temp-input-area')
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

    const handleTextSizeChange = (newLabel) => {
        const sizesMap = isMobile ? MOBILE_TEXT_SIZES_OBJECT : TEXT_SIZES_OBJECT
        const textSize = sizesMap[newLabel]
        const twoText = selectedComponent?.shape?.data
        if (!twoText) return
        twoText.size = textSize
        twoText.leading = textSize
        const componentId = selectedComponent?.group?.data?.elementData?.id
        const existingMetadata =
            selectedComponent?.group?.data?.elementData?.metadata ?? {}
        updateComponentBulkPropertiesInLocalStore(componentId, {
            metadata: {
                ...existingMetadata,
                fontSize: textSize,
                content: twoText.value,
            },
        })
        twoJSInstance?.update()
        syncOpenTextarea({ fontSize: textSize })
    }

    // Schedule a post-render measurement of the text's bounding box and grow
    // the parent rectangle if needed. Called after any property change that
    // affects text dimensions (size, family, etc.).
    const scheduleRectFitToText = (twoText, componentId, updatedMetadata) => {
        // Capture whether text editing is active NOW so the RAF can detect
        // if blur fires between the property change and the next frame.
        const textAreaAtChange = document.querySelector('.temp-input-area')
        requestAnimationFrame(() => {
            // If text editing was active when the property changed but the
            // textarea is now gone, blur already committed the correct
            // metadata (textContent + textFill). Overwriting with the stale
            // snapshot captured here would wipe that out.
            if (
                textAreaAtChange &&
                !document.body.contains(textAreaAtChange)
            )
                return

            twoJSInstance?.update()
            const rectangleShape = selectedComponent?.shape?.data
            const bbox = twoText._renderer?.elem?.getBBox?.()
            if (!rectangleShape || !bbox || bbox.width <= 0) {
                updateComponentBulkPropertiesInLocalStore(componentId, {
                    metadata: updatedMetadata,
                })
                return
            }

            const PAD = 20
            const minW = bbox.width + PAD
            const minH = bbox.height + PAD
            const needsExpand =
                rectangleShape.width < minW || rectangleShape.height < minH

            if (needsExpand) {
                const newW = Math.max(rectangleShape.width, minW)
                const newH = Math.max(rectangleShape.height, minH)
                rectangleShape.width = newW
                rectangleShape.height = newH
                twoJSInstance?.update()
                updateComponentBulkPropertiesInLocalStore(componentId, {
                    metadata: updatedMetadata,
                    width: Math.round(newW),
                    height: Math.round(newH),
                })
            } else {
                updateComponentBulkPropertiesInLocalStore(componentId, {
                    metadata: updatedMetadata,
                })
            }
        })
    }

    const handleRectangleTextSizeChange = (newLabel) => {
        const sizesMap = isMobile ? MOBILE_TEXT_SIZES_OBJECT : TEXT_SIZES_OBJECT
        const textSize = sizesMap[newLabel]
        const twoText = selectedComponent?.text?.data
        if (!twoText) return
        twoText.size = textSize
        twoJSInstance?.update()

        const componentId = selectedComponent?.group?.data?.elementData?.id
        // stateRefForComponentStore is always current; group.elementData.metadata
        // is only set at mount and is stale after blur updates the store.
        const existingMetadata =
            stateRefForComponentStore.current[componentId]?.metadata ?? {}
        const updatedMetadata = { ...existingMetadata, textFontSize: textSize }
        if (selectedComponent?.group?.data?.elementData) {
            selectedComponent.group.data.elementData.metadata = updatedMetadata
        }

        scheduleRectFitToText(twoText, componentId, updatedMetadata)
        syncOpenTextarea({ fontSize: textSize })
    }

    const handleTextFontFamilyChange = (fontFamily) => {
        const twoText = selectedComponent?.shape?.data
        if (!twoText) return
        twoText.family = fontFamily
        const componentId = selectedComponent?.group?.data?.elementData?.id
        const existingMetadata =
            selectedComponent?.group?.data?.elementData?.metadata ?? {}
        updateComponentBulkPropertiesInLocalStore(componentId, {
            metadata: {
                ...existingMetadata,
                textFontFamily: fontFamily,
                content: twoText.value,
            },
        })
        twoJSInstance?.update()
        syncOpenTextarea({ fontFamily })
        // Make selection universal: future new elements pick up this family.
        setDefaultTextFontFamily(fontFamily)
    }

    const handleRectangleTextFontFamilyChange = (fontFamily) => {
        const twoText = selectedComponent?.text?.data
        if (!twoText) return
        twoText.family = fontFamily
        twoJSInstance?.update()
        const componentId = selectedComponent?.group?.data?.elementData?.id
        const existingMetadata =
            stateRefForComponentStore.current[componentId]?.metadata ?? {}
        const updatedMetadata = {
            ...existingMetadata,
            textFontFamily: fontFamily,
        }
        if (selectedComponent?.group?.data?.elementData) {
            selectedComponent.group.data.elementData.metadata = updatedMetadata
        }
        // Re-fit the rectangle to the new text bbox; some families (e.g.
        // Fraunces) render wider than Caveat at the same size.
        scheduleRectFitToText(twoText, componentId, updatedMetadata)
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
        const onFocus = (e) => {
            const g = e?.detail?.group ?? null
            selectedGroupRef.current = g
            setSelectedGroup(g)
        }
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
        handleTextSizeChange,
        handleRectangleTextSizeChange,
        handleTextFontFamilyChange,
        handleRectangleTextFontFamilyChange,
        setDefaultFill,
        setDefaultStrokeColor,
        setDefaultLinewidth,
        setDefaultStrokeType,
        setDefaultOpacity,
        setDefaultTextColor,
        setDefaultTextSize,
        setDefaultTextFontFamily,
    })

    const updateBulkPropsForRectangleWithText = (id, obj) => {
        let finalObj = { ...obj }
        if (obj.textColor !== undefined) {
            const existingMeta =
                stateRefForComponentStore.current[id]?.metadata ?? {}
            const updatedMeta = { ...existingMeta, textFill: obj.textColor }
            finalObj.metadata = updatedMeta
            if (selectedComponent?.group?.data?.elementData) {
                selectedComponent.group.data.elementData.metadata = updatedMeta
            }
        }
        updateComponentBulkPropertiesInLocalStore(id, finalObj)
    }

    const contextValueForSidebar = {
        scaleToDisplay: props.scaleToDisplay,
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
            <BoardContext.Provider value={contextValueForSidebar}>
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
                        onCameraChange={props.onCameraChange}
                        renderBackground={props.renderBackground}
                    />
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

export const useBoardContext = () => {
    return useContext(BoardContext)
}

export default BoardViewPage
