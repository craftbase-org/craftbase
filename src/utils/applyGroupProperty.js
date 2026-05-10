import { strokeTypeToDashes, clearDashesOnTwoJSShape } from './misc'

// Bulk-apply a property to every child of the currently-focused group whose
// element type accepts that property. Element types that don't accept the
// property silently discard the change (Phase 1: no UI filtering — toolbar
// shows the union of all properties; this layer enforces what each child can
// actually receive).
//
// Per Phase 1 decisions:
//   - Defaults are NOT touched on group edits (caller doesn't bump them).
//   - No "mixed value" inspection — toolbar reads from defaults.
//   - textSize/textFontFamily on rectangles-with-text use a simple direct
//     write — no resize-on-grow logic from the single-element path.
//
// Mutates three places per child:
//   1. The hidden Two.js shape in two.scene.children (opacity=0 while group
//      is selected; becomes visible again on blur with the new properties).
//   2. The visible nested coreObject inside the group's Two.js Group (so the
//      user sees the change in real time while the group is still focused).
//      Requires groupobject.js to stamp `coreObject.elementData = item`.
//   3. The componentStore row via updateComponentBulkPropertiesInLocalStore.

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
    // Pencil opacity unsupported: pencil's metadata is the vertex array, so
    // the metadata.opacity slot collides with the array shape on group blur.
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

function findSceneElement(two, id) {
    return two?.scene?.children?.find((c) => c?.elementData?.id === id)
}

function findVisibleCoreObject(group, id) {
    if (!group?.children) return null
    for (let i = 0; i < group.children.length; i++) {
        const c = group.children[i]
        if (c?.elementData?.id === id) return c
    }
    return null
}

function findTextNodeInside(coreObject) {
    if (!coreObject?.children) return null
    for (let i = 0; i < coreObject.children.length; i++) {
        const c = coreObject.children[i]
        if (typeof c?.value === 'string') return c
    }
    return null
}

function applyToTwoShape(shape, propertyKey, value) {
    if (!shape) return
    if (propertyKey === 'fill') shape.fill = value
    else if (propertyKey === 'stroke') shape.stroke = value
    else if (propertyKey === 'linewidth') shape.linewidth = value
    else if (propertyKey === 'opacity') shape.opacity = value
    else if (propertyKey === 'strokeType') {
        shape.dashes = strokeTypeToDashes(value)
        if (value === 'solid') clearDashesOnTwoJSShape(shape)
    }
}

