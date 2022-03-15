import React, { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { useHistory } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

import ElementsDropdown from './elementsDropdown'
import CursorICON from 'assets/cursor.svg'
import LayersIcon from 'assets/layers_toolbar_icon.svg'
import RightArrowIcon from 'assets/right_arrow.svg'
import LinkIcon from 'assets/link_white.svg'
import RadioWhiteIcon from 'assets/radio_white.svg'
import Icon from 'icons/icon'
import { INSERT_COMPONENT, UPDATE_BOARD_COMPONENTS } from 'schema/mutations'
import { GET_COMPONENT_TYPES } from 'schema/queries'
import SpinnerWithSize from 'components/common/spinnerWithSize'
import Button from 'components/common/button'

import './sidebar.css'

const randomBgColors = [
    '#BF2600',
    '#FF8B00',
    '#006644',
    '#008DA6',
    '#0747A6',
    '#403294',
    '#091E42',
    '#FF5630',
    '#FFAB00',
    '#36B37E',
    '#00B8D9',
    '#0065FF',
    '#6554C0',
]

const PrimarySidebar = (props) => {
    const [showAddShapeLoader, setShowAddShapeLoader] = useState(false)
    const [secondaryMenu, toggleSecondaryMenu] = useState(false)
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
    // const [
    //     updateBoardComponents,
    //     {
    //         loading: updateBoardComponentsLoading,
    //         data: updateBoardComponentsSuccess,
    //         error: updateBoardComponentsError,
    //     },
    // ] = useMutation(UPDATE_BOARD_COMPONENTS)

    useEffect(() => {
        if (insertComponentSuccess) {
            setShowAddShapeLoader(false)
            // let insertComponentData = insertComponentSuccess.component
            // let newBoardData = [
            //     ...props.boardData,
            //     {
            //         componentType: insertComponentData.componentType,
            //         id: insertComponentData.id,
            //     },
            // ]
            // updateBoardComponents({
            //     variables: {
            //         id: props.match.params.boardId,
            //         components: newBoardData,
            //     },
            // })
            console.log('insertComponentSuccess', insertComponentSuccess)
        }
    }, [insertComponentSuccess])

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
                        metadata: item.defaultMetaData,
                    }
                }
            })
        }
        console.log('shapeData', shapeData)

        setShowAddShapeLoader(true)
        shapeData && insertComponent({ variables: { object: shapeData } })
    }

    const toggleSecondaryMenuFn = (bool) => {
        if (secondaryMenu === false) {
            document.getElementById('sec-sidebar').focus()
        }

        if (bool) {
            toggleSecondaryMenu(bool)
        } else {
            toggleSecondaryMenu(!secondaryMenu)
        }
    }

    return (
        <>
            <div
                id="sidebar-container"
                className="sidebar-container flex items-center "
            >
                <div
                    className="flex items-center justify-center 
                 w-72 h-12 px-2 py-2 mx-4
                 bg-white rounded-md shadow-xl"
                >
                    {getComponentTypesLoading ? (
                        <div className=" text-blues-b500">Loading ...</div>
                    ) : (
                        <>
                            {' '}
                            <div className="  relative ">
                                <ElementsDropdown
                                    selectedItem={'elements'}
                                    showMenu={secondaryMenu}
                                    handleOnBlur={toggleSecondaryMenuFn}
                                />
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
                                    onClick={() => toggleSecondaryMenuFn(true)}
                                >
                                    <img className="w-6 h-6" src={LayersIcon} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <div className="absolute right-10 mt-2">
                <div className="flex items-center">
                    <div className="relative">
                        {showAddShapeLoader ? (
                            <div className="w-full absolute right-32 -top-10">
                                <div className="w-48 flex items-center flex-wrap px-2 py-2 ">
                                    <div className="w-14 pl-1 text-sm text-left">
                                        updating
                                    </div>
                                    <SpinnerWithSize loaderSize="sm" />{' '}
                                </div>
                            </div>
                        ) : null}
                    </div>
                    <div className="text-sm pr-2">
                        <a className=" flex items-center px-4 py-2 rounded-md border bg-white text-black shadow-md ">
                            <div className="w-2 h-2 bg-reds-r400 rounded-50-percent"></div>
                            <span className="ml-2 text-sm">Live</span>
                            {/* <img
                                src={RadioWhiteIcon}
                                className="ml-2 w-5 h-5"
                            /> */}
                        </a>
                    </div>
                    <div className="text-sm pr-2">
                        <a className=" flex items-center px-4 py-2 rounded-md bg-primary-blue text-white shadow-md">
                            <span className="text-sm">Share</span>
                            <img src={LinkIcon} className="ml-2 w-5 h-5" />
                        </a>
                    </div>
                    <div
                        className="w-7 h-7 flex items-center justify-center 
                        rounded-50-percent border border-blues-b500  
                        text-sm text-white "
                        style={{ background: randomBgColors[0] }}
                    >
                        M
                    </div>
                    <div
                        className="w-7 h-7 flex items-center justify-center 
                        rounded-50-percent border border-blues-b500  
                        text-sm text-white -ml-2"
                        style={{ background: randomBgColors[1] }}
                    >
                        A
                    </div>
                </div>
            </div>
        </>
    )
}

export default PrimarySidebar
