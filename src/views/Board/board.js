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
    INSERT_USER_ONE,
    UPDATE_USER_REVISIT_COUNT,
    INSERT_COMPONENT,
    DELETE_COMPONENT_BY_ID,
    UPDATE_COMPONENT_INFO,
    CREATE_BOARD,
} from 'schema/mutations'
import Canvas from '../../newCanvas'
import Sidebar from 'components/sidebar/primary'
import Toolbar from 'components/floatingToolbar'
import PencilToolbar from 'components/pencilToolbar'
import Spinner from 'components/common/spinnerWithSize'
import { generateRandomUsernames, strokeTypeToDashes, clearDashesOnTwoJSShape } from 'utils/misc'

const BoardContext = createContext()

const BoardViewPage = (props) => {
    const routeParams = useParams()
    // console.log('params in board', routeParams)
    const boardId = routeParams.id

    const {
        loading: getComponentsForBoardLoading,
        data: getComponentsForBoardData,
        error: getComponentsForBoardError,
    } = useQuery(GET_COMPONENTS_FOR_BOARD_QUERY, {
        variables: { boardId },
        fetchPolicy: 'cache-first',
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
        insertUser,
        {
            loading: insertUserLoading,
            data: insertUserData,
            error: insertUserError,
            reset: resetInsertUserMutation,
        },
    ] = useMutation(INSERT_USER_ONE)
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

    const [componentStore, setComponentStore] = useState({})
    const [lastAddedElement, setLastAddedElement] = useState(null)
    const [pointerToggle, setPointerToggle] = useState(false)
    const [isPencilMode, setPencilMode] = useState(false)
    const [isArrowDrawMode, setIsArrowDrawMode] = useState(false)
    const [isTextDrawMode, setIsTextDrawMode] = useState(false)
    const [showToolbar, toggleToolbar] = useState(false)
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
    const [historyLog, setHistoryLog] = useState([])
    const [toolbarRefreshKey, setToolbarRefreshKey] = useState(0)
    const historyLogRef = useRef([])

    // Reset component store whenever the board changes
    useEffect(() => {
        setComponentStore({})
    }, [boardId])

    // check if user exists or not
    useEffect(() => {
        const userId = localStorage.getItem('userId')
        if (userId === null) {
            const { nickname, firstName, lastName } = generateRandomUsernames()
            insertUser({
                variables: {
                    object: {
                        nickname,
                        firstName,
                        lastName,
                    },
                },
            })
        } else if (userId !== null || userId !== undefined) {
            updateUserRevisit({
                variables: {
                    userId: userId,
                },
            })
        }
        localStorage.setItem('lastOpenBoard', routeParams.id)
    }, [])

    useEffect(() => {
        if (createBoardData) {
            const newBoardId = createBoardData.board.id
            navigate(`/board/${newBoardId}`)
        }
    }, [createBoardData])

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
        console.log('change in componentStore in Board', componentStore)
        stateRefForComponentStore.current = componentStore
    }, [componentStore])


    if (getComponentsForBoardLoading) {
        return (
            <>
                <div className="w-full h-full flex items-center justify-center">
                    <Spinner loaderSize="lg" />
                </div>
            </>
        )
    }

    if (insertUserData) {
        const userId = insertUserData.user.id

        localStorage.setItem('userId', userId)
        // console.log('insertUserData', insertUserData)
        // window.location.reload()
    }

    const updateLastAddedElement = (obj) => {
        setLastAddedElement(obj)
        document.getElementById('main-two-root').style.cursor = 'grabbing'
    }

    const togglePointer = (pointerVal) => {
        setPointerToggle(pointerVal)
        setPencilMode(false)
        if (pointerVal) {
            setSelectedComponent(null)
            toggleToolbar(false)
        }
    }

    const togglePencilMode = (value) => {
        toggleToolbar(false)
        setPencilMode(value)
        value === true && localStorage.setItem('pencilMode', 'TRUE')
        value === false && localStorage.removeItem('pencilMode')
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

    // Records ADD action, updates store and syncs to DB
    const addToLocalComponentStore = (id, type, componentInfo) => {
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

        componentInfo &&
            insertComponent({ variables: { object: componentInfo } })
    }

    // Snapshots only the properties being changed before applying bulk updates
    const updateComponentBulkPropertiesInLocalStore = (id, bulkObj, skipHistory = false, syncDefaults = false) => {
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

        deleteComponent({
            variables: { id },
            errorPolicy: import.meta.env.VITE_GRAPHQL_ERROR_POLICY,
        })
    }

    const setArrowDrawModeInBoard = (val) => {
        setIsArrowDrawMode(val)
    }

    const setTextDrawModeInBoard = (val) => {
        setIsTextDrawMode(val)
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
        if (userId === null) {
            const { nickname, firstName, lastName } = generateRandomUsernames()
            insertUser({
                variables: {
                    object: {
                        nickname,
                        firstName,
                        lastName,
                    },
                },
            })
        }
        createBoard({
            variables: {
                object: {
                    createdBy: userId,
                },
            },
        })
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
                two.remove([group])
            }
            const updatedStore = { ...stateRefForComponentStore.current }
            delete updatedStore[id]
            stateRefForComponentStore.current = updatedStore
            setComponentStore(updatedStore)
            deleteComponent({
                variables: { id },
                errorPolicy: import.meta.env.VITE_GRAPHQL_ERROR_POLICY,
            })
            requestAnimationFrame(() => two?.update())
        } else if (action === 'DELETE') {
            const { prevState } = lastEntry
            const restoredState = { ...prevState, boardId: boardId }
            const updatedStore = {
                ...stateRefForComponentStore.current,
                [id]: restoredState,
            }
            stateRefForComponentStore.current = updatedStore
            setComponentStore(updatedStore)
            insertComponent({
                variables: { object: stripTypename(restoredState) },
            })
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
            updateComponentInfo({
                variables: { id, updateObj: { x: prevX, y: prevY } },
            })
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
                two?.update()
            }

            if (lastEntry.syncDefaults) {
                if (prevProps.linewidth !== undefined) setDefaultLinewidth(prevProps.linewidth)
                if (prevProps.strokeType !== undefined) {
                    setDefaultStrokeType(
                        prevProps.strokeType === 'solid' ? null : prevProps.strokeType
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

            updateComponentInfo({
                variables: { id, updateObj: prevProps },
            })
            requestAnimationFrame(() => two?.update())
        }
    }

    const isArrowSelected =
        selectedComponent !== null &&
        (selectedComponent?.shape?.type === 'arrowLine' ||
            selectedComponent?.group?.data?.elementData?.isLineCircle === true)

    const contextValueForSidebar = {
        isPencilMode,
        isArrowDrawMode,
        isTextDrawMode,
        isArrowSelected,
        setArrowDrawModeInBoard,
        setTextDrawModeInBoard,
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
    }

    return (
        <>
            {!isMobile ? (
                <BoardContext.Provider value={contextValueForSidebar}>
                    <div>
                        <Sidebar />
                        {selectedComponent && showToolbar && (
                            <Toolbar
                                hideColorText={true}
                                hideColorIcon={true}
                                hideColorBackground={isArrowSelected}
                                toggle={showToolbar}
                                componentState={selectedComponent}
                                closeToolbar={closeToolbar}
                                refreshKey={toolbarRefreshKey}
                                updateComponentBulkProperties={
                                    updateComponentBulkPropertiesInLocalStore
                                }
                                postToolbarUpdate={() => {
                                    twoJSInstance.update()
                                }}
                            />
                        )}
                        {isPencilMode && (
                            <PencilToolbar
                                pencilStrokeColor={pencilStrokeColor}
                                defaultLinewidth={pencilDefaultLinewidth}
                                defaultStrokeType={pencilDefaultStrokeType}
                                onColorChange={(color) => setPencilStrokeColor(color)}
                                onLinewidthChange={(value) => setPencilDefaultLinewidth(value)}
                                onStrokeTypeChange={(type) => setPencilDefaultStrokeType(type === 'solid' ? null : type)}
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
                    </div>
                </BoardContext.Provider>
            ) : null}
            {isMobile ? (
                <div>
                    <div className="px-4 py-4 text-xl ">
                        The mobile version isn't here yet. Please view Craftbase
                        on your tablet or desktop (or on bigger screens) in the
                        meantime.
                    </div>
                </div>
            ) : null}
        </>
    )
}

export const useBoardContext = () => {
    return useContext(BoardContext)
}

export default BoardViewPage
