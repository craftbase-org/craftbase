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

import CirclePNG from 'assets/circle.png'

import DropdownPNG from 'assets/dropdown.png'

import LinkWithIconPNG from 'assets/linkwithicon.png'
import OverlayPNG from 'assets/overlay.png'
import Spinner from 'components/common/spinnerWithSize'
import RectanglePNG from 'assets/rectangle.png'
import TextPNG from 'assets/text.png'
import TextInputPNG from 'assets/textinput.png'

const elementMetaJSON = [
    {
        elementName: 'avatar',
        elementDisplayName: 'Avatar',
        elementSVG: AvatarSVG,
    },
    {
        elementName: 'buttonWithIcon',
        elementDisplayName: 'Button With Icon',
        elementSVG: ButtonWithIconSVG,
    },
    {
        elementName: 'button',
        elementDisplayName: 'Button',
        elementSVG: ButtonSVG,
    },
    {
        elementName: 'imageCard',
        elementDisplayName: 'Image Card',
        elementSVG: ImageCardSVG,
    },
    { elementName: 'frame', elementDisplayName: 'Frame', elementSVG: FrameSVG },
    {
        elementName: 'toggle',
        elementDisplayName: 'Toggle',
        elementSVG: ToggleSVG,
    },
    {
        elementName: 'divider',
        elementDisplayName: 'Divider',
        elementSVG: DividerSVG,
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
]

const ElementsDropdown = (props) => {
    return (
        <div
            tabIndex="-1"
            id="sec-sidebar"
            className=" transition-all ease-in-out duration-300 
        secondary-sidebar-content 
          fixed
         
        w-48  bg-white block text-left
         pt-2 pb-4
         pr-2 pl-2
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
            {props.getComponentTypesLoading ? (
                <div
                    className="text-primary-blue"
                    style={{ minHeight: '550px' }}
                >
                    {' '}
                    <Spinner />
                </div>
            ) : (
                <div
                    className="w-full flex flex-wrap overflow-y-auto"
                    style={{ height: '550px' }}
                >
                    {elementMetaJSON.map((element, index) => (
                        <React.Fragment key={index}>
                            <div className="w-full block p-2 ">
                                <div
                                    className="element-image-block  bg-neutrals-n20 
                    hover:shadow-lg cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        props.addElement(element.elementName)
                                    }}
                                >
                                    <div className="w-full h-20">
                                        <img
                                            className="w-full h-20"
                                            src={element.elementSVG}
                                        />
                                    </div>
                                    <div className="mt-2 p-1 text-sm text-center text-gray-600">
                                        {element.elementDisplayName}
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    )
}

export default ElementsDropdown
