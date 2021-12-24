import React, { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { useHistory } from 'react-router-dom'

import SecondarySidebar from './secondary'
import CursorICON from 'assets/cursor.svg'
import PanICON from 'assets/pan.svg'
import RightArrowIcon from 'assets/right_arrow.svg'
import Icon from 'icons/icon'
import { INSERT_COMPONENT, UPDATE_BOARD_COMPONENTS } from 'schema/mutations'
import { GET_COMPONENT_TYPES } from 'schema/queries'
import SpinnerWithSize from 'components/common/spinnerWithSize'

import './sidebar.css'

const PrimarySidebar = (props) => {
    const [showAddShapeLoader, setShowAddShapeLoader] = useState(false)
    const {
        loading: getComponentTypesLoading,
        data: getComponentTypesData,
        error: getComponentTypesError,
    } = useQuery(GET_COMPONENT_TYPES)
    const history = useHistory()
    console.log('boardId', props.match.params.boardId)
    const [
        insertComponent,
        {
            loading: insertComponentLoading,
            data: insertComponentSuccess,
            error: insertComponentError,
        },
    ] = useMutation(INSERT_COMPONENT)
    const [
        updateBoardComponents,
        {
            loading: updateBoardComponentsLoading,
            data: updateBoardComponentsSuccess,
            error: updateBoardComponentsError,
        },
    ] = useMutation(UPDATE_BOARD_COMPONENTS)
    const [secondaryMenu, toggleSecondaryMenu] = useState(false)

    useEffect(() => {
        if (insertComponentSuccess) {
            let insertComponentData = insertComponentSuccess.component
            let newBoardData = [
                ...props.boardData,
                {
                    componentType: insertComponentData.componentType,
                    id: insertComponentData.id,
                },
            ]
            updateBoardComponents({
                variables: {
                    id: props.match.params.boardId,
                    components: newBoardData,
                },
            })
            console.log('insertComponentSuccess', insertComponentSuccess)
        }
    }, [insertComponentSuccess])

    useEffect(() => {
        if (updateBoardComponentsSuccess && showAddShapeLoader) {
            setShowAddShapeLoader(false)
        }
    }, [updateBoardComponentsSuccess])

    const addShape = (label) => {
        let shapeData = null
        console.log('getComponentTypesData', getComponentTypesData, label)
        if (getComponentTypesData) {
            getComponentTypesData.componentTypes.forEach((item, index) => {
                if (item.label === label) {
                    shapeData = {
                        componentType: label,
                        x: 200,
                        y: 200,
                        boardId: props.match.params.boardId,
                        metadata: props.defaultMetaData,
                    }
                }
            })
        }
        console.log('shapeData', shapeData)

        setShowAddShapeLoader(true)
        shapeData && insertComponent({ variables: { object: shapeData } })
    }

    return (
        <>
            <div
                id="sidebar-container"
                className="sidebar-container flex items-center "
            >
                <div className="flex items-center justify-center w-64 h-12 px-2 py-2 mx-4 bg-white shadow-xl">
                    {getComponentTypesLoading ? (
                        <div className=" text-blues-b500">Loading ...</div>
                    ) : (
                        <>
                            {' '}
                            <div>
                                {secondaryMenu && (
                                    <SecondarySidebar
                                        selectedItem={null}
                                        handleOnBlur={(result) => {
                                            // this.handleOnBlurSecSidebar(result)
                                        }}
                                    />
                                )}
                            </div>
                            <div className="relative transition-transform">
                                <button
                                    className={`hover:bg-blues-b50 bg-transparent px-2  py-2 block`}
                                    onClick={() => addShape('rectangle')}
                                >
                                    <Icon
                                        width="23"
                                        height="23"
                                        icon="SIDEBAR_ICON_RECTANGLE"
                                    />
                                </button>
                            </div>
                            <div className="relative">
                                {' '}
                                <button
                                    className={`hover:bg-blues-b50 bg-transparent px-2  py-2 block`}
                                    onClick={() => addShape('circle')}
                                >
                                    <Icon
                                        width="23"
                                        height="23"
                                        icon="SIDEBAR_ICON_CIRCLE"
                                    />
                                </button>
                            </div>
                            {/* <div className="relative">
                        <button
                            className={`${
                                this.state.selectedItem === 'frames'
                                    ? ''
                                    : 'icon-frame'
                            }  hover:bg-blues-b50 bg-transparent px-2  py-2 block`}
                            onClick={this.handleMenuClick}
                        >
                            <Icon icon="SIDEBAR_ICON_FRAME" />
                        </button>
                    </div> */}
                            <div className="relative">
                                <button
                                    className={`hover:bg-blues-b50 bg-transparent px-2 py-2 block`}
                                    onClick={() => addShape('arrowLine')}
                                >
                                    <img
                                        className="w-6 h-6"
                                        src={RightArrowIcon}
                                    />
                                </button>
                            </div>
                            <div className="relative">
                                <button
                                    className={`hover:bg-blues-b50 bg-transparent px-2  py-2 block`}
                                    onClick={() => addShape('text')}
                                >
                                    <Icon
                                        width="23"
                                        height="23"
                                        icon="SIDEBAR_ICON_TEXT"
                                    />
                                </button>
                            </div>
                            {/* <div className="relative">
                        {' '}
                        <button
                            className={`${
                                this.state.selectedItem === 'draw'
                                    ? ''
                                    : 'icon-pencil'
                            }  hover:bg-blues-b50 bg-transparent px-2  py-2 block`}
                            onClick={this.handleMenuClick}
                        >
                            <Icon icon="SIDEBAR_ICON_PENCIL" />
                        </button>
                    </div> */}
                            <div className="relative">
                                <button
                                    className={` hover:bg-blues-b50 bg-transparent px-2 py-2 block`}
                                    onClick={props.changeSelectMode}
                                >
                                    <img className="w-6 h-6" src={PanICON} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <div className="w-5 absolute">
                <SpinnerWithSize loaderSize="sm" />
            </div>
        </>
    )
}

export default PrimarySidebar
