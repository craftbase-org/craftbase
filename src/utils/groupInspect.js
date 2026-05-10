// Inspect the children of a focused group and report, per property:
//   - the common value, if every child that *can* accept the property has it
//     and they all agree
//   - MIXED sentinel, if there's disagreement among accepting children
//   - null, if no child in the group accepts the property at all
//
// The toolbar uses this to show a real value (or a "Mixed" indicator) when a
// group is focused, instead of always falling back to defaults.

export const MIXED = '__MIXED__'

// Mirrors the acceptance map in applyGroupProperty.js. Kept in sync manually
// — this is small and changes rarely.
const ACCEPTS = {
    fill: new Set(['rectangle', 'circle', 'diamond', 'frame', 'newText']),
    stroke: new Set([
        'rectangle',
        'circle',
        'diamond',
        'frame',
        'arrowLine',
        'pencil',
    ]),
    linewidth: new Set([
        'rectangle',
        'circle',
        'diamond',
        'frame',
        'arrowLine',
        'pencil',
    ]),
    strokeType: new Set([
        'rectangle',
        'circle',
        'diamond',
        'frame',
        'arrowLine',
        'divider',
        'pencil',
    ]),
    opacity: new Set([
        'rectangle',
        'circle',
        'diamond',
        'frame',
        'arrowLine',
        'newText',
    ]),
    textColor: new Set(['newText', 'rectangle']),
    textSize: new Set(['newText', 'rectangle']),
    textFontFamily: new Set(['newText', 'rectangle']),
}

// Pull the per-property value out of a child entry. Returns undefined if the
// child doesn't carry the property at all.
function readChildValue(child, key) {
    if (!child) return undefined
    const meta = child.metadata && !Array.isArray(child.metadata)
        ? child.metadata
        : null
    switch (key) {
        case 'fill':
            return child.fill
        case 'stroke':
            return child.stroke
        case 'linewidth':
            return child.linewidth
        case 'strokeType':
            return child.strokeType ?? 'solid'
        case 'opacity':
            return meta?.opacity ?? 1
        case 'textColor':
            if (child.componentType === 'newText') return child.textColor
            // rectangle-with-text stores text fill in metadata.textFill
            return meta?.textFill
        case 'textSize':
            return meta?.textFontSize
        case 'textFontFamily':
            return meta?.textFontFamily
        default:
            return undefined
    }
}

// Return a stable string key for value comparison so e.g. opacity 0.5 matches
// across re-renders even if React serializes differently.
function valueKey(v) {
    if (v === undefined) return 'undefined'
    if (v === null) return 'null'
    if (typeof v === 'number') return `n:${v}`
    if (typeof v === 'string') return `s:${v}`
    return JSON.stringify(v)
}

export function inspectGroup(selectedGroup, propertyKey) {
    const children = selectedGroup?.elementData?.children
    if (!Array.isArray(children) || children.length === 0) return null
    const acceptSet = ACCEPTS[propertyKey]
    if (!acceptSet) return null

    let firstValue
    let firstKey
    let any = false
    for (let i = 0; i < children.length; i++) {
        const c = children[i]
        if (!acceptSet.has(c?.componentType)) continue
        const v = readChildValue(c, propertyKey)
        const k = valueKey(v)
        if (!any) {
            firstValue = v
            firstKey = k
            any = true
            continue
        }
        if (k !== firstKey) return MIXED
    }
    if (!any) return null
    return firstValue
}

// Build a values object compatible with readEffectiveValues' return shape.
// Properties that come back as null fall through to the supplied defaults.
export function inspectGroupValues(selectedGroup, defaults) {
    const get = (key, fallback) => {
        const v = inspectGroup(selectedGroup, key)
        if (v === null || v === undefined) return fallback
        return v
    }
    return {
        fill: get('fill', defaults.defaultFill),
        stroke: get('stroke', defaults.defaultStrokeColor),
        linewidth: get('linewidth', defaults.defaultLinewidth),
        strokeType: get('strokeType', defaults.defaultStrokeType ?? 'solid'),
        opacity: get('opacity', defaults.defaultOpacity ?? 1),
        textColor: get('textColor', defaults.defaultTextColor),
        // textSize is stored as a numeric font size in metadata. The toolbar
        // works in labels (S/M/L/XL) — caller maps numeric → label.
        textSize: get('textSize', defaults.defaultTextSize),
        textFontFamily: get(
            'textFontFamily',
            defaults.defaultTextFontFamily
        ),
    }
}
