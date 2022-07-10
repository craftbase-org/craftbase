import React, { Component } from 'react'

import Icon from 'icons/icon'
import AvatarSVG from 'wireframeAssets/avatar.svg'
import ButtonSVG from 'wireframeAssets/btn.svg'
import ButtonWithIconSVG from 'wireframeAssets/btnWithIcon.svg'
import ImageCardSVG from 'wireframeAssets/imageCard.svg'
import ToggleSVG from 'wireframeAssets/toggle.svg'
import DividerSVG from 'wireframeAssets/divider.svg'
import RadioboxSVG from 'wireframeAssets/radiobox.svg'
import CheckboxSVG from 'wireframeAssets/checkbox.svg'
import FrameSVG from 'wireframeAssets/frame.svg'

import CircleIcon from 'wireframeAssets/circle.svg'
import RectangleIcon from 'wireframeAssets/rectangle.svg'
import TextIcon from 'wireframeAssets/text.svg'
import RightArrowIcon from 'assets/right_arrow.svg'

import OverlayPNG from 'assets/overlay.png'
import Spinner from 'components/common/spinnerWithSize'
import { useState } from 'react'

const staticElementData = [
    {
        elementName: 'arrowLine',
        elementDisplayName: 'Arrow',
        elementSVG: RightArrowIcon,
    },
    {
        elementName: 'avatar',
        elementDisplayName: 'Avatar',
        elementSVG: AvatarSVG,
    },
    {
        elementName: 'toggle',
        elementDisplayName: 'Toggle',
        elementSVG: ToggleSVG,
    },

    {
        elementName: 'button',
        elementDisplayName: 'Button',
        elementSVG: ButtonSVG,
    },
    {
        elementName: 'circle',
        elementDisplayName: 'Circle',
        elementSVG: CircleIcon,
    },
    {
        elementName: 'imageCard',
        elementDisplayName: 'Image Card',
        elementSVG: ImageCardSVG,
    },
    { elementName: 'frame', elementDisplayName: 'Frame', elementSVG: FrameSVG },
    {
        elementName: 'buttonWithIcon',
        elementDisplayName: 'Button With Icon',
        elementSVG: ButtonWithIconSVG,
    },
    {
        elementName: 'divider',
        elementDisplayName: 'Divider',
        elementSVG: DividerSVG,
    },
    {
        elementName: 'rectangle',
        elementDisplayName: 'Rectangle',
        elementSVG: RectangleIcon,
    },
    {
        elementName: 'overlay',
        elementDisplayName: 'Overlay',
        elementSVG: OverlayPNG,
    },
    {
        elementName: 'radiobox',
        elementDisplayName: 'Radio Control',
        elementSVG: RadioboxSVG,
    },
    {
        elementName: 'checkbox',
        elementDisplayName: 'Checkbox Control',
        elementSVG: CheckboxSVG,
    },
    {
        elementName: 'text',
        elementDisplayName: 'Text',
        elementSVG: TextIcon,
    },
    // { elementName: '---', elementDisplayName: '---', elementSVG: '---' },
]

const ElementsDropdown = (props) => {
    const [listElements, setListElements] = useState([...staticElementData])

    const onChangeSearchBar = (e) => {
        const value = e.target.value.trim().toLowerCase()
        console.log('value', value)
        const updatedList = staticElementData.filter((item) =>
            item.elementDisplayName.toLowerCase().includes(value)
        )
        console.log('updatedList', updatedList)
        if (value === '') {
            setListElements([...staticElementData])
        } else {
            setListElements([...updatedList])
        }
    }

    return (
        <div
            tabIndex="-1"
            id="sec-sidebar"
            className=" transition-all ease-in-out duration-300 
        secondary-sidebar-content 
          fixed
         
        w-48  bg-white block text-left
          pb-4
         
         rounded-md shadow-lg
        "
            style={{
                top: '64px',

                // opacity: this.props.showMenu ? 1 : 0,
                left: props.showMenu ? '18px' : '-400px',
                // display: this.props.showMenu ? 'block' : 'none',
            }}
            onBlur={() => {
                // props.handleOnBlur()
            }}
        >
            <div className="px-0 pb-2  ">
                <input
                    className="w-full  px-2 py-2 bg-neutrals-n20 rounded-t-md 
                    border-b border-neutrals-n40 text-base focus:outline-none"
                    type="text"
                    onChange={onChangeSearchBar}
                    placeholder="Search elements"
                />
            </div>
            {props.getComponentTypesLoading ? (
                <div
                    className="w-full flex justify-center"
                    style={{ minHeight: '550px' }}
                >
                    {' '}
                    <Spinner />
                </div>
            ) : (
                <div
                    className="w-full overflow-y-auto pr-2 pl-2"
                    style={{ height: '550px' }}
                >
                    {listElements.length > 0
                        ? listElements.map((element, index) => (
                              <React.Fragment key={index}>
                                  <div className="w-full block p-2 ">
                                      <div
                                          className="element-image-block tooltip-parent relative bg-neutrals-n20 
      hover:shadow-lg border border-transparent hover:border-primary-blue transition-all ease-in-out duration-300 cursor-pointer"
                                          onClick={(e) => {
                                              e.stopPropagation()
                                              props.addElement(
                                                  element.elementName
                                              )
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
                              </React.Fragment>
                          ))
                        : null}
                </div>
            )}
        </div>
    )
}

export default ElementsDropdown
