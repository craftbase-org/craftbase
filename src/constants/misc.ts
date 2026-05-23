export const offsetHeight = 0
export const GROUP_COMPONENT = 'groupobject'
export const RUBBER_MODE_KEY = 'rubberMode'
export const VIEWPORT_KEY_PREFIX = 'craftbase_viewport_'
export const MOBILE_VIEWPORT_KEY_PREFIX = 'craftbase_mobile_viewport_'
export const VIEWPORT_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const componentTypes = {
    rectangle: 'rectangle',
    diamond: 'diamond',
    circle: 'circle',
    point: 'point',
    area: 'area',
    route: 'route',
} as const

// Geo objects (point/area/route) ride the same components_component pipeline as
// shapes — they're just a distinct category surfaced when a consumer opts in.
export const geoObjectTypes = {
    point: 'point',
    area: 'area',
    route: 'route',
} as const

export type GeoObjectType = keyof typeof geoObjectTypes

export const isGeoType = (type: string | null | undefined): boolean =>
    type === geoObjectTypes.point ||
    type === geoObjectTypes.area ||
    type === geoObjectTypes.route

// Draw mode localStorage keys
export const ARROW_DRAW_MODE_KEY = 'arrowDrawMode'
export const TEXT_DRAW_MODE_KEY = 'textDrawMode'
export const PENDING_SHAPE_TYPE_KEY = 'pendingShapeType'
export const PENDING_SHAPE_PROPS_KEY = 'pendingShapeProps'
export const LAST_ADDED_ELEMENT_ID_KEY = 'lastAddedElementId'
export const PENCIL_MODE_KEY = 'pencilMode'
export const PAN_MODE_KEY = 'panMode'

// Geo draw modes. AREA/ROUTE use multi-click vertex placement; POINT is a
// single click-to-place. The active geo type is stashed alongside the flag.
export const GEO_DRAW_MODE_KEY = 'geoDrawMode'
export const GEO_DRAW_TYPE_KEY = 'geoDrawType'
export const GEO_DRAW_PROPS_KEY = 'geoDrawProps'
export const GEO_POINT_PLACE_MODE_KEY = 'geoPointPlaceMode'

// Pin/point counter-scale: 1/scale^resist keeps the pin legible when zoomed
// out (0 = fully fixed on screen, 1 = scales with the world).
export const DEFAULT_GEO_RESIST = 0.9
export const DEFAULT_GEO_RING_RADIUS = 22

// Default "pin" icon embedded inside a point. Consumers can override per-point
// via metadata.svgIcon. currentColor lets the point recolor it to its stroke.
export const DEFAULT_PIN_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" fill="currentColor"/></svg>'

// Per-type initial defaults for new geo objects (distinct, map-appropriate
// colors from the prototypes). Users recolor afterward via the properties
// toolbar. Kept client-side so geo creation doesn't depend on a DB round-trip.
export const GEO_TYPE_DEFAULTS: Record<
    GeoObjectType,
    { stroke: string; linewidth: number }
> = {
    point: { stroke: '#C4501A', linewidth: 3 },
    area: { stroke: '#A32D2D', linewidth: 2 },
    route: { stroke: '#3B82F6', linewidth: 3 },
}

// Minimum vertices required to finish a multi-click geo draw.
export const GEO_MIN_VERTICES: Record<'area' | 'route', number> = {
    area: 3,
    route: 2,
}

// Default colors
export const PENCIL_DEFAULT_COLOR = '#3A342C'
export const SHAPE_DEFAULT_STROKE = '#3A342C'

// Draft persistence
export const DRAFT_STORAGE_KEY = 'craftbase_local_draft'
export const DRAFT_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000
export const BACKGROUND_BOARD_STORAGE_KEY = 'craftbase_background_board_id'
export const STORAGE_QUOTA_ERROR_NAME = 'QuotaExceededError'

// Canvas rendering constants
export const HOVER_THRESHOLD = 15
export const HOVER_COLOR = 'rgba(196, 144, 26, 0.7)'
export const SELECTION_PREVIEW_STROKE = '#505F79'
export const DEFAULT_PREVIEW_OPACITY = 0.6
export const LINE_HEIGHT_MULTIPLIER = 1.6
export const PENCIL_DISTANCE_THROTTLE = 3
export const DEFAULT_TEXT_SIZE = 36
