import React, { Component } from 'react'
import Icon from 'icons/icon'
import AvatarPNG from 'assets/avatar.png'
import ButtonPNG from 'assets/button.png'
import ButtonWithIconPNG from 'assets/buttonWithIcon.png'

import CheckboxPNG from 'assets/checkbox.png'
import CirclePNG from 'assets/circle.png'
import DividerPNG from 'assets/divider.png'
import DropdownPNG from 'assets/dropdown.png'
import ImageCardPNG from 'assets/imageCard.png'
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
        document.getElementById('sec-sidebar').focus()
    }

    getItemRenderData = (item) => {
        switch (item) {
            case 'elements':
                return (
                    <div className="secondary-sidebar-content secondary-sidebar-elements w-96 px-2 py-2 bg-white block text-left">
                        <div className="w-full flex items-center flex-wrap">
                            <div className="w-1/2 block p-2 ">
                                <div className="element-image-block border border-gray-500 bg-neutrals-n20">
                                    <div className="w-full h-max-11vh">
                                        <img
                                            className="h-full mx-auto h-max-10vh p-2"
                                            src={ButtonPNG}
                                        />
                                    </div>
                                    <div className="mt-2 p-1 text-sm text-center text-gray-600">
                                        Button
                                    </div>
                                </div>
                            </div>
                            <div className="w-1/2 block p-2 ">
                                <div className="element-image-block border border-gray-500 bg-neutrals-n20">
                                    <div className="w-full h-max-11vh">
                                        <img
                                            className=" h-90-per h-max-10vh mx-auto p-2"
                                            src={ButtonWithIconPNG}
                                        />
                                    </div>
                                    <div className="mt-2 p-1 text-sm text-center text-gray-600">
                                        Button With Icon
                                    </div>
                                </div>
                            </div>
                            <div className="w-1/2 block p-2 ">
                                <div className="element-image-block border border-gray-500 bg-neutrals-n20">
                                    <div className="w-full h-max-11vh">
                                        <img
                                            className=" h-90-per h-max-10vh mx-auto p-2"
                                            src={ImageCardPNG}
                                        />
                                    </div>
                                    <div className="mt-2 p-1 text-sm text-center text-gray-600">
                                        Image Card
                                    </div>
                                </div>
                            </div>
                            <div className="w-1/2 block p-2 ">
                                <div className="element-image-block border border-gray-500 bg-neutrals-n20">
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
                                <div className="element-image-block border border-gray-500 bg-neutrals-n20">
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
                                <div className="element-image-block border border-gray-500 bg-neutrals-n20">
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
                                <div className="element-image-block border border-gray-500 bg-neutrals-n20">
                                    <div className="w-full h-max-11vh">
                                        <img
                                            className=" h-90-per h-max-10vh mx-auto p-2"
                                            src={AvatarPNG}
                                        />
                                    </div>
                                    <div className="mt-2 p-1 text-sm text-center text-gray-600">
                                        Avatar
                                    </div>
                                </div>
                            </div>
                            <div className="w-1/2 block p-2 ">
                                <div className="element-image-block border border-gray-500 bg-neutrals-n20">
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
                                <div className="element-image-block border border-gray-500 bg-neutrals-n20">
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
                                <div className="element-image-block border border-gray-500 bg-neutrals-n20">
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
                    </div>
                )
            case 'shapes':
                return (
                    <div className="secondary-sidebar-content secondary-sidebar-shapes w-32 px-2 py-2 bg-white block text-left">
                        <div className="block p-2 border border-gray-500 bg-neutrals-n20">
                            <img src={RectanglePNG} width={100} height={100} />
                            <div className="mt-2 text-center">Circle</div>
                        </div>
                        <div className="block p-2 border border-gray-500 bg-neutrals-n20">
                            <img src={CirclePNG} width={100} height={100} />
                            <div className="mt-2 text-center">Circle</div>
                        </div>
                    </div>
                )
            default:
                break
        }
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
                onBlur={() => {
                    console.log('sec sidebar on blur')

                    // This will also act if user doesn't select any item from secondary sidebar
                    // leading to no action for redux
                    this.props.handleOnBlur()
                }}
                className="relative "
            >
                {this.renderItems()}
            </div>
        )
    }
}

export default SecondarySidebar
