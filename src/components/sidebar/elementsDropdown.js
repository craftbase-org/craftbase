import React, { useState, Component } from 'react'
import Proptypes from 'prop-types'
import classnames from 'classnames'

import { staticDrawerData, staticPrimaryElementData } from 'utils/constants'
import Spinner from 'components/common/spinnerWithSize'
import RightArrowBlackSVG from 'assets/right_arrow.svg'
import Button from 'components/common/button'
import { useBoardContext } from 'views/Board/board'

const STROKE_TYPES = [
    { label: '—', value: 'solid' },
    { label: '- -', value: 'dashed' },
]

const STROKE_WIDTHS = [
    { label: '1', borderClass: 'border', value: 1 },
    { label: '2', borderClass: 'border-2', value: 2 },
    { label: '4', borderClass: 'border-4', value: 4 },
]

const ElementsDropdown = ({ addElement, getComponentTypesLoading }) => {
    const { defaultLinewidth, setDefaultLinewidthInBoard, currentElement, setCurrentElementInBoard } = useBoardContext()
    const [listElements, setListElements] = useState([
        ...staticPrimaryElementData,
    ])

    const [toggleDrawer, setToggleDrawer] = useState(false)
    const [selectedStrokeType, setSelectedStrokeType] = useState('solid')

    const renderPrimaryStack = (element) => {
        return (
            <>
                <div className="w-1/2 grid place-items-center p-2 ">
                    <div
                        className={`
                            ${
                                element.elementName === currentElement
                                    ? `bg-blues-b50`
                                    : ``
                            }
                            w-auto hover:bg-blues-b50 py-1 px-1
       border border-transparent  
      transition-all ease-in-out duration-300 cursor-pointer`}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (element.hasDrawer) {
                                setToggleDrawer(true)
                                setListElements(element.drawerData)
                            } else {
                                addElement(element.elementName)
                                setCurrentElementInBoard(element.elementName)
                            }
                        }}
                    >
                        <div className="w-full h-6">
                            <img
                                className="w-full h-6"
                                src={element.elementSVG}
                            />
                        </div>
                        {/* <div className="mt-2 p-1 text-xs text-center text-gray-600">
                        {element.elementDisplayName}
                    </div> */}
                        {/* <div
                        className="tooltip-child absolute text-center
                      w-36 left-2 -bottom-3  py-1 rounded-lg
                       bg-neutrals-n300 text-white text-xs
                       "
                    >
                        Click element to add
                    </div> */}
                    </div>
                </div>
            </>
        )
    }

    const renderDrawerStack = (element) => {
        return (
            <>
                <div className="w-full block p-2 h-full pr-2 pl-2 ">
                    <div
                        className="bg-neutrals-n20 element-image-block tooltip-parent relative  
      hover:shadow-lg border border-transparent hover:border-primary-blue transition-all ease-in-out duration-300 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation()
                            if (element.hasDrawer) {
                                setToggleDrawer(true)
                            } else {
                                addElement(element.elementName)
                            }
                        }}
                    >
                        <div className="w-full h-14">
                            <img
                                className="w-full h-14"
                                src={element.elementSVG}
                            />
                        </div>
                        <div className="mt-2 p-1 text-xs text-center text-gray-600">
                            {element.elementDisplayName}
                        </div>
                        <div
                            className="tooltip-child absolute text-center
                      w-36 left-2 -bottom-3  py-1 rounded-lg
                       bg-neutrals-n300 text-white text-xs
                       "
                        >
                            Click element to add
                        </div>
                    </div>
                </div>
            </>
        )
    }

    const unsetToggleDrawer = () => {
        setToggleDrawer(false)
        setListElements(staticPrimaryElementData)
    }

    let secondarySidebarClass = classnames(
        'transition-all ease-in-out duration-300 secondary-sidebar-content fixed bg-white block text-left pb-4 rounded-md shadow-lg',
        {
            'w-48': toggleDrawer === true,
            'w-24': toggleDrawer === false,
        }
    )
    return (
        <div
            tabIndex="-1"
            id="elements-dropdown-container"
            className={secondarySidebarClass}
            style={{
                // top: '64px',
                left: '10px',
            }}
        >
            {getComponentTypesLoading ? (
                <div
                    className="w-full flex justify-center "
                    style={{ minHeight: '550px' }}
                >
                    {' '}
                    <Spinner />
                </div>
            ) : (
                <div
                    className="w-full overflow-y-auto "
                    style={{ height: '550px' }}
                >
                    {toggleDrawer ? (
                        <Button
                            intent="secondary"
                            size="small"
                            onClick={unsetToggleDrawer}
                            extendClass="font-semibold border-none hover:shadow-none"
                        >
                            <div className="flex items-center ">
                                <img
                                    className="w-6 h-6 transform-rotate-180 "
                                    src={RightArrowBlackSVG}
                                />
                            </div>
                        </Button>
                    ) : null}

                    <div className="">
                        {listElements.length > 0
                            ? listElements.map((stack, index) => (
                                  <React.Fragment key={index}>
                                      {toggleDrawer ? (
                                          renderDrawerStack(stack)
                                      ) : (
                                          <>
                                              <div className="pt-2 border-b border-neutrals-n60">
                                                  <div className="w-full text-black font-normal text-sm pl-2">
                                                      {stack.sectionName}
                                                  </div>

                                                  <div className="flex flex-wrap">
                                                      {stack.elements.map(
                                                          (element, i) => (
                                                              <React.Fragment
                                                                  key={i}
                                                              >
                                                                  {renderPrimaryStack(
                                                                      element
                                                                  )}
                                                              </React.Fragment>
                                                          )
                                                      )}
                                                  </div>
                                              </div>
                                          </>
                                      )}
                                  </React.Fragment>
                              ))
                            : null}
                    </div>

                    <div>
                        {/* <div className="w-full text-black font-normal text-sm pl-2">
                            Defaults
                        </div> */}

                        {!toggleDrawer && (
                            <div
                                id="stroke-width-section"
                                className="pt-3 px-2"
                            >
                                <div className="w-full text-black font-normal text-xs pl-0 mb-2">
                                    Stroke width
                                </div>
                                <div className="flex gap-2">
                                    {STROKE_WIDTHS.map(
                                        ({ label, borderClass, value }) => (
                                            <button
                                                key={value}
                                                onClick={() =>
                                                    setDefaultLinewidthInBoard(
                                                        value
                                                    )
                                                }
                                                className={`flex-1 w-4 h-6 flex items-center justify-center rounded cursor-pointer transition-all ease-in-out duration-200 ${
                                                    defaultLinewidth ===
                                                    value
                                                        ? 'bg-blues-b50'
                                                        : 'hover:bg-blues-b50'
                                                }`}
                                                style={{
                                                    border:
                                                        defaultLinewidth ===
                                                        value
                                                            ? '2px solid #0052cc'
                                                            : '1px solid #e5e7eb',
                                                }}
                                            >
                                                <div
                                                    className={`w-full mx-2 ${borderClass}`}
                                                    style={{
                                                        borderColor: '#0052cc',
                                                    }}
                                                />
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        )}

                        {!toggleDrawer && (
                            <div id="stroke-type-section" className="pt-3 px-2">
                                <div className="w-full text-black font-normal text-xs pl-0 mb-2">
                                    Stroke type
                                </div>
                                <div className="flex gap-2">
                                    {STROKE_TYPES.map(({ label, value }) => (
                                        <button
                                            key={value}
                                            onClick={() =>
                                                setSelectedStrokeType(value)
                                            }
                                            className={`flex-1 w-4 h-6 flex items-center justify-center rounded cursor-pointer transition-all ease-in-out duration-200 ${
                                                selectedStrokeType === value
                                                    ? 'bg-blues-b50'
                                                    : 'hover:bg-blues-b50'
                                            }`}
                                            style={{
                                                border:
                                                    selectedStrokeType === value
                                                        ? '2px solid #0052cc'
                                                        : '1px solid #e5e7eb',
                                            }}
                                        >
                                            <span
                                                className="text-base font-bold tracking-widest"
                                                style={{ color: '#0052cc' }}
                                            >
                                                {label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

ElementsDropdown.propTypes = {
    getComponentTypesLoading: Proptypes.bool,
    addElement: Proptypes.func,
}

export default ElementsDropdown
