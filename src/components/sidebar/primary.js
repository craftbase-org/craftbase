import React, { useState, useEffect, useContext } from 'react'
import { useQuery } from '@apollo/client'
import { useNavigate } from 'react-router-dom'

import DefaultsDropdown from './defaults'
import ShapesToolbar from './shapesToolbar'
import { GET_COMPONENT_TYPES } from 'schema/queries'
import SpinnerWithSize from 'components/common/spinnerWithSize'
import Button from 'components/common/button'
import { generateUUID } from 'utils/misc'
import { useBoardContext } from 'views/Board/board'
import { useMediaQueryUtils } from 'constants/exportHooks'

import './sidebar.css'
import ShareLinkPopup from './shareLinkPopup'
import MenuDrawer from './menuDrawer'

const DRAW_SHAPE_TYPES = ['circle', 'rectangle', 'diamond']

const PrimarySidebar = () => {
    const {
        boardId,
        isPersisted,
        updateLastAddedElement,
        togglePointer,
        togglePencilMode,
        addToLocalComponentStore,
        enableTextDrawMode,
        setArrowDrawModeInBoard,
        setTextDrawModeInBoard,
        setRubberModeInBoard,
        cancelPendingElement,
        defaultLinewidth,
        defaultStrokeType,
        onCreateBoard,
        createBoardLoading,
    } = useBoardContext()
    const [secondaryMenu, toggleSecondaryMenu] = useState(true)
    const [hintText, setHintText] = useState(
        'Click anywhere to place element there.'
    )
    const {
        loading: getComponentTypesLoading,
        data: getComponentTypesData,
        error: getComponentTypesError,
    } = useQuery(GET_COMPONENT_TYPES)

    const history = useNavigate()

    // A check to see if the component types seeds are already populated in DB.
    // We need all the component types being inserted as DB seeds otherwise we insert component functionality will be affected
    useEffect(() => {
        if (
            !getComponentTypesLoading &&
            getComponentTypesData &&
            getComponentTypesData.componentTypes.length < 1
        ) {
            console.error(
                'Error : The component types are not available from the DB. Hint: Please check if component types seeds are already populated in component type table in DB '
            )
        }
    }, [getComponentTypesData])

    const handleArrowElement = (label) => {
        togglePencilMode(false)
        togglePointer(false)

        let savingEl = document.getElementById('show-saving-loader')
        savingEl.style.opacity = 1
        savingEl.style.zIndex = 1

        setTimeout(() => {
            savingEl.style.opacity = 0
            savingEl.style.zIndex = -1
        }, 100)

        let shapeData = null
        let generateId = generateUUID()

        if (getComponentTypesData) {
            getComponentTypesData.componentTypes.forEach((item, index) => {
                if (item.label === label) {
                    const userId = localStorage.getItem('userId')
                    shapeData = {
                        id: generateId,
                        componentType: label,
                        linewidth: defaultLinewidth,
                        strokeType: defaultStrokeType,
                        stroke: '#3A342C',
                        children: {},
                        metadata: [],
                        x: -9999,
                        y: -9999,
                        x2: 0,
                        boardId: boardId,
                        metadata: item.metadata,
                        width: item.width,
                        height: item.height,
                        fill: item.fill,
                        textColor: item.textColor,
                        updatedBy: userId,
                    }
                }
            })
        }

        updateLastAddedElement(shapeData)
        document.getElementById('main-two-root').style.cursor = 'crosshair'
        localStorage.setItem('arrowDrawMode', 'true')
        localStorage.setItem('lastAddedElementId', generateId)
        setArrowDrawModeInBoard(true)
        // PATCH/CAVEAT - gets error if current server request rate limit exceeds 60 req per min.
        addToLocalComponentStore(
            shapeData.id,
            shapeData.componentType,
            shapeData
        )
    }

    const handleTextElement = () => {
        let savingEl = document.getElementById('show-saving-loader')
        savingEl.style.opacity = 1
        savingEl.style.zIndex = 1

        setTimeout(() => {
            savingEl.style.opacity = 0
            savingEl.style.zIndex = -1
        }, 100)

        enableTextDrawMode()
    }

    const addElement = (label) => {
        cancelPendingElement()
        if (label !== 'rubber') {
            setRubberModeInBoard(false)
        }
        switch (label) {
            case 'pointer':
                togglePointer(true)
                break
            case 'pencil':
                togglePencilMode(true)
                break
            case 'rubber':
                togglePencilMode(false)
                togglePointer(false)
                setRubberModeInBoard(true)
                break
            case 'arrowLine':
                handleArrowElement(label)
                break
            case 'text':
                handleTextElement(label)
                break
            default:
                togglePencilMode(false)
                togglePointer(false)

                let savingEl = document.getElementById('show-saving-loader')
                savingEl.style.opacity = 1
                savingEl.style.zIndex = 1

                setTimeout(() => {
                    if (DRAW_SHAPE_TYPES.includes(label)) {
                        setHintText('Click and drag to draw shape')
                    } else {
                        setHintText('Click anywhere to place element there.')
                    }
                    document.getElementById(
                        'show-click-anywhere-btn'
                    ).style.opacity = 1
                    savingEl.style.opacity = 0
                    savingEl.style.zIndex = -1
                }, 100)

                let shapeData = null
                let randomNumber = Math.floor(Math.random() * 80 + 30)
                let generateId = generateUUID()

                if (getComponentTypesData) {
                    getComponentTypesData.componentTypes.forEach(
                        (item, index) => {
                            if (item.label === label) {
                                const userId = localStorage.getItem('userId')
                                shapeData = {
                                    id: generateId,
                                    componentType: label,
                                    linewidth: defaultLinewidth,
                                    strokeType: defaultStrokeType,
                                    stroke: '#3A342C',
                                    children: {},
                                    metadata: [],
                                    x: parseInt(
                                        window.outerWidth -
                                            (randomNumber * window.outerWidth) /
                                                100
                                    ),
                                    y: parseInt(
                                        window.outerHeight -
                                            (randomNumber *
                                                window.outerHeight) /
                                                100
                                    ),
                                    x2: label.includes('divider') ? 100 : 0,
                                    boardId: boardId,
                                    metadata: item.metadata,
                                    width: item.width,
                                    height: item.height,
                                    fill: item.fill,
                                    textColor: item.textColor,
                                    updatedBy: userId,
                                }
                            }
                        }
                    )
                }

                // Fallback for diamond when the DB catalog doesn't have a
                // diamond row yet. Lets the shape work end-to-end without a
                // Hasura seed. Mirrors rectangle defaults.
                if (!shapeData && label === 'diamond') {
                    const userId = localStorage.getItem('userId')
                    shapeData = {
                        id: generateId,
                        componentType: label,
                        linewidth: defaultLinewidth,
                        strokeType: defaultStrokeType,
                        stroke: '#3A342C',
                        children: {},
                        x: parseInt(
                            window.outerWidth -
                                (randomNumber * window.outerWidth) / 100
                        ),
                        y: parseInt(
                            window.outerHeight -
                                (randomNumber * window.outerHeight) / 100
                        ),
                        x2: 0,
                        boardId: boardId,
                        metadata: {},
                        width: 160,
                        height: 160,
                        fill: '#fff',
                        textColor: '#3A342C',
                        updatedBy: userId,
                    }
                }

                // shapeData is null if getComponentTypesData hasn't loaded yet (e.g. incognito
                // on first page load). Bail out — user can click again once data is ready.
                if (!shapeData) return

                if (DRAW_SHAPE_TYPES.includes(label)) {
                    // Draw-to-place: store pending shape props, canvas will create on mouseup
                    localStorage.setItem('pendingShapeType', label)
                    localStorage.setItem(
                        'pendingShapeProps',
                        JSON.stringify(shapeData)
                    )
                    document.getElementById('main-two-root').style.cursor =
                        'crosshair'
                } else {
                    // Handles text and divider elements
                    updateLastAddedElement(shapeData)
                    localStorage.setItem('lastAddedElementId', generateId)
                    // PATCH/CAVEAT - gets error if current server request rate limit exceeds 60 req per min.
                    addToLocalComponentStore(
                        shapeData.id,
                        shapeData.componentType,
                        shapeData
                    )
                }
        }
    }
    const { isMobile } = useMediaQueryUtils()
    let isLiveSession = false
    return (
        <>
            <ShapesToolbar addElement={addElement} />
            <MenuDrawer />
            <div
                id="sidebar-container"
                className="sidebar-container flex items-center"
            >
                <div className=" relative ">
                    <DefaultsDropdown />
                </div>
            </div>
            <div
                id="show-click-anywhere-btn"
                className="fixed w-full flex justify-center top-0  opacity-0
                transition-opacity ease-out duration-300"
            >
                <div
                    className="w-auto mt-2
                         bg-reds-r400 text-reds-r50  
                            px-4 py-2 rounded-md shadow-md
                            "
                >
                    <div className="flex items-center  ">
                        <div className="w-auto text-sm text-left">
                            {hintText}
                        </div>
                    </div>
                </div>
            </div>
            <div className="absolute top-2 right-1rem flex items-center px-2 py-1 gap-1">
                <div
                    id="show-saving-loader"
                    className="w-28 h-9 pr-2 transition-all opacity-0"
                    style={{ zIndex: '-1' }}
                >
                    <div
                        className="w-auto  
                             
                             bg-greens-g400 text-greens-g75  
                            px-4 py-2 rounded-md shadow-md
                            "
                    >
                        <div className="flex items-center ">
                            <div className="w-auto text-sm text-left">
                                Saving
                            </div>
                            <div>
                                <SpinnerWithSize
                                    loaderSize="sm"
                                    customStyles={{
                                        margin: 0,
                                        marginLeft: '4px',
                                        borderBottomColor: '#ABF5D1',
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {isLiveSession ? (
                    <>
                        <div className="w-9 h-9 text-sm pr-2">
                            <a className="flex items-center px-4 py-2 rounded-card bg-card-bg text-ink shadow-card">
                                <span className="text-sm ">Live</span>

                                <div className="ml-2  w-2 h-2 bg-reds-r400 rounded-50-percent ">
                                    <div className="w-2 h-2 bg-reds-r400 rounded-50-percent animate-ping "></div>
                                </div>
                            </a>
                        </div>
                    </>
                ) : (
                    <></>
                )}

                {!isMobile && <ShareLinkPopup />}
                {/* {isPersisted && (
                        <Button
                            intent="primary"
                            size="medium"
                            label="New Board"
                            onClick={() => history('/')}
                            extendClass="font-semibold shadow-lg ml-2"
                        />
                    )} */}
                {/* <UserDetailsPopup /> */}
            </div>
        </>
    )
}

export default PrimarySidebar
