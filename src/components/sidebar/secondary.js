import React, { Component } from 'react'
import Icon from 'icons/icon'
import AvatarSVG from 'wireframeAssets/avatar.svg'
import ButtonSVG from 'wireframeAssets/btn.svg'
import ButtonWithIconSVG from 'wireframeAssets/btnWithIcon.svg'
import ImageCardSVG from 'wireframeAssets/imageCard.svg'

import CheckboxPNG from 'assets/checkbox.png'
import CirclePNG from 'assets/circle.png'
import DividerPNG from 'assets/divider.png'
import DropdownPNG from 'assets/dropdown.png'

import LinkWithIconPNG from 'assets/linkwithicon.png'
import OverlayPNG from 'assets/overlay.png'
import RadioboxPNG from 'assets/radiobox.png'
import RectanglePNG from 'assets/rectangle.png'
import TextPNG from 'assets/text.png'
import TextInputPNG from 'assets/textinput.png'
import TogglePNG from 'assets/toggle.svg'

class SecondarySidebar extends Component {
    constructor(props) {
        super(props)
        this.state = {
            selectedItem: 'shapes',
        }
    }

    componentDidMount() {
        // setting focus on secondary sidebar to have blur event
        // effective right on from that
    }

    getItemRenderData = (item) => {
        return (
            <div className="w-full flex items-center flex-wrap">
                <div className="w-1/2 block p-2 ">
                    <div
                        className="element-image-block  bg-neutrals-n20 
                    hover:shadow-lg cursor-pointer"
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
                    <div className="element-image-block  bg-neutrals-n20">
                        <div className="w-full h-max-11vh">
                            <img
                                className=" h-90-per h-max-10vh mx-auto p-2"
                                src={TogglePNG}
                            />
                        </div>
                        <div className="mt-2 p-1 text-sm text-center text-gray-600">
                            Toggle
                        </div>
                    </div>
                </div>
                <div className="w-1/2 block p-2 ">
                    <div className="element-image-block  bg-neutrals-n20">
                        <div className="w-full h-max-11vh">
                            <img
                                className=" h-90-per h-max-10vh mx-auto p-2"
                                src={DividerPNG}
                            />
                        </div>
                        <div className="mt-2 p-1 text-sm text-center text-gray-600">
                            Divider
                        </div>
                    </div>
                </div>
                <div className="w-1/2 block p-2 ">
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
                </div>

                <div className="w-1/2 block p-2 ">
                    <div className="element-image-block  bg-neutrals-n20">
                        <div className="w-full h-max-11vh">
                            <img
                                className=" h-90-per h-max-10vh mx-auto p-2"
                                src={OverlayPNG}
                            />
                        </div>
                        <div className="mt-2 p-1 text-sm text-center text-gray-600">
                            Overlay
                        </div>
                    </div>
                </div>
                <div className="w-1/2 block p-2 ">
                    <div className="element-image-block  bg-neutrals-n20">
                        <div className="w-full h-max-11vh">
                            <img
                                className=" h-90-per h-max-10vh mx-auto p-2"
                                src={RadioboxPNG}
                            />
                        </div>
                        <div className="mt-2 p-1 text-sm text-center text-gray-600">
                            Radio Control
                        </div>
                    </div>
                </div>
                <div className="w-1/2 block p-2 ">
                    <div className="element-image-block  bg-neutrals-n20">
                        <div className="w-full h-max-11vh">
                            <img
                                className=" h-90-per h-max-10vh mx-auto p-2"
                                src={CheckboxPNG}
                            />
                        </div>
                        <div className="mt-2 p-1 text-sm text-center text-gray-600">
                            Checkbox Control
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    renderItems = () => {
        const selectedItems = this.props.selectedItem
        const toRender = this.getItemRenderData(selectedItems)

        return toRender
    }

    render() {
        return (
            <div
                tabIndex="-1"
                id="sec-sidebar"
                className=" transition-all ease-in-out duration-300 
                secondary-sidebar-content 
                 overflow-y-auto fixed
                 
                w-96  bg-white block text-left
                 border-b-8 border-white 
                 rounded-md shadow-lg
                "
                style={{
                    top: '64px',
                    height: '350px',
                    // opacity: this.props.showMenu ? 1 : 0,
                    left: this.props.showMenu ? '21px' : '-400px',
                    // display: this.props.showMenu ? 'block' : 'none',
                }}
                onBlur={() => {
                    this.props.handleOnBlur()
                }}
            >
                {this.renderItems()}
            </div>
        )
    }
}

export default SecondarySidebar
