import React, { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { useHistory } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

import ElementsDropdown from './elementsDropdown'
import CircleIcon from 'wireframeAssets/circle.svg'
import RectangleIcon from 'wireframeAssets/rectangle.svg'
import LayersIcon from 'assets/layers_toolbar_icon.svg'
import RightArrowIcon from 'assets/right_arrow.svg'

import RadioWhiteIcon from 'assets/radio_white.svg'
import Icon from 'icons/icon'
import { INSERT_COMPONENT, UPDATE_BOARD_COMPONENTS } from 'schema/mutations'
import { GET_COMPONENT_TYPES } from 'schema/queries'
import SpinnerWithSize from 'components/common/spinnerWithSize'
import Button from 'components/common/button'

import './sidebar.css'
import ShareLinkPopup from './shareLinkPopup'
import UserDetailsPopup from './userDetailsPopup'

const PrimarySidebar = (props) => {
    // const [showAddShapeLoader, setShowAddShapeLoader] = useState(false)
    const [secondaryMenu, toggleSecondaryMenu] = useState(false)
    const {
        loading: getComponentTypesLoading,
        data: getComponentTypesData,
        error: getComponentTypesError,
    } = useQuery(GET_COMPONENT_TYPES)
    const history = useHistory()
    console.log('boardId', props.match.params.boardId)
    const [insertComponent] = useMutation(INSERT_COMPONENT, {
        ignoreResults: true,
    })
    // const [
    //     updateBoardComponents,
    //     {
    //         loading: updateBoardComponentsLoading,
    //         data: updateBoardComponentsSuccess,
    //         error: updateBoardComponentsError,
    //     },
    // ] = useMutation(UPDATE_BOARD_COMPONENTS)

    // useEffect(() => {
    //     if (insertComponentSuccess) {
    //         // setShowAddShapeLoader(false)
    //         document.getElementById('show-click-anywhere-btn').style.opacity = 1
    //         // let insertComponentData = insertComponentSuccess.component
    //         // props.updateLastAddedElementId(insertComponentData.id)
    //         // let newBoardData = [
    //         //     ...props.boardData,
    //         //     {
    //         //         componentType: insertComponentData.componentType,
    //         //         id: insertComponentData.id,
    //         //     },
    //         // ]
    //         // updateBoardComponents({
    //         //     variables: {
    //         //         id: props.match.params.boardId,
    //         //         components: newBoardData,
    //         //     },
    //         // })
    //         console.log('insertComponentSuccess', insertComponentSuccess)
    //     }
    // }, [insertComponentSuccess])

    const addElement = (label) => {
        let shapeData = null
        let randomNumber = Math.floor(Math.random() * 80 + 30)
        let generateId = crypto.randomUUID()
        console.log('getComponentTypesData', getComponentTypesData, label)
        if (getComponentTypesData) {
            getComponentTypesData.componentTypes.forEach((item, index) => {
                if (item.label === label) {
                    shapeData = {
                        id: generateId,
                        componentType: label,
                        x: parseInt(
                            window.outerWidth -
                                (randomNumber * window.outerWidth) / 100
                        ),
                        y: parseInt(
                            window.outerHeight -
                                (randomNumber * window.outerHeight) / 100
                        ),
                        boardId: props.match.params.boardId,
                        metadata: item.defaultMetaData,
                        width: item.width,
                        height: item.height,
                    }
                }
            })
        }
        console.log('shapeData', shapeData)
        props.updateLastAddedElement(shapeData)

        // setShowAddShapeLoader(true)
        localStorage.setItem('lastAddedElementId', generateId)

        // PATCH/CAVEAT - gets error if current server request rate limit exceeds 60 req per min.
        shapeData && insertComponent({ variables: { object: shapeData } })

        setTimeout(() => {
            document.getElementById('show-click-anywhere-btn').style.opacity = 1
        }, 400)
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
                    <>
                        {' '}
                        <div className="  relative ">
                            <ElementsDropdown
                                selectedItem={'elements'}
                                getComponentTypesLoading={
                                    getComponentTypesLoading
                                }
                                addElement={addElement}
                                showMenu={secondaryMenu}
                                handleOnBlur={toggleSecondaryMenuFn}
                            />
                        </div>
                        <div className="relative transition-transform">
                            <button
                                className={`hover:bg-blues-b50 bg-transparent px-2  py-2 block`}
                                onClick={() => addElement('rectangle')}
                            >
                                <img className="w-6 h-6" src={RectangleIcon} />
                            </button>
                        </div>
                        <div className="relative">
                            {' '}
                            <button
                                className={`hover:bg-blues-b50 bg-transparent px-2  py-2 block`}
                                onClick={() => addElement('circle')}
                            >
                                <img className="w-6 h-6" src={CircleIcon} />
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
                                onClick={() => addElement('arrowLine')}
                            >
                                <img className="w-6 h-6" src={RightArrowIcon} />
                            </button>
                        </div>
                        <div className="relative">
                            <button
                                className={`hover:bg-blues-b50 bg-transparent px-2  py-2 block`}
                                onClick={() => addElement('text')}
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
                            Click anywhere to place element there
                        </div>
                    </div>
                </div>
            </div>
            <div className="absolute right-10 mt-2">
                <div className="flex items-center">
                    {/* <div id="show-saving-loader" className="pr-2">
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
                    </div> */}

                    <div className="text-sm pr-2">
                        <a className=" flex items-center px-4 py-2 rounded-md  bg-white text-black shadow-md ">
                            <div className="w-2 h-2 bg-reds-r400 rounded-50-percent"></div>
                            <span className="ml-2 text-sm">Live</span>
                            {/* <img
                                src={RadioWhiteIcon}
                                className="ml-2 w-5 h-5"
                            /> */}
                        </a>
                    </div>
                    <ShareLinkPopup />
                    {/* <UserDetailsPopup /> */}
                </div>
            </div>
        </>
    )
}

export default PrimarySidebar
