import React, {
    useState,
    useEffect,
    useRef,
    useContext,
    createContext,
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
import Toolbar from '../../components/floatingToolbar'
import PencilToolbar from '../../components/pencilToolbar'
import controlsIcon from '../../assets/controls.svg'
import Spinner from '../../components/common/spinnerWithSize'
import PermissionErrorModal from '../../components/modals/PermissionErrorModal'
import StorageLimitModal from '../../components/modals/StorageLimitModal'
import { generateUUID } from '../../utils/misc'
import { pollUntilElement } from '../../utils/canvasUtils'
import { TEXT_SIZES_OBJECT, MOBILE_TEXT_SIZES_OBJECT } from '../../utils/constants'
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
} from '../../constants/misc'
import { useDrawingModes } from '../../hooks/useDrawingModes'
import { usePencilDefaults } from '../../hooks/usePencilDefaults'
import { useMobileToolbarPanels } from '../../hooks/useMobileToolbarPanels'
import { useLocalDraftPersistence } from '../../hooks/useLocalDraftPersistence'
import { useComponentHistory } from '../../hooks/useComponentHistory'

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
    const [currentElement, setCurrentElement] = useState(null)
    const [toolbarRefreshKey, setToolbarRefreshKey] = useState(0)
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
        setArrowDrawModeInBoard,
        setTextDrawModeInBoard,
        setRubberModeInBoard,
        clearDrawModesFromStorage,
    } = useDrawingModes()

    const {
        showToolbar,
        toggleToolbar,
        showMobileToolbarPanel,
        setShowMobileToolbarPanel,
        showMobilePencilPanel,
        setShowMobilePencilPanel,
    } = useMobileToolbarPanels({ isPencilMode, isMobile, selectedComponent })

    const {
        defaultLinewidth,
        setDefaultLinewidth,
        defaultStrokeType,
        setDefaultStrokeType,
        pencilDefaultLinewidth,
        setPencilDefaultLinewidth,
        pencilDefaultStrokeType,
        setPencilDefaultStrokeType,
        pencilStrokeColor,
        setPencilStrokeColor,
        setDefaultLinewidthInBoard,
        setDefaultStrokeTypeInBoard,
        setPencilStrokeColorInBoard,
    } = usePencilDefaults({ toggleToolbar, setSelectedComponent })

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
        setToolbarRefreshKey,
        selectedComponent,
        stripTypename,
    })

    // Clear stale interaction flags from localStorage on mount so a page refresh
    // never triggers SCENARIO_DRAW_SHAPE / SCENARIO_ARROW_DRAW / etc. on the
    // first mousedown. These keys are only meaningful within a single page session.
    useEffect(() => {
        clearDrawModesFromStorage()
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
            toggleToolbar(false)
            document.getElementById('main-two-root').style.cursor = 'default'
        }
    }

    const togglePencilMode = (value) => {
        toggleToolbar(false)
        setPencilMode(value)
        if (value) {
            cancelPendingElement()
            localStorage.setItem(PENCIL_MODE_KEY, 'TRUE')
            document.getElementById('main-two-root').style.cursor = 'crosshair'
        } else {
            localStorage.removeItem(PENCIL_MODE_KEY)
        }
    }

    function closeToolbar() {
        toggleToolbar(false)
        setSelectedComponent(null)
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
        if (shape === null) {
            setSelectedComponent(null)
            toggleToolbar(false)
        } else {
            setSelectedComponent(shape)
            toggleToolbar(true)
        }
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
        return {
            id,
            componentType: 'newText',
            linewidth: defaultLinewidth,
            strokeType: defaultStrokeType,
            children: {},
            metadata: typeItem.metadata || {},
            x: parseInt(x),
            y: parseInt(y),
            x2: 0,
            boardId: boardId,
            width: typeItem.width,
            height: typeItem.height,
            fill: typeItem.fill,
            textColor: typeItem.textColor,
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
        twoJSInstanceRef.current?.clear()
        twoJSInstanceRef.current?.update()
        setComponentStore({})
        clearHistory(isPersisted)
    }

    const isArrowSelected =
        selectedComponent !== null &&
        (selectedComponent?.shape?.type === 'arrowLine' ||
            selectedComponent?.group?.data?.elementData?.isLineCircle === true)

    const isTextSelected =
        selectedComponent !== null &&
        selectedComponent?.shape?.type === 'newText'

    const isRectangleWithText =
        selectedComponent !== null &&
        selectedComponent?.shape?.type === 'rectangle' &&
        typeof selectedComponent?.text?.data?.value === 'string'

    const currentFontFamily = isTextSelected
        ? selectedComponent?.shape?.data?.family || 'Caveat'
        : isRectangleWithText
          ? selectedComponent?.text?.data?.family || 'Caveat'
          : undefined

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

        // After Two.js renders the new font size, expand the rectangle if it
        // is now smaller than the text's bounding box.
        // Capture whether text editing is active NOW so the RAF can detect
        // if blur fires between the size change and the next frame.
        const textAreaAtSizeChange = document.querySelector('.temp-input-area')
        requestAnimationFrame(() => {
            // If text editing was active when the size changed but the textarea
            // is now gone, blur already committed the correct metadata
            // (textContent + textFill). Overwriting with the stale snapshot
            // captured here would wipe that out.
            if (
                textAreaAtSizeChange &&
                !document.body.contains(textAreaAtSizeChange)
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
    }

    const handleRectangleTextFontFamilyChange = (fontFamily) => {
        const twoText = selectedComponent?.text?.data
        if (!twoText) return
        twoText.family = fontFamily
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
        updateComponentBulkPropertiesInLocalStore(componentId, {
            metadata: updatedMetadata,
        })
        twoJSInstance?.update()
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
        deleteComponentFromLocalStore,
        deleteBulkComponentsFromLocalStore,
        twoJSInstance,
        setTwoJSInstanceInBoard,
        setZuiInstanceInBoard,
        zuiInBoard,
        setSelectedComponentInBoard,
        defaultLinewidth,
        setDefaultLinewidthInBoard,
        defaultStrokeType,
        setDefaultStrokeTypeInBoard,
        pencilStrokeColor,
        setPencilStrokeColorInBoard,
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
                    {selectedComponent && showToolbar && isMobile && (
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
                            className={`w-10 h-10 rounded-lg shadow-card flex items-center justify-center transition-colors duration-150
                                ${showMobileToolbarPanel ? 'bg-accent' : 'bg-card-bg'}`}
                        >
                            <img
                                src={controlsIcon}
                                className="w-5 h-5"
                                alt="Element properties"
                            />
                        </button>
                    )}
                    {selectedComponent &&
                        showToolbar &&
                        (!isMobile || showMobileToolbarPanel) && (
                            <Toolbar
                                hideColorText={
                                    !isTextSelected && !isRectangleWithText
                                }
                                hideColorIcon={true}
                                hideColorBackground={
                                    isArrowSelected || isTextSelected
                                }
                                hideBorderSection={isTextSelected}
                                showTextSizeSection={
                                    isTextSelected || isRectangleWithText
                                }
                                currentFontSize={
                                    isTextSelected
                                        ? selectedComponent?.shape?.data?.size
                                        : isRectangleWithText
                                          ? selectedComponent?.text?.data?.size
                                          : undefined
                                }
                                onTextSizeChange={
                                    isTextSelected
                                        ? handleTextSizeChange
                                        : isRectangleWithText
                                          ? handleRectangleTextSizeChange
                                          : undefined
                                }
                                toggle={showToolbar}
                                componentState={selectedComponent}
                                closeToolbar={closeToolbar}
                                refreshKey={toolbarRefreshKey}
                                isMobile={isMobile}
                                updateComponentBulkProperties={
                                    isRectangleWithText
                                        ? updateBulkPropsForRectangleWithText
                                        : updateComponentBulkPropertiesInLocalStore
                                }
                                showFontFamilySection={
                                    isTextSelected || isRectangleWithText
                                }
                                currentFontFamily={currentFontFamily}
                                onFontFamilyChange={
                                    isTextSelected
                                        ? handleTextFontFamilyChange
                                        : isRectangleWithText
                                          ? handleRectangleTextFontFamilyChange
                                          : undefined
                                }
                                postToolbarUpdate={() => {
                                    twoJSInstance.update()
                                }}
                            />
                        )}
                    {isPencilMode && isMobile && (
                        <button
                            title="Pencil properties"
                            onClick={() =>
                                setShowMobilePencilPanel((prev) => !prev)
                            }
                            style={{
                                position: 'fixed',
                                bottom: '16px',
                                right: '10px',
                                zIndex: 20,
                            }}
                            className={`w-10 h-10 rounded-lg shadow-card flex items-center justify-center transition-colors duration-150
                                ${showMobilePencilPanel ? 'bg-accent' : 'bg-card-bg'}`}
                        >
                            <img
                                src={controlsIcon}
                                className="w-5 h-5"
                                alt="Pencil properties"
                            />
                        </button>
                    )}
                    {isPencilMode && (!isMobile || showMobilePencilPanel) && (
                        <PencilToolbar
                            pencilStrokeColor={pencilStrokeColor}
                            defaultLinewidth={pencilDefaultLinewidth}
                            defaultStrokeType={pencilDefaultStrokeType}
                            onColorChange={(color) =>
                                setPencilStrokeColor(color)
                            }
                            onLinewidthChange={(value) =>
                                setPencilDefaultLinewidth(value)
                            }
                            onStrokeTypeChange={(type) =>
                                setPencilDefaultStrokeType(
                                    type === 'solid' ? null : type
                                )
                            }
                        />
                    )}
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
                        pencilDefaultLinewidth={pencilDefaultLinewidth}
                        pencilDefaultStrokeType={pencilDefaultStrokeType}
                        pencilStrokeColor={pencilStrokeColor}
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
