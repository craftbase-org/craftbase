import {
    ARROW_DRAW_MODE_KEY,
    TEXT_DRAW_MODE_KEY,
    PENDING_SHAPE_TYPE_KEY,
    PENDING_SHAPE_PROPS_KEY,
    LAST_ADDED_ELEMENT_ID_KEY,
    RUBBER_MODE_KEY,
    PENCIL_MODE_KEY,
} from '../constants/misc'

export function getArrowDrawMode() {
    return localStorage.getItem(ARROW_DRAW_MODE_KEY)
}

export function getTextDrawMode() {
    return localStorage.getItem(TEXT_DRAW_MODE_KEY)
}

export function getPendingShapeType() {
    return localStorage.getItem(PENDING_SHAPE_TYPE_KEY)
}

export function getPendingShapeProps() {
    return localStorage.getItem(PENDING_SHAPE_PROPS_KEY)
}

export function getLastAddedElementId() {
    return localStorage.getItem(LAST_ADDED_ELEMENT_ID_KEY)
}

export function clearAllDrawModes() {
    localStorage.removeItem(ARROW_DRAW_MODE_KEY)
    localStorage.removeItem(TEXT_DRAW_MODE_KEY)
    localStorage.removeItem(PENDING_SHAPE_TYPE_KEY)
    localStorage.removeItem(PENDING_SHAPE_PROPS_KEY)
    localStorage.removeItem(LAST_ADDED_ELEMENT_ID_KEY)
    localStorage.removeItem(RUBBER_MODE_KEY)
    localStorage.removeItem(PENCIL_MODE_KEY)
}

// Returns true when the user is in normal select/pan mode (no draw tool active).
export function isSelectPanMode(isPencilMode) {
    return (
        !isPencilMode &&
        getArrowDrawMode() !== 'true' &&
        getTextDrawMode() !== 'true' &&
        getPendingShapeType() === null &&
        localStorage.getItem(RUBBER_MODE_KEY) !== 'true'
    )
}
