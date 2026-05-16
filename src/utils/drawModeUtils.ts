import {
    ARROW_DRAW_MODE_KEY,
    TEXT_DRAW_MODE_KEY,
    PENDING_SHAPE_TYPE_KEY,
    PENDING_SHAPE_PROPS_KEY,
    LAST_ADDED_ELEMENT_ID_KEY,
    RUBBER_MODE_KEY,
    PENCIL_MODE_KEY,
    PAN_MODE_KEY,
} from '../constants/misc'

export function getArrowDrawMode(): string | null {
    return localStorage.getItem(ARROW_DRAW_MODE_KEY)
}

export function getTextDrawMode(): string | null {
    return localStorage.getItem(TEXT_DRAW_MODE_KEY)
}

export function getPendingShapeType(): string | null {
    return localStorage.getItem(PENDING_SHAPE_TYPE_KEY)
}

export function getPendingShapeProps(): string | null {
    return localStorage.getItem(PENDING_SHAPE_PROPS_KEY)
}

export function getLastAddedElementId(): string | null {
    return localStorage.getItem(LAST_ADDED_ELEMENT_ID_KEY)
}

export function clearAllDrawModes(): void {
    localStorage.removeItem(ARROW_DRAW_MODE_KEY)
    localStorage.removeItem(TEXT_DRAW_MODE_KEY)
    localStorage.removeItem(PENDING_SHAPE_TYPE_KEY)
    localStorage.removeItem(PENDING_SHAPE_PROPS_KEY)
    localStorage.removeItem(LAST_ADDED_ELEMENT_ID_KEY)
    localStorage.removeItem(RUBBER_MODE_KEY)
    localStorage.removeItem(PENCIL_MODE_KEY)
    localStorage.removeItem(PAN_MODE_KEY)
}

export function isPanMode(): boolean {
    return localStorage.getItem(PAN_MODE_KEY) === 'true'
}

// Returns true when the user is in normal select/pan mode (no draw tool active).
export function isSelectPanMode(isPencilMode: boolean): boolean {
    return (
        !isPencilMode &&
        getArrowDrawMode() !== 'true' &&
        getTextDrawMode() !== 'true' &&
        getPendingShapeType() === null &&
        localStorage.getItem(RUBBER_MODE_KEY) !== 'true'
    )
}
