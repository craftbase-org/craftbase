import CircleIcon from 'wireframeAssets/circle.svg?react'
import RectangleIcon from 'wireframeAssets/rectangle.svg?react'
import ShapesIcon from 'wireframeAssets/shapes.svg?react'
import TextIcon from 'wireframeAssets/text.svg?react'
import PencilIcon from 'wireframeAssets/pencil.svg?react'
import PointerIcon from 'wireframeAssets/cursor.svg?react'
import EraserIcon from 'wireframeAssets/eraser.svg?react'

import RightArrowIcon from 'assets/right_arrow.svg?react'

export const color_blue = '#0052CC'
export const color_teal = '#008DA6'
export const color_green = '#006644'
export const color_red = '#BF2600'
export const color_slate = '#091E42'

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
]

export const staticPrimaryElementData = [
    {
        sectionName: 'Basic',
        elements: [
            {
                elementName: 'pointer',
                elementDisplayName: 'Pointer',
                elementIcon: PointerIcon,
                hasDrawer: false,
                noAction: true,
                drawerData: [],
            },
            {
                elementName: 'shapes',
                elementDisplayName: 'Shapes',
                elementIcon: ShapesIcon,
                hasDrawer: true,
                noAction: true,
                drawerData: [
                    {
                        elementName: 'rectangle',
                        elementDisplayName: 'Rectangle / Square',
                        elementIcon: RectangleIcon,
                    },
                    {
                        elementName: 'circle',
                        elementDisplayName: 'Circle',
                        elementIcon: CircleIcon,
                    },
                ],
            },
            {
                elementName: 'arrowLine',
                elementDisplayName: 'Arrow',
                elementIcon: RightArrowIcon,
                hasDrawer: false,
                noAction: false,
                drawerData: [],
            },
            {
                elementName: 'pencil',
                elementDisplayName: 'Pencil',
                elementIcon: PencilIcon,
                hasDrawer: false,
                noAction: false,
                drawerData: [],
            },

            {
                elementName: 'text',
                elementDisplayName: 'Text',
                elementIcon: TextIcon,
                hasDrawer: false,
                noAction: false,
                drawerData: [],
            },
            {
                elementName: 'rubber',
                elementDisplayName: 'Eraser',
                elementIcon: EraserIcon,
                hasDrawer: false,
                noAction: true,
                drawerData: [],
            },
        ],
    },
]

export const TEXT_SIZES_ARRAY = [
    { label: 'S', value: 24, mobileValue: 12 },
    { label: 'M', value: 36, mobileValue: 18 },
    { label: 'L', value: 60, mobileValue: 28 },
    { label: 'XL', value: 72, mobileValue: 36 },
]

export const TEXT_SIZES_OBJECT = {
    S: 24,
    M: 36,
    L: 60,
    XL: 72,
}

export const MOBILE_TEXT_SIZES_OBJECT = {
    S: 12,
    M: 18,
    L: 28,
    XL: 36,
}
