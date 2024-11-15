import AvatarSVG from 'wireframeAssets/avatar.svg'
import MiniAvatarSVG from 'wireframeAssets/miniAvatar.svg'
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
import PencilIcon from 'wireframeAssets/pencil.svg'
import PointerIcon from 'wireframeAssets/cursor.svg'

import RightArrowIcon from 'assets/right_arrow.svg'
import OverlayPNG from 'assets/overlay.png'

export const color_blue = '#0052CC'
export const color_teal = '#008DA6'
export const color_green = '#006644'
export const color_red = '#BF2600'
export const color_slate = '#091E42'

export const defaultScaleConstant = 73

export const properties = {
    colorBg: 'color_bg',
    colorText: 'color_text',
    colorIcon: 'color_icon',
    fontSize: 'font_size',
    fontWeight: 'font_weight',
    alignment: 'alignment',
    borderColor: 'border_color',
    borderWidth: 'border_width',
    borderStyle: 'border_style',
    underline: 'underline',
    opacity: 'opacity',
}

export const allColorShades = [
    'rgba(0,0,0,0.0)',
    '#BF2600',
    '#DE350B',
    '#FF5630',
    '#FF7452',
    '#FF8F73',
    '#FFBDAD',
    '#FFEBE6',

    '#FF8B00',
    '#FF991F',
    '#FFAB00',
    '#FFC400',
    '#FFE380',
    '#FFF0B3',
    '#FFFAE6',

    '#006644',
    '#00875A',
    '#36B37E',
    '#57D9A3',
    '#79F2C0',
    '#ABF5D1',
    '#E3FCEF',

    '#008DA6',
    '#00A3BF',
    '#00B8D9',
    '#00C7E6',
    '#79E2F2',
    '#B3F5FF',
    '#E6FCFF',

    '#0747A6',
    '#0052CC',
    '#0065FF',
    '#2684FF',
    '#4C9AFF',
    '#B3D4FF',
    '#DEEBFF',

    '#403294',
    '#5243AA',
    '#6554C0',
    '#8777D9',
    '#998DD9',
    '#C0B6F2',
    '#EAE6FF',

    '#172B4D',
    '#253858',
    '#42526E',
    '#5E6C84',
    '#7A869A',
    '#97A0AF',
]

export const essentialShades = [
    '#FFFFFF',
    '#FF5630',
    '#FFAB00',
    '#36B37E',
    '#00B8D9',
    '#0065FF',
    '#6554C0',
    '#42526E',
    '#7A869A',
]

export const staticDrawerData = {
    shapes: [
        {
            elementName: 'circle',
            elementDisplayName: 'Circle',
            elementSVG: CircleIcon,
            hasDrawer: false,
            noAction: false,
            drawerData: [],
        },
        {
            elementName: 'rectangle',
            elementDisplayName: 'Rectangle / Square',
            elementSVG: RectangleIcon,
            hasDrawer: false,
            noAction: false,
            drawerData: [],
        },
    ],
    mocks: [
        {
            elementName: 'avatar',
            elementDisplayName: 'Avatar',
            elementSVG: AvatarSVG,
            hasDrawer: false,
            noAction: false,
            drawerData: [],
        },
        {
            elementName: 'toggle',
            elementDisplayName: 'Toggle',
            elementSVG: ToggleSVG,
            hasDrawer: false,
            noAction: false,
            drawerData: [],
        },
        {
            elementName: 'button',
            elementDisplayName: 'Button',
            elementSVG: ButtonSVG,
            hasDrawer: false,
            noAction: false,
            drawerData: [],
        },

        {
            elementName: 'imageCard',
            elementDisplayName: 'Image Card',
            elementSVG: ImageCardSVG,
            hasDrawer: false,
            noAction: false,
            drawerData: [],
        },
        {
            elementName: 'frame',
            elementDisplayName: 'Frame',
            elementSVG: FrameSVG,
            hasDrawer: false,
            noAction: false,
            drawerData: [],
        },
        {
            elementName: 'buttonWithIcon',
            elementDisplayName: 'Button With Icon',
            elementSVG: ButtonWithIconSVG,
            hasDrawer: false,
            noAction: false,
            drawerData: [],
        },

        {
            elementName: 'overlay',
            elementDisplayName: 'Overlay',
            elementSVG: OverlayPNG,
            hasDrawer: false,
            noAction: false,
            drawerData: [],
        },
        {
            elementName: 'radiobox',
            elementDisplayName: 'Radio Control',
            elementSVG: RadioboxSVG,
            hasDrawer: false,
            noAction: false,
            drawerData: [],
        },
        {
            elementName: 'checkbox',
            elementDisplayName: 'Checkbox Control',
            elementSVG: CheckboxSVG,
            hasDrawer: false,
            noAction: false,
            drawerData: [],
        },
    ],
}

