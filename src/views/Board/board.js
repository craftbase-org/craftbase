import React, {
    useState,
    useEffect,
    useRef,
    useContext,
    createContext,
} from 'react'
import { useSubscription, useMutation, useQuery } from '@apollo/client'
import { useParams, useNavigate } from 'react-router-dom'
import { useMediaQueryUtils } from 'constants/exportHooks'
import { GET_COMPONENTS_FOR_BOARD_QUERY } from 'schema/queries'
import {
    UPDATE_USER_REVISIT_COUNT,
    INSERT_COMPONENT,
    INSERT_BULK_COMPONENTS,
    DELETE_COMPONENT_BY_ID,
    UPDATE_COMPONENT_INFO,
    CREATE_BOARD,
} from 'schema/mutations'
import Canvas from '../../newCanvas'
import Sidebar from 'components/sidebar/primary'
import Toolbar from 'components/floatingToolbar'
import PencilToolbar from 'components/pencilToolbar'
import BottomToolbar from 'components/bottomToolbar'
import controlsIcon from 'assets/controls.svg'
import Spinner from 'components/common/spinnerWithSize'
import Modal from 'components/common/modal'
import Button from 'components/common/button'
import {
    generateUUID,
    strokeTypeToDashes,
    clearDashesOnTwoJSShape,
} from 'utils/misc'
import { TEXT_SIZES_OBJECT, MOBILE_TEXT_SIZES_OBJECT } from 'utils/constants'
import { RUBBER_MODE_KEY } from 'constants/misc'
import Two from 'two.js'
import { updateX1Y1Vertices, updateX2Y2Vertices } from 'utils/updateVertices'

export const BoardContext = createContext()

