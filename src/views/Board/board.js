import React, { useState, useEffect } from 'react'
import { useSubscription, useMutation, useQuery } from '@apollo/client'
import { useParams } from 'react-router-dom'
import { useMediaQueryUtils } from 'constants/exportHooks'
import {
    GET_BOARD_DATA_QUERY,
    GET_COMPONENTS_FOR_BOARD_QUERY,
} from 'schema/queries'
import {
    INSERT_USER_ONE,
    UPDATE_USER_REVISIT_COUNT,
    INSERT_COMPONENT,
    DELETE_COMPONENT_BY_ID,
} from 'schema/mutations'
import Canvas from '../../newCanvas'
import Sidebar from 'components/sidebar/primary'
import Spinner from 'components/common/spinnerWithSize'
import { generateRandomUsernames } from 'utils/misc'

const BoardViewPage = (props) => {
    const routeParams = useParams()
    console.log('params in board', routeParams)
    const boardId = routeParams.id
    const {
        loading: getBoardDataLoading,
        error: getBoardDataError,
        data: getBoardData,
    } = useQuery(GET_BOARD_DATA_QUERY, {
        variables: { boardId: boardId },
        fetchPolicy: 'cache-first',
    })

    const {
        loading: getComponentsForBoardLoading,
        data: getComponentsForBoardData,
        error: getComponentsForBoardError,
    } = useQuery(GET_COMPONENTS_FOR_BOARD_QUERY, {
        variables: { boardId },
    })

    const [insertComponent] = useMutation(INSERT_COMPONENT, {
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

    const [boardData, setBoardData] = useState({ components: [] })
    const [componentStore, setComponentStore] = useState({})
    const [lastAddedElement, setLastAddedElement] = useState(null)
    const [showHelperTooltip, setShowHelperTooltip] = useState(true)
    const [pointerToggle, setPointerToggle] = useState(false)
    const [isPencilMode, setPencilMode] = useState(false)
    const { isDesktop, isMobile, isLaptop, isTablet } = useMediaQueryUtils()

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
        console.log('listen for componentStore change', componentStore)
    }, [componentStore])

    useEffect(() => {
        console.log('listen for boardData change', boardData)
    }, [boardData])

    useEffect(() => {
        if (
            !getComponentsForBoardLoading &&
            getComponentsForBoardData &&
            getComponentsForBoardData.components
        ) {
            console.log(
                'getComponentsForBoardData',
                getComponentsForBoardData.components
            )

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
        if (!getBoardDataLoading && getBoardData && getBoardData.components) {
            if (getBoardData.components.length > 0) {
                setBoardData({ components: getBoardData.components })
            }
        }
    }, [getBoardData])

    if (getBoardDataLoading) {
        return (
            <>
                <div className="w-full h-full flex items-center justify-center">
                    <Spinner loaderSize="lg" />
                </div>
            </>
        )
    }

    if (getBoardData) {
        setTimeout(() => {
            setShowHelperTooltip(false)
        }, 2500)
    }

    if (insertUserData) {
        const userId = insertUserData.user.id

        localStorage.setItem('userId', userId)
        console.log('insertUserData', insertUserData)
        // window.location.reload()
    }

    console.log(
        'getBoardData.components',
        getBoardData?.components
        // getBoardData.boardData.components
    )

    const updateLastAddedElement = (obj) => {
        setLastAddedElement(obj)
        document.getElementById('main-two-root').style.cursor = 'grabbing'
    }

    const togglePointer = (pointerVal) => {
        setPointerToggle(pointerVal)
        setPencilMode(false)
    }

    const togglePencilMode = (value) => {
        setPencilMode(value)
        value === true && localStorage.setItem('pencilMode', 'TRUE')
        value === false && localStorage.removeItem('pencilMode')
    }

    const addToLocalComponentStore = (id, type, componentInfo) => {
        console.log('addToLocalComponentStore', id, type, componentInfo)

        // update local store and state
        setBoardData({
            components: [
                ...boardData.components,
                {
                    id,
                    componentType: type,
                },
            ],
        })

        setComponentStore({ ...componentStore, [id]: componentInfo })

        // update the upstream DB
        componentInfo &&
            insertComponent({ variables: { object: componentInfo } })
    }

    const deleteComponentFromLocalStore = (id) => {
        console.log('deleteComponentFromLocalStore', id)

        // update local store and state
        let updatedBoardDataComponents = [...boardData.components]
        updatedBoardDataComponents.filter((item) => item.id !== id)
        setBoardData({
            components: updatedBoardDataComponents,
        })

        let updatedComponentStore = { ...componentStore }
        delete updatedComponentStore[id]
        setComponentStore(updatedComponentStore)

        // update the upstream DB
        deleteComponent({
            variables: { id },
            errorPolicy: process.env.REACT_APP_GRAPHQL_ERROR_POLICY,
        })
    }

    return (
        <>
            {!isMobile ? (
                <div>
                    <div
                        id="show-select-any-shape-btn"
                        className="fixed w-40 top-0 left-60 
                transition-all ease-out duration-300"
                        style={{
                            opacity: showHelperTooltip ? 1 : 0,
                            zIndex: showHelperTooltip ? 1 : -1,
                        }}
                    >
                        <div
                            className="w-auto mt-2
                          bg-greens-g400 text-white  
                            px-4 py-2 rounded-md shadow-md
                            "
                        >
                            <div className="flex items-center  ">
                                <div className="w-auto text-sm text-left">
                                    You can select any shape(s) from here
                                </div>
                            </div>
                        </div>
                    </div>

                    <Sidebar
                        togglePencilMode={togglePencilMode}
                        togglePointer={togglePointer}
                        updateLastAddedElement={updateLastAddedElement}
                        addToLocalComponentStore={addToLocalComponentStore}
                    />

                    <Canvas
                        pointerToggle={pointerToggle}
                        isPencilMode={isPencilMode}
                        selectPanMode={false}
                        boardId={boardId}
                        lastAddedElement={lastAddedElement}
                        boardData={boardData}
                        componentStore={componentStore}
                        addToLocalComponentStore={addToLocalComponentStore}
                        deleteComponentFromLocalStore={
                            deleteComponentFromLocalStore
                        }
                    />
                </div>
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

export default BoardViewPage
