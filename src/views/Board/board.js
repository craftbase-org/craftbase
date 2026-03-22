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
import Spinner from 'components/common/spinnerWithSize'
import ColorPicker from 'components/utils/colorPicker'
import { generateRandomUsernames } from 'utils/misc'

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
    const [pencilStrokeColor, setPencilStrokeColor] = useState('#000')
    const [currentElement, setCurrentElement] = useState(null)
    const { isDesktop, isMobile, isLaptop, isTablet } = useMediaQueryUtils()

    const stateRefForComponentStore = useRef()
    const [historyLog, setHistoryLog] = useState([])
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

    const recordToHistoryLog = (entry) => {
        const updatedLog = [
            ...historyLogRef.current,
            { ...entry, timestamp: Date.now() },
        ]
        historyLogRef.current = updatedLog
        console.log('historyLog', updatedLog)
        setHistoryLog(updatedLog)
    }

    const addToLocalComponentStore = (id, type, componentInfo) => {
        // console.log('addToLocalComponentStore', id, type, componentInfo)
        recordToHistoryLog({
            action: 'ADD',
            id,
            componentInfo,
        })

        let updatedComponentStore = stateRefForComponentStore.current

        // console.log('updating component store in add to local store')
        setComponentStore({ ...updatedComponentStore, [id]: componentInfo })

        // update the upstream DB
        componentInfo &&
            insertComponent({ variables: { object: componentInfo } })
    }

    const updateComponentBulkPropertiesInLocalStore = (id, bulkObj) => {
        const userId = localStorage.getItem('userId')

        recordToHistoryLog({
            action: 'UPDATE_BULK',
            id,
            prevState: { ...stateRefForComponentStore.current[id] },
            bulkObj,
        })

        // console.log('update component bulk properties in local store')
        let updatedComponentStore = stateRefForComponentStore.current
        // console.log('updatedComponentStore[id]', updatedComponentStore[id])
        updatedComponentStore[id] = {
            ...updatedComponentStore[id],
            ...bulkObj,
            updatedBy: userId,
        }
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

        let updatedComponentStore = stateRefForComponentStore.current
        // console.log('updatedComponentStore[id]', updatedComponentStore[id])
        updatedComponentStore[id] = {
            ...updatedComponentStore[id],
            x: parseInt(x),
            y: parseInt(y),
            updatedBy: userId,
        }

        // console.log('updating component store in update vertices')
        setComponentStore(updatedComponentStore)

        // update the upstream DB
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

    const deleteComponentFromLocalStore = (id) => {
        // console.log('deleteComponentFromLocalStore', id)

        recordToHistoryLog({
            action: 'DELETE',
            id,
            prevState: { ...stateRefForComponentStore.current[id] },
        })

        let updatedComponentStore = stateRefForComponentStore.current
        delete updatedComponentStore[id]
        // console.log(
        //     'updating component store in delete component handler',
        //     updatedComponentStore
        // )
        setComponentStore(updatedComponentStore)

        // update the upstream DB
        deleteComponent({
            variables: { id },
            errorPolicy: process.env.REACT_APP_GRAPHQL_ERROR_POLICY,
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

    const renderBorderWidths = () => {
        const widths = [0, 2, 4, 8].map((width, index) => {
            return (
                <React.Fragment key={width}>
                    <button
                        data-parent="floating-toolbar"
                        className={`${defaultLinewidth === width ? `` : ``} ${
                            width == 1 ? `border` : `border-${width}`
                        } w-8 h-8  border-blues-b400 
                            mr-2  bg-blues-b50 font-semibold py-2 rounded`}
                        onClick={() => {
                            setDefaultLinewidth(width)
                        }}
                    ></button>
                </React.Fragment>
            )
        })
        return widths
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
        pencilStrokeColor,
        setPencilStrokeColorInBoard,
        currentElement,
        setCurrentElementInBoard,
        onCreateBoard,
        createBoardLoading,
        historyLog,
        historyLogRef,
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
                                postToolbarUpdate={() => {
                                    twoJSInstance.update()
                                }}
                            />
                        )}
                        {isPencilMode && (
                            <div
                                style={{
                                    position: 'fixed',
                                    right: 16,
                                    top: 65,
                                    zIndex: 1,
                                    background: 'rgba(255, 255, 255, 1)',
                                    overflow: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                }}
                                className="shadow-lg px-2 py-2 rounded-md"
                            >
                                <ColorPicker
                                    title="Stroke Color"
                                    currentColor={pencilStrokeColor}
                                    onChangeComplete={(color) => {
                                        setPencilStrokeColor(color)
                                    }}
                                />
                                <hr className="my-2 w-full" />
                                <div className="w-full text-left text-sm">
                                    <label htmlFor="border-widths-row">
                                        Stroke Width
                                    </label>
                                    <div
                                        id="border-widths-row"
                                        data-parent="floating-toolbar"
                                        className="flex flex-row my-2"
                                    >
                                        {renderBorderWidths()}
                                    </div>
                                </div>
                            </div>
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