const BoardViewPage = (props) => {
    const routeParams = useParams()
    const boardIdFromUrl = routeParams.id
    const [localBoardId, setLocalBoardId] = useState(() => {
        if (boardIdFromUrl) return boardIdFromUrl
        // Reuse the boardId stored with the local draft so viewport persistence
        // keys stay stable across page refreshes in local (non-persisted) mode.
        try {
            const draft = localStorage.getItem('craftbase_local_draft')
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
    const [pointerToggle, setPointerToggle] = useState(false)
    const [isPencilMode, setPencilMode] = useState(false)
    const [isArrowDrawMode, setIsArrowDrawMode] = useState(false)
    const [isTextDrawMode, setIsTextDrawMode] = useState(false)
    const [showToolbar, toggleToolbar] = useState(false)
    const [showMobileToolbarPanel, setShowMobileToolbarPanel] = useState(false)
    const [showMobilePencilPanel, setShowMobilePencilPanel] = useState(false)
    const [twoJSInstance, setTwoJSInstance] = useState(null)
    const [selectedComponent, setSelectedComponent] = useState(null)
    const [defaultLinewidth, setDefaultLinewidth] = useState(2)
    const [defaultStrokeType, setDefaultStrokeType] = useState(null)
    const [pencilDefaultLinewidth, setPencilDefaultLinewidth] = useState(2)
    const [pencilDefaultStrokeType, setPencilDefaultStrokeType] = useState(null)
    const [pencilStrokeColor, setPencilStrokeColor] = useState('#000')
    const [currentElement, setCurrentElement] = useState(null)
    const { isDesktop, isMobile, isLaptop, isTablet } = useMediaQueryUtils()

    const stateRefForComponentStore = useRef()
    const twoJSInstanceRef = useRef(null)
    const skipComponentStoreResetRef = useRef(false)
    const [historyLog, setHistoryLog] = useState([])
    const [toolbarRefreshKey, setToolbarRefreshKey] = useState(0)
    const historyLogRef = useRef([])

    // Reset mobile toolbar panel whenever the selected component changes
    useEffect(() => {
        setShowMobileToolbarPanel(false)
    }, [selectedComponent])

    // Reset mobile pencil panel when pencil mode is turned off
    useEffect(() => {
        if (!isPencilMode) setShowMobilePencilPanel(false)
    }, [isPencilMode])

    // Close pencil panel as soon as the user touches the canvas on mobile
    useEffect(() => {
        if (!isPencilMode || !isMobile) return
        const canvasEl = document.getElementById('main-two-root')
        if (!canvasEl) return
        const handleCanvasTouch = () => setShowMobilePencilPanel(false)
        canvasEl.addEventListener('touchstart', handleCanvasTouch, { passive: true })
        return () => canvasEl.removeEventListener('touchstart', handleCanvasTouch)
    }, [isPencilMode, isMobile])

    const LOCAL_DRAFT_KEY = 'craftbase_local_draft'
    const DRAFT_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
    const [showStorageLimitModal, setShowStorageLimitModal] = useState(false)
    const [showPermissionErrorModal, setShowPermissionErrorModal] =
        useState(false)
    const [storageLimitBoardUrl, setStorageLimitBoardUrl] = useState(null)
    const draftSaveTimerRef = useRef(null)

    // Restore draft and background board ID from localStorage on mount (local mode only)
    useEffect(() => {
        if (isPersisted) return

        const savedBgBoardId = localStorage.getItem(
            'craftbase_background_board_id'
        )
        if (savedBgBoardId) {
            backgroundBoardIdRef.current = savedBgBoardId
            setBackgroundBoardId(savedBgBoardId)
        }

        try {
            const draft = localStorage.getItem(LOCAL_DRAFT_KEY)
            if (draft) {
                const parsed = JSON.parse(draft)
                const age = Date.now() - (parsed.timestamp || 0)
                if (age < DRAFT_EXPIRY_MS && parsed.components) {
                    setComponentStore(parsed.components)
                } else {
                    localStorage.removeItem(LOCAL_DRAFT_KEY)
                    localStorage.removeItem('craftbase_background_board_id')
                }
            }
        } catch (e) {
            localStorage.removeItem(LOCAL_DRAFT_KEY)
            localStorage.removeItem('craftbase_background_board_id')
        }
    }, [])

    // Save draft to localStorage on changes (debounced, local mode only)
    useEffect(() => {
        if (isPersisted) return
        if (Object.keys(componentStore).length === 0) return

        if (draftSaveTimerRef.current) {
            clearTimeout(draftSaveTimerRef.current)
        }
        draftSaveTimerRef.current = setTimeout(() => {
            try {
                localStorage.setItem(
                    LOCAL_DRAFT_KEY,
                    JSON.stringify({
                        boardId: localBoardId,
                        components: componentStore,
                        timestamp: Date.now(),
                    })
                )
            } catch (e) {
                if (
                    e instanceof DOMException &&
                    e.name === 'QuotaExceededError'
                ) {
                    handleStorageLimitReached()
                }
            }
        }, 500)

        return () => {
            if (draftSaveTimerRef.current) {
                clearTimeout(draftSaveTimerRef.current)
            }
        }
    }, [componentStore, isPersisted])

    const handleStorageLimitReached = async () => {
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

    const handleStartNewCanvas = () => {
        localStorage.removeItem(LOCAL_DRAFT_KEY)
        setShowStorageLimitModal(false)
        setStorageLimitBoardUrl(null)
        window.location.href = '/'
    }

    const handleContinueOnSavedBoard = () => {
        setShowStorageLimitModal(false)
        if (storageLimitBoardUrl) {
            window.location.href = storageLimitBoardUrl
        }
    }

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

    // Update revisit count when loading a persisted board
    useEffect(() => {
        if (!isPersisted) return
        const userId = localStorage.getItem('userId')
        if (userId) {
            updateUserRevisit({ variables: { userId } })
        }
        localStorage.setItem('lastOpenBoard', boardId)
    }, [isPersisted])

    useEffect(() => {
        if (
            !getComponentsForBoardLoading &&
            getComponentsForBoardData &&
            getComponentsForBoardData.components
        ) {
            // console.log(
            //     'getComponentsForBoardData',
            //     getComponentsForBoardData.components
            // )

            if (getComponentsForBoardData.components.length > 0) {
                let baseComponentStore = { ...componentStore }
                getComponentsForBoardData.components.forEach((item) => {
                    baseComponentStore[item.id] = item
                })
                // console.log(
                //     'updating component store when get components',
                //     baseComponentStore
                // )
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
            localStorage.setItem('pencilMode', 'TRUE')
            document.getElementById('main-two-root').style.cursor = 'crosshair'
        } else {
            localStorage.removeItem('pencilMode')
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

    const setSelectedComponentInBoard = (shape) => {
        if (shape === null) {
            setSelectedComponent(null)
            toggleToolbar(false)
        } else {
            setSelectedComponent(shape)
            toggleToolbar(true)
        }
    }

    // Strips __typename fields injected by Apollo before sending data back to Hasura
    const stripTypename = (obj) => {
        if (Array.isArray(obj)) return obj.map(stripTypename)
        if (obj && typeof obj === 'object') {
            const { __typename, ...rest } = obj
            return Object.fromEntries(
                Object.entries(rest).map(([k, v]) => [k, stripTypename(v)])
            )
        }
        return obj
    }

    // Appends an action entry to the undo history stack
    const recordToHistoryLog = (entry) => {
        const updatedLog = [
            ...historyLogRef.current,
            { ...entry, timestamp: Date.now() },
        ]
        historyLogRef.current = updatedLog
        console.log('historyLog', updatedLog)
        setHistoryLog(updatedLog)
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
            localStorage.setItem('craftbase_background_board_id', newBoardId)
        } catch (e) {
            console.error('Background board creation failed:', e)
        } finally {
            boardCreationInFlightRef.current = false
        }
    }

    // Records ADD action, updates store and syncs to DB
    const addToLocalComponentStore = (id, type, componentInfo) => {
        // Trigger background board creation on first interaction
        ensureBackgroundBoard()

        recordToHistoryLog({
            action: 'ADD',
            id,
            componentInfo,
        })

        const updatedComponentStore = {
            ...stateRefForComponentStore.current,
            [id]: componentInfo,
        }
        stateRefForComponentStore.current = updatedComponentStore
        setComponentStore(updatedComponentStore)

        if (isPersistedRef.current && componentInfo) {
            insertComponent({ variables: { object: componentInfo } }).catch(
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
        updatedComponentStore[id] = {
            ...updatedComponentStore[id],
            ...bulkObj,
            updatedBy: userId,
        }
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

    // Snapshots full component state before deletion, then removes from store and DB
    const deleteComponentFromLocalStore = (id) => {
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
        window.dispatchEvent(new CustomEvent('elementRemoved', { detail: { id } }))

        if (isPersistedRef.current) {
            deleteComponent({
                variables: { id },
                errorPolicy: import.meta.env.VITE_GRAPHQL_ERROR_POLICY,
            })
        }
    }

    const setArrowDrawModeInBoard = (val) => {
        setIsArrowDrawMode(val)
    }

    const setTextDrawModeInBoard = (val) => {
        setIsTextDrawMode(val)
    }

    const setRubberModeInBoard = (val) => {
        if (val) {
            localStorage.setItem(RUBBER_MODE_KEY, 'true')
            document.getElementById('main-two-root').style.cursor = 'crosshair'
        } else {
            localStorage.removeItem(RUBBER_MODE_KEY)
            document.getElementById('main-two-root').style.cursor = 'default'
        }
    }

    const setDefaultLinewidthInBoard = (val) => {
        setDefaultLinewidth(val)
        setPencilDefaultLinewidth(val)
        toggleToolbar(false)
        setSelectedComponent(null)
    }

    const setDefaultStrokeTypeInBoard = (val) => {
        setDefaultStrokeType(val)
        setPencilDefaultStrokeType(val)
        toggleToolbar(false)
        setSelectedComponent(null)
    }

    const setPencilStrokeColorInBoard = (val) => {
        setPencilStrokeColor(val)
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
        let serverBoardId = backgroundBoardIdRef.current

        // If background board wasn't created yet (e.g. user shares before first draw),
        // create it now
        if (!serverBoardId) {
            const { data: boardData } = await createBoard({
                variables: { object: {} },
            })
            serverBoardId = boardData.board.id
        }

        // Insert all components to DB under the server board ID.
        // Generate a fresh UUID for each component's id so re-sharing from '/'
        // never hits a "duplicate key" uniqueness violation.
        const componentsForDB = Object.values(
            stateRefForComponentStore.current
        ).map((comp) => {
            const cleaned = stripTypename(comp)
            return { ...cleaned, id: generateUUID(), boardId: serverBoardId }
        })

        if (componentsForDB.length > 0) {
            await insertBulkComponents({ variables: { objects: componentsForDB } })
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
                LOCAL_DRAFT_KEY,
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
        localStorage.removeItem('craftbase_background_board_id')
        localStorage.setItem('lastOpenBoard', serverBoardId)

        // Stay in local (non-persisted) mode — new drawings on '/' are a fresh session
        return serverBoardId
    }

    // Applies a single property back to a Two.js shape during undo.
    // Visual properties (fill, stroke, etc.) live directly on the shape object.
    const applyPropertyToTwoJSGroup = (group, name, value) => {
        const shape = group.children?.[0]
        if (!shape) return

        switch (name) {
            case 'fill':
            case 'stroke':
            case 'linewidth':
            case 'radius':
            case 'width':
            case 'height':
            case 'textColor':
            case 'iconStroke':
                shape[name] = value
                break
            case 'strokeType':
                shape.dashes = strokeTypeToDashes(value)
                if (!value || value === 'solid') {
                    clearDashesOnTwoJSShape(shape)
                }
                break
            case 'metadata':
                if (value && typeof value === 'object') {
                    Object.entries(value).forEach(([k, v]) => {
                        shape[k] = v
                    })
                }
                break
            default:
                break
        }
    }

    // Pops the last history entry and reverses it.
    // Store is always updated before Two.js visuals to keep the ref correct
    // even if rendering fails.
    const undoLastAction = () => {
        if (historyLogRef.current.length === 0) return

        const updatedLog = [...historyLogRef.current]
        const lastEntry = updatedLog.pop()
        historyLogRef.current = updatedLog
        setHistoryLog(updatedLog)

        const { action, id } = lastEntry

        const two = twoJSInstanceRef.current

        if (action === 'ADD') {
            const group = two?.scene.children.find(
                (c) => c?.elementData?.id === id
            )
            if (group) {
                console.log('Group ID FOUND while doing undo')
                two.remove([group])
            }
            const updatedStore = { ...stateRefForComponentStore.current }
            delete updatedStore[id]
            stateRefForComponentStore.current = updatedStore
            setComponentStore(updatedStore)

            // Tell Canvas to untrack this id so undo-of-undo (redo) can create a fresh wrapper
            window.dispatchEvent(new CustomEvent('elementRemoved', { detail: { id } }))

            if (isPersistedRef.current) {
                deleteComponent({
                    variables: { id },
                    errorPolicy: import.meta.env.VITE_GRAPHQL_ERROR_POLICY,
                })
            }
            requestAnimationFrame(() => two.update())
        } else if (action === 'DELETE') {
            const { prevState } = lastEntry
            const restoredState = { ...prevState, boardId: boardId }
            const updatedStore = {
                ...stateRefForComponentStore.current,
                [id]: restoredState,
            }
            stateRefForComponentStore.current = updatedStore
            setComponentStore(updatedStore)
            if (isPersistedRef.current) {
                insertComponent({
                    variables: { object: stripTypename(restoredState) },
                }).catch((error) => {
                    const isPermissionError = error.graphQLErrors?.some(
                        (e) => e.extensions?.code === 'permission-error'
                    )
                    if (isPermissionError) {
                        undoLastAction()
                        setShowPermissionErrorModal(true)
                    }
                })
            }
        } else if (action === 'UPDATE_VERTICES') {
            const { prevX, prevY } = lastEntry

            // Update store FIRST
            const updatedStore = { ...stateRefForComponentStore.current }
            updatedStore[id] = { ...updatedStore[id], x: prevX, y: prevY }
            stateRefForComponentStore.current = updatedStore
            setComponentStore(updatedStore)

            // Then update Two.js visuals
            const group = two?.scene.children.find(
                (c) => c?.elementData?.id === id
            )
            if (group) {
                group.translation.x = prevX
                group.translation.y = prevY
                two?.update()
            }
            if (isPersistedRef.current) {
                updateComponentInfo({
                    variables: { id, updateObj: { x: prevX, y: prevY } },
                })
            }
            requestAnimationFrame(() => two?.update())
        } else if (action === 'UPDATE_BULK') {
            const { prevProps } = lastEntry

            // Update store — only restore the properties that were changed
            const updatedStore = { ...stateRefForComponentStore.current }
            updatedStore[id] = {
                ...updatedStore[id],
                ...prevProps,
            }
            stateRefForComponentStore.current = updatedStore
            setComponentStore(updatedStore)

            // Then update Two.js visuals
            const group = two?.scene.children.find(
                (c) => c?.elementData?.id === id
            )
            if (group) {
                if (prevProps.x !== undefined) group.translation.x = prevProps.x
                if (prevProps.y !== undefined) group.translation.y = prevProps.y
                Object.entries(prevProps).forEach(([name, val]) => {
                    applyPropertyToTwoJSGroup(group, name, val)
                })

                // Restore arrow endpoint vertices (x1/y1/x2/y2)
                const hasArrowVertices =
                    prevProps.x1 !== undefined ||
                    prevProps.y1 !== undefined ||
                    prevProps.x2 !== undefined ||
                    prevProps.y2 !== undefined
                if (hasArrowVertices) {
                    const line = group.children?.[0]
                    const pointCircle1Group = group.children?.[1]
                    const pointCircle2Group = group.children?.[2]
                    if (line && pointCircle1Group && pointCircle2Group) {
                        const x1 = prevProps.x1 ?? line.vertices[0].x
                        const y1 = prevProps.y1 ?? line.vertices[0].y
                        const x2 = prevProps.x2 ?? line.vertices[1].x
                        const y2 = prevProps.y2 ?? line.vertices[1].y
                        updateX1Y1Vertices(Two, line, x1, y1, pointCircle1Group, two)
                        updateX2Y2Vertices(Two, line, x2, y2, pointCircle2Group, two)
                    }
                }

                two?.update()

                if (
                    prevProps.width !== undefined ||
                    prevProps.height !== undefined
                ) {
                    window.dispatchEvent(
                        new CustomEvent('undoSelectorSync', {
                            detail: { elementId: id },
                        })
                    )
                }
            }

            if (lastEntry.syncDefaults) {
                if (prevProps.linewidth !== undefined)
                    setDefaultLinewidth(prevProps.linewidth)
                if (prevProps.strokeType !== undefined) {
                    setDefaultStrokeType(
                        prevProps.strokeType === 'solid'
                            ? null
                            : prevProps.strokeType
                    )
                }
            }
            if (prevProps.strokeType !== undefined) {
                if (selectedComponent?.group?.data?.elementData) {
                    selectedComponent.group.data.elementData.strokeType =
                        prevProps.strokeType
                }
            }
            if (
                prevProps.linewidth !== undefined ||
                prevProps.strokeType !== undefined
            ) {
                setToolbarRefreshKey((k) => k + 1)
            }

            if (isPersistedRef.current) {
                updateComponentInfo({
                    variables: { id, updateObj: prevProps },
                })
            }
            requestAnimationFrame(() => two?.update())
        }
    }

    const clearBoard = () => {
        twoJSInstanceRef.current?.clear()
        twoJSInstanceRef.current?.update()
        setComponentStore({})
        historyLogRef.current = []
        setHistoryLog([])
        if (!isPersisted) {
            localStorage.removeItem(LOCAL_DRAFT_KEY)
        }
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
        const updatedMetadata = { ...existingMetadata, textFontFamily: fontFamily }
        if (selectedComponent?.group?.data?.elementData) {
            selectedComponent.group.data.elementData.metadata = updatedMetadata
        }
        updateComponentBulkPropertiesInLocalStore(componentId, {
            metadata: updatedMetadata,
        })
        twoJSInstance?.update()
    }

    const cancelPendingElement = () => {
        const pendingId = localStorage.getItem('lastAddedElementId')
        if (pendingId) {
            undoLastAction()
            setLastAddedElement(null)
        }
        localStorage.removeItem('lastAddedElementId')
        localStorage.removeItem('arrowDrawMode')
        localStorage.removeItem('textDrawMode')
        localStorage.removeItem('pendingShapeType')
        localStorage.removeItem('pendingShapeProps')
        setIsArrowDrawMode(false)
        setIsTextDrawMode(false)
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
        updateComponentVerticesInLocalStore,
        updateComponentBulkPropertiesInLocalStore,
        deleteComponentFromLocalStore,
        setTwoJSInstanceInBoard,
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
        undoLastAction,
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
                            className={`w-10 h-10 rounded-lg shadow-md flex items-center justify-center transition-colors duration-150
                                ${showMobileToolbarPanel ? 'bg-blues-b50' : 'bg-white'}`}
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
                            className={`w-10 h-10 rounded-lg shadow-md flex items-center justify-center transition-colors duration-150
                                ${showMobilePencilPanel ? 'bg-blues-b50' : 'bg-white'}`}
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
                    />
                    <BottomToolbar />
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
            <Modal
                open={showPermissionErrorModal}
                onClose={() => setShowPermissionErrorModal(false)}
                locked={false}
            >
                <div className="p-4" style={{ minWidth: '400px' }}>
                    <h2 className="text-lg font-semibold mb-2">
                        Permission Denied
                    </h2>
                    <p className="text-sm text-neutrals-n700 mb-4">
                        You don't have permission to add components to this
                        board. If you already have access, please refresh the
                        page and try again.
                    </p>
                    <div className="flex gap-2">
                        <Button
                            intent="primary"
                            size="medium"
                            label="Refresh"
                            onClick={() => window.location.reload()}
                        />
                        <Button
                            intent="secondary"
                            size="medium"
                            label="Dismiss"
                            onClick={() => setShowPermissionErrorModal(false)}
                        />
                    </div>
                </div>
            </Modal>
            <Modal
                open={showStorageLimitModal}
                onClose={() => setShowStorageLimitModal(false)}
                locked={false}
            >
                <div className="p-4" style={{ minWidth: '400px' }}>
                    <h2 className="text-lg font-semibold mb-2">
                        Storage Limit Reached
                    </h2>
                    <p className="text-sm text-neutrals-n700 mb-4">
                        Your local storage is full. Your current work has been
                        saved to the server.
                    </p>
                    {storageLimitBoardUrl && (
                        <p className="text-sm text-neutrals-n700 mb-4 break-all">
                            Saved board URL:{' '}
                            <a
                                href={storageLimitBoardUrl}
                                className="text-primary-blue underline"
                            >
                                {storageLimitBoardUrl}
                            </a>
                        </p>
                    )}
                    <div className="flex gap-2">
                        <Button
                            intent="primary"
                            size="medium"
                            label="Start New Canvas"
                            onClick={handleStartNewCanvas}
                        />
                        <Button
                            intent="secondary"
                            size="medium"
                            label="Continue on Saved Board"
                            onClick={handleContinueOnSavedBoard}
                        />
                    </div>
                </div>
            </Modal>
        </>
    )
}

export const useBoardContext = () => {
    return useContext(BoardContext)
}

export default BoardViewPage
