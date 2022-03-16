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

import CirclePNG from 'assets/circle.png'

import DropdownPNG from 'assets/dropdown.png'

import LinkWithIconPNG from 'assets/linkwithicon.png'
import OverlayPNG from 'assets/overlay.png'

import RectanglePNG from 'assets/rectangle.png'
import TextPNG from 'assets/text.png'
import TextInputPNG from 'assets/textinput.png'

const ElementsDropdown = (props) => {
    return (
        <div
            tabIndex="-1"
            id="sec-sidebar"
            className=" transition-all ease-in-out duration-300 
        secondary-sidebar-content 
          fixed
         
        w-96  bg-white block text-left
         pt-2 pb-4
         pr-2 pl-2
         rounded-md shadow-lg
        "
            style={{
                top: '64px',

                // opacity: this.props.showMenu ? 1 : 0,
                left: props.showMenu ? '21px' : '-400px',
                // display: this.props.showMenu ? 'block' : 'none',
            }}
            onBlur={() => {
                props.handleOnBlur()
            }}
        >
            <div
                className="w-full flex items-center flex-wrap overflow-y-auto"
                style={{ height: '550px' }}
            >
                <div className="w-1/2 block p-2 ">
                    <div
                        className="element-image-block  bg-neutrals-n20 
                    hover:shadow-lg cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation()
                            props.addElement('avatar')
                        }}
                    >
                        <div className="w-full h-20">
                            <img className="w-full h-20" src={AvatarSVG} />
                        </div>
                        <div className="mt-2 p-1 text-sm text-center text-gray-600">
                            Avatar
                        </div>
                    </div>
                </div>
                <div className="w-1/2 block p-2  ">
                    <div
                        className="element-image-block  bg-neutrals-n20 
                    hover:shadow-lg cursor-pointer"
                    >
                        <div className="w-full h-20">
                            <img
                                className="w-full h-20"
                                src={ButtonWithIconSVG}
                            />
                        </div>
                        <div className="mt-2 p-1 text-sm text-center text-gray-600">
                            Button With Icon
                        </div>
                    </div>
                </div>
                <div className="w-1/2 block p-2 ">
                    <div
                        className="element-image-block  bg-neutrals-n20 
                    hover:shadow-lg cursor-pointer"
                    >
                        <div className="w-full h-20">
                            <img className="w-full h-20" src={ButtonSVG} />
                        </div>
                        <div className="mt-2 p-1 text-sm text-center text-gray-600">
                            Button
                        </div>
                    </div>
                </div>

                <div className="w-1/2 block p-2 ">
                    <div
                        className="element-image-block  bg-neutrals-n20 
                    hover:shadow-lg cursor-pointer"
                    >
                        <div className="w-full h-20">
                            <img className="w-full h-20" src={ImageCardSVG} />
                        </div>
                        <div className="mt-2 p-1 text-sm text-center text-gray-600">
                            Image Card
                        </div>
                    </div>
                </div>
                <div className="w-1/2 block p-2 ">
                    <div
                        className="element-image-block  bg-neutrals-n20 
                    hover:shadow-lg cursor-pointer"
                    >
                        <div className="w-full h-20">
                            <img className="w-full h-20" src={ToggleSVG} />
                        </div>
                        <div className="mt-2 p-1 text-sm text-center text-gray-600">
                            Toggle
                        </div>
                    </div>
                </div>
                <div className="w-1/2 block p-2 ">
                    <div
                        className="element-image-block  bg-neutrals-n20 
                    hover:shadow-lg cursor-pointer"
                    >
                        <div className="w-full h-20">
                            <img
                                className="w-full h-20 px-10"
                                src={DividerSVG}
                            />
                        </div>
                        <div className="mt-2 p-1 text-sm text-center text-gray-600">
                            Divider
                        </div>
                    </div>
                </div>
                {/* <div className="w-1/2 block p-2 ">
                    <div className="element-image-block  bg-neutrals-n20">
                        <div className="w-full h-max-11vh">
                            <img
                                className=" h-90-per h-max-10vh mx-auto p-2"
                                src={LinkWithIconPNG}
                            />
                        </div>
                        <div className="mt-2 p-1 text-sm text-center text-gray-600">
                            Link with Icon
                        </div>
                    </div>
                </div> */}

                <div className="w-1/2 block p-2 ">
                    <div
                        className="element-image-block  bg-neutrals-n20 
                    hover:shadow-lg cursor-pointer"
                    >
                        <div className="w-full h-20">
                            <img
                                className="w-full h-20 px-10"
                                src={OverlayPNG}
                            />
                        </div>
                        <div className="mt-2 p-1 text-sm text-center text-gray-600">
                            Overlay
                        </div>
                    </div>
                </div>
                <div className="w-1/2 block p-2 ">
                    <div
                        className="element-image-block  bg-neutrals-n20 
                    hover:shadow-lg cursor-pointer"
                    >
                        <div className="w-full h-20">
                            <img
                                className="w-full h-20 px-10"
                                src={RadioboxSVG}
                            />
                        </div>
                        <div className="mt-2 p-1 text-sm text-center text-gray-600">
                            Radio Control
                        </div>
                    </div>
                </div>
                <div className="w-1/2 block p-2 ">
                    <div
                        className="element-image-block  bg-neutrals-n20 
                    hover:shadow-lg cursor-pointer"
                    >
                        <div className="w-full h-20">
                            <img
                                className="w-full h-20 px-10"
                                src={CheckboxSVG}
                            />
                        </div>
                        <div className="mt-2 p-1 text-sm text-center text-gray-600">
                            Checkbox Control
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ElementsDropdown
