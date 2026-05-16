// Note: these consts are not currently re-exported or imported elsewhere; the
// file appears to be a reference/documentation of element shapes only. Kept
// for parity with the legacy JS module — convert in-place rather than removing.

interface CircleSchema {
    id: string
    name: 'circle'
    width: number
    height: number
    x: number
    y: number
    bg_color: string
}

interface DividerSchema {
    id: string
    name: 'divider'
    width: number
    height: number
    x: number
    y: number
    start_pos: string
    end_pos: string
    stroke_color: string
}

interface RectangleSchema {
    id: string
    name: 'rectangle'
    width: number
    height: number
    x: number
    y: number
    bg_color: string
}

interface TextSchema {
    id: string
    name: 'text'
    width: number
    height: number
    x: number
    y: number
    text: string
    text_color: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const circle: CircleSchema = {
    id: '',
    name: 'circle',
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    bg_color: '',
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const divider: DividerSchema = {
    id: '',
    name: 'divider',
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    start_pos: '',
    end_pos: '',
    stroke_color: '',
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const rectangle: RectangleSchema = {
    id: '',
    name: 'rectangle',
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    bg_color: '',
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const text: TextSchema = {
    id: '',
    name: 'text',
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    text: '',
    text_color: '',
}

export {}