export function createApplyGroupProperty(deps) {
    return function applyGroupProperty(propertyKey, value) {
        const {
            selectedGroup,
            twoJSInstance,
            updateComponentBulkPropertiesInLocalStore,
        } = deps

        const children = selectedGroup?.elementData?.children
        if (!Array.isArray(children) || children.length === 0) return

        const acceptSet = ACCEPTS[propertyKey]
        if (!acceptSet) return

        children.forEach((child) => {
            const type = child?.componentType
            if (!type || !acceptSet.has(type)) return
            const id = child?.id
            if (!id) return

            const sceneEl = findSceneElement(twoJSInstance, id)
            const coreObj = findVisibleCoreObject(selectedGroup, id)

            // Non-text properties — apply to scene + visible shapes + store.
            if (
                propertyKey === 'fill' ||
                propertyKey === 'stroke' ||
                propertyKey === 'linewidth'
            ) {
                applyToTwoShape(sceneEl, propertyKey, value)
                applyToTwoShape(coreObj, propertyKey, value)
                if (sceneEl?.elementData) sceneEl.elementData[propertyKey] = value
                child[propertyKey] = value
                updateComponentBulkPropertiesInLocalStore(id, {
                    [propertyKey]: value,
                })
                return
            }

            if (propertyKey === 'strokeType') {
                const dbValue = value === 'solid' ? 'solid' : value
                applyToTwoShape(sceneEl, 'strokeType', value)
                applyToTwoShape(coreObj, 'strokeType', value)
                if (sceneEl?.elementData) sceneEl.elementData.strokeType = dbValue
                child.strokeType = dbValue
                updateComponentBulkPropertiesInLocalStore(id, {
                    strokeType: dbValue,
                })
                return
            }

            if (propertyKey === 'opacity') {
                // Convention across the codebase: opacity lives on the inner
                // leaf shape (group.children[0]). The outer group's opacity
                // is reserved for visibility — newCanvas group-create sets it
                // to 0 to hide; groupobject blur (line 62) forces it back to 1.
                // Mutating the outer group is therefore lossy: the blur
                // overwrites it. We must mutate the leaf instead.
                const sceneLeaf = sceneEl?.children?.[0]
                if (sceneLeaf) sceneLeaf.opacity = value
                if (coreObj) {
                    // groupobject set coreObj.opacity to the original value
                    // when building the visible group; reset to 1 so the leaf
                    // alone controls the display.
                    coreObj.opacity = 1
                    const coreLeaf = coreObj?.children?.[0]
                    if (coreLeaf) coreLeaf.opacity = value
                }
                const existingMeta = sceneEl?.elementData?.metadata
                const safeMeta =
                    existingMeta && !Array.isArray(existingMeta)
                        ? existingMeta
                        : {}
                const updatedMeta = { ...safeMeta, opacity: value }
                if (sceneEl?.elementData) sceneEl.elementData.metadata = updatedMeta
                child.metadata = updatedMeta
                updateComponentBulkPropertiesInLocalStore(id, {
                    metadata: updatedMeta,
                })
                return
            }

            // Text properties.
            if (propertyKey === 'textColor') {
                if (type === 'newText') {
                    // The text node lives inside an outer Group; set fill on
                    // the inner text node, not the Group wrapper.
                    const sceneText = sceneEl
                        ? findTextNodeInside(sceneEl)
                        : null
                    const coreText = coreObj
                        ? findTextNodeInside(coreObj)
                        : null
                    if (sceneText) sceneText.fill = value
                    if (coreText) coreText.fill = value
                    if (sceneEl?.elementData)
                        sceneEl.elementData.textColor = value
                    child.textColor = value
                    updateComponentBulkPropertiesInLocalStore(id, {
                        textColor: value,
                    })
                } else if (type === 'rectangle') {
                    // Rectangle-with-text: only relevant if it actually has text.
                    const sceneText = sceneEl
                        ? findTextNodeInside(sceneEl)
                        : null
                    const coreText = coreObj
                        ? findTextNodeInside(coreObj)
                        : null
                    if (!sceneText && !coreText && !child?.metadata?.hasText) {
                        return
                    }
                    if (sceneText) sceneText.fill = value
                    if (coreText) coreText.fill = value
                    const existingMeta =
                        sceneEl?.elementData?.metadata &&
                        !Array.isArray(sceneEl.elementData.metadata)
                            ? sceneEl.elementData.metadata
                            : (child?.metadata ?? {})
                    const updatedMeta = { ...existingMeta, textFill: value }
                    if (sceneEl?.elementData)
                        sceneEl.elementData.metadata = updatedMeta
                    child.metadata = updatedMeta
                    updateComponentBulkPropertiesInLocalStore(id, {
                        metadata: updatedMeta,
                        textColor: value,
                    })
                }
                return
            }

            // Both newText and rectangle-with-text wrap a Two.js text node
            // inside an outer Group. Find the actual text node in each, since
            // setting .size/.family on the Group is a no-op.
            if (
                propertyKey === 'textSize' ||
                propertyKey === 'textFontFamily'
            ) {
                const sceneText = sceneEl ? findTextNodeInside(sceneEl) : null
                const coreText = coreObj ? findTextNodeInside(coreObj) : null
                if (
                    type === 'rectangle' &&
                    !sceneText &&
                    !coreText &&
                    !child?.metadata?.hasText
                ) {
                    return
                }
                const metaKey =
                    propertyKey === 'textSize' ? 'textFontSize' : 'textFontFamily'
                const twoKey = propertyKey === 'textSize' ? 'size' : 'family'
                if (sceneText) sceneText[twoKey] = value
                if (coreText) coreText[twoKey] = value
                const existingMeta =
                    sceneEl?.elementData?.metadata &&
                    !Array.isArray(sceneEl.elementData.metadata)
                        ? sceneEl.elementData.metadata
                        : (child?.metadata && !Array.isArray(child.metadata)
                              ? child.metadata
                              : {})
                const updatedMeta = { ...existingMeta, [metaKey]: value }
                if (sceneEl?.elementData)
                    sceneEl.elementData.metadata = updatedMeta
                child.metadata = updatedMeta
                updateComponentBulkPropertiesInLocalStore(id, {
                    metadata: updatedMeta,
                })
                return
            }
        })

        twoJSInstance?.update()
    }
}
