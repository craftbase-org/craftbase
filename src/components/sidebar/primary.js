import React, { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { useNavigate, useParams } from 'react-router-dom'

import ElementsDropdown from './elementsDropdown'
import { GET_COMPONENT_TYPES } from 'schema/queries'
import SpinnerWithSize from 'components/common/spinnerWithSize'
import { generateUUID } from 'utils/misc'

import './sidebar.css'
import ShareLinkPopup from './shareLinkPopup'

const PrimarySidebar = ({
    updateLastAddedElement,
    togglePointer,
    togglePencilMode,
    addToLocalComponentStore,
}) => {
    const [secondaryMenu, toggleSecondaryMenu] = useState(true)
    const {
        loading: getComponentTypesLoading,
        data: getComponentTypesData,
        error: getComponentTypesError,
    } = useQuery(GET_COMPONENT_TYPES)

    const history = useNavigate()
    const routeParams = useParams()
    console.log('boardId', routeParams.id)

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

    const addElement = (label) => {
        switch (label) {
            case 'pointer':
                togglePointer(true)
                break
            case 'pencil':
                togglePencilMode(true)
                break
            default:
                togglePencilMode(false)
                togglePointer(false)

                setTimeout(() => {
                    document.getElementById(
                        'show-click-anywhere-btn'
                    ).style.opacity = 1
                    let el = document.getElementById('show-saving-loader')
                    el.style.opacity = 0
                    el.style.zIndex = -1
                }, 100)

                let el = document.getElementById('show-saving-loader')
                el.style.opacity = 1
                el.style.zIndex = 1

                let shapeData = null
                let randomNumber = Math.floor(Math.random() * 80 + 30)
                let generateId = generateUUID()
                console.log(
                    'getComponentTypesData',
                    getComponentTypesData,
                    label
                )
                if (getComponentTypesData) {
                    getComponentTypesData.componentTypes.forEach(
                        (item, index) => {
                            if (item.label === label) {
                                shapeData = {
                                    id: generateId,
                                    componentType: label,
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
                                    boardId: routeParams.id,
                                    metadata: item.metadata,
                                    width: item.width,
                                    height: item.height,
                                    fill: item.fill,
                                    textColor: item.textColor,
                                }
                            }
                        }
                    )
                }
                console.log('shapeData', shapeData)
                updateLastAddedElement(shapeData)

                // setShowAddShapeLoader(true)
                localStorage.setItem('lastAddedElementId', generateId)

                // PATCH/CAVEAT - gets error if current server request rate limit exceeds 60 req per min.
                addToLocalComponentStore(
                    shapeData.id,
                    shapeData.componentType,
                    shapeData
                )
        }
    }

    return (
        <>
            <div
                id="sidebar-container"
                className="sidebar-container flex items-center "
            >
                <div className="  relative ">
                    <ElementsDropdown
                        getComponentTypesLoading={getComponentTypesLoading}
                        addElement={addElement}
                        showMenu={secondaryMenu}
                    />
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
                            Click anywhere to place element there.
                        </div>
                    </div>
                </div>
            </div>
            <div className="absolute right-10 mt-2">
                <div className="flex items-center">
                    <div
                        id="show-saving-loader"
                        className="pr-2 transition-all opacity-0"
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

                    <div className="text-sm pr-2">
                        <a className=" flex items-center px-4 py-2 rounded-md  bg-white text-black shadow-md ">
                            <span className="text-sm ">Live</span>

                            <div className="ml-2  w-2 h-2 bg-reds-r400 rounded-50-percent ">
                                <div className="w-2 h-2 bg-reds-r400 rounded-50-percent animate-ping "></div>
                            </div>

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