// export const staticPrimaryElementData = [
//     {
//         elementName: 'circle',
//         elementDisplayName: 'Circle',
//         elementSVG: CircleIcon,
//         hasDrawer: true,
//         drawerData: staticDrawerData.shapes,
//     },
//     {
//         elementName: 'arrowLine',
//         elementDisplayName: 'Arrow',
//         elementSVG: RightArrowIcon,
//         hasDrawer: false,
//         drawerData: [],
//     },
//     {
//         elementName: 'avatar',
//         elementDisplayName: 'Avatar',
//         elementSVG: MiniAvatarSVG,
//         hasDrawer: true,
//         drawerData: staticDrawerData.mocks,
//     },
//     {
//         elementName: 'divider',
//         elementDisplayName: 'Divider',
//         elementSVG: DividerSVG,
//         hasDrawer: false,
//         drawerData: [],
//     },
//     {
//         elementName: 'text',
//         elementDisplayName: 'Text',
//         elementSVG: TextIcon,
//         hasDrawer: false,
//         drawerData: [],
//     },
//     // { elementName: '---', elementDisplayName: '---', elementSVG: '---' },
// ]

export const staticPrimaryElementData = [
    {
        sectionName: 'Basic',
        elements: [
            {
                elementName: 'circle',
                elementDisplayName: 'Circle',
                elementSVG: CircleIcon,
                hasDrawer: false,
                noAction: false,
                drawerData: [],
            },
            {
                elementName: 'rectangle',
                elementDisplayName: 'Rectangle / Square',
                elementSVG: RectangleIcon,
                hasDrawer: false,
                noAction: false,
                drawerData: [],
            },
            {
                elementName: 'arrowLine',
                elementDisplayName: 'Arrow',
                elementSVG: RightArrowIcon,
                hasDrawer: false,
                noAction: false,
                drawerData: [],
            },
            {
                elementName: 'divider',
                elementDisplayName: 'Divider',
                elementSVG: DividerSVG,
                hasDrawer: false,
                noAction: false,
                drawerData: [],
            },
            {
                elementName: 'pencil',
                elementDisplayName: 'Pencil',
                elementSVG: PencilIcon,
                hasDrawer: false,
                noAction: false,
                drawerData: [],
            },
            {
                elementName: 'pointer',
                elementDisplayName: 'Pointer',
                elementSVG: PointerIcon,
                hasDrawer: false,
                noAction: true,
                drawerData: [],
            },
            {
                elementName: 'text',
                elementDisplayName: 'Text',
                elementSVG: TextIcon,
                hasDrawer: false,
                noAction: false,
                drawerData: [],
            },
        ],
    },
    {
        sectionName: 'Mocks (WIP)',
        elements: [
            {
                elementName: 'avatar',
                elementDisplayName: 'Avatar',
                elementSVG: MiniAvatarSVG,
                hasDrawer: true,
                drawerData: staticDrawerData.mocks,
            },
        ],
    },

    // { elementName: '---', elementDisplayName: '---', elementSVG: '---' },
]
