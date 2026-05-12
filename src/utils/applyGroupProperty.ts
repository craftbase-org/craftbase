import type { MutableRefObject } from 'react'
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SelectedGroupLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChildEntry = Record<string, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComponentRow = Record<string, any>

type GroupPropertyKey =
    | 'fill'
    | 'stroke'
    | 'linewidth'
    | 'strokeType'
    | 'opacity'
    | 'textColor'
    | 'textSize'
    | 'textFontFamily'

interface HistoryBatchEntry {
    action: 'UPDATE_BULK'
    id: string
    prevProps: Partial<ComponentRow>
    bulkObj: Partial<ComponentRow>
}

export interface ApplyGroupPropertyDeps {
    selectedGroup: SelectedGroupLike | null
    twoJSInstance: TwoLike | null
    updateComponentBulkPropertiesInLocalStore: (
        id: string,
        bulkObj: Partial<ComponentRow>,
        skipDbWrite?: boolean
    ) => void
    stateRefForComponentStore?: MutableRefObject<Record<string, ComponentRow>>
    recordBatchToHistoryLog?: (entries: HistoryBatchEntry[]) => void
}

const ACCEPTS: Record<GroupPropertyKey, Set<string>> = {
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

function findSceneElement(two: TwoLike, id: string): ShapeLike | undefined {
    return two?.scene?.children?.find(
        (c: ShapeLike) => c?.elementData?.id === id
    )
}

function findVisibleCoreObject(
    group: SelectedGroupLike,
    id: string
): ShapeLike | null {
    if (!group?.children) return null
    for (let i = 0; i < group.children.length; i++) {
        const c = group.children[i]
        if (c?.elementData?.id === id) return c
    }
    return null
}

function findTextNodeInside(coreObject: ShapeLike): ShapeLike | null {
    if (!coreObject?.children) return null
    for (let i = 0; i < coreObject.children.length; i++) {
        const c = coreObject.children[i]
        if (typeof c?.value === 'string') return c
    }
    return null
}

function applyToTwoShape(
    shape: ShapeLike,
    propertyKey: GroupPropertyKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any
): void {
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

export function createApplyGroupProperty(deps: ApplyGroupPropertyDeps) {
    return function applyGroupProperty(
        propertyKey: GroupPropertyKey | string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: any
    ): void {
        const {
            selectedGroup,
            twoJSInstance,
            updateComponentBulkPropertiesInLocalStore,
            stateRefForComponentStore,
            recordBatchToHistoryLog,
        } = deps

        const children: ChildEntry[] | undefined =
            selectedGroup?.elementData?.children
        if (!Array.isArray(children) || children.length === 0) return

        const acceptSet = ACCEPTS[propertyKey as GroupPropertyKey]
        if (!acceptSet) return

        const batchEntries: HistoryBatchEntry[] = []
        const rectsToGrow: Array<{
            id: string
            sceneEl: ShapeLike | undefined
            coreObj: ShapeLike | null
        }> = []

        const snapshotPrev = (
            id: string,
            keys: string[]
        ): Partial<ComponentRow> => {
            const current = stateRefForComponentStore?.current?.[id] ?? {}
            const prev: Partial<ComponentRow> = {}
            keys.forEach((k) => {
                if (current[k] !== undefined) prev[k] = current[k]
            })
            return prev
        }
        const recordChild = (
            id: string,
            bulkObj: Partial<ComponentRow>
        ): void => {
            const prevProps = snapshotPrev(id, Object.keys(bulkObj))
            batchEntries.push({
                action: 'UPDATE_BULK',
                id,
                prevProps,
                bulkObj,
            })
            updateComponentBulkPropertiesInLocalStore(id, bulkObj, true)
        }

        children.forEach((child) => {
            const type = child?.componentType
            if (!type || !acceptSet.has(type)) return
            const id = child?.id
            if (!id) return

            const sceneEl = findSceneElement(twoJSInstance, id)
            const coreObj = findVisibleCoreObject(selectedGroup, id)

            if (
                propertyKey === 'fill' ||
                propertyKey === 'stroke' ||
                propertyKey === 'linewidth'
            ) {
                applyToTwoShape(sceneEl, propertyKey, value)
                applyToTwoShape(coreObj, propertyKey, value)
                if (sceneEl?.elementData)
                    sceneEl.elementData[propertyKey] = value
                child[propertyKey] = value
                recordChild(id, { [propertyKey]: value })
                return
            }

            if (propertyKey === 'strokeType') {
                const dbValue = value === 'solid' ? 'solid' : value
                applyToTwoShape(sceneEl, 'strokeType', value)
                applyToTwoShape(coreObj, 'strokeType', value)
                if (sceneEl?.elementData)
                    sceneEl.elementData.strokeType = dbValue
                child.strokeType = dbValue
                recordChild(id, { strokeType: dbValue })
                return
            }

            if (propertyKey === 'opacity') {
                const sceneLeaf = sceneEl?.children?.[0]
                if (sceneLeaf) sceneLeaf.opacity = value
                if (coreObj) {
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
                if (sceneEl?.elementData)
                    sceneEl.elementData.metadata = updatedMeta
                child.metadata = updatedMeta
                recordChild(id, { metadata: updatedMeta })
                return
            }

            if (propertyKey === 'textColor') {
                if (type === 'newText') {
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
                    recordChild(id, { textColor: value })
                } else if (type === 'rectangle') {
                    const sceneText = sceneEl
                        ? findTextNodeInside(sceneEl)
                        : null
                    const coreText = coreObj
                        ? findTextNodeInside(coreObj)
                        : null
                    if (
                        !sceneText &&
                        !coreText &&
                        !child?.metadata?.hasText
                    ) {
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
                    recordChild(id, {
                        metadata: updatedMeta,
                        textColor: value,
                    })
                }
                return
            }

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
                    propertyKey === 'textSize'
                        ? 'textFontSize'
                        : 'textFontFamily'
                const twoKey = propertyKey === 'textSize' ? 'size' : 'family'
                if (sceneText) sceneText[twoKey] = value
                if (coreText) coreText[twoKey] = value
                const existingMeta =
                    sceneEl?.elementData?.metadata &&
                    !Array.isArray(sceneEl.elementData.metadata)
                        ? sceneEl.elementData.metadata
                        : child?.metadata && !Array.isArray(child.metadata)
                          ? child.metadata
                          : {}
                const updatedMeta = { ...existingMeta, [metaKey]: value }
                if (sceneEl?.elementData)
                    sceneEl.elementData.metadata = updatedMeta
                child.metadata = updatedMeta
                recordChild(id, { metadata: updatedMeta })

                if (type === 'rectangle' && (sceneText || coreText)) {
                    rectsToGrow.push({ id, sceneEl, coreObj })
                }
                return
            }
        })

        if (batchEntries.length > 0) {
            recordBatchToHistoryLog?.(batchEntries)
        }

        twoJSInstance?.update()

        // Grow wrapping rectangles in a single RAF after Two.js has rendered
        // the new text size/family.
        function runGrowPass(): void {
            const PAD = 20
            const growEntries: HistoryBatchEntry[] = []
            rectsToGrow.forEach(({ id, sceneEl, coreObj }) => {
                const sceneText = sceneEl ? findTextNodeInside(sceneEl) : null
                const coreText = coreObj ? findTextNodeInside(coreObj) : null
                // Prefer coreText for measurement: the scene element's outer
                // group is at opacity=0 while a group is focused, and Two.js's
                // render path leaves sceneText's _flagSize unprocessed in that
                // state — its DOM font-size attribute stays stale. coreText is
                // on the visible group and gets rendered correctly.
                const measureNode = coreText || sceneText
                const bbox = measureNode?._renderer?.elem?.getBBox?.()
                if (!bbox || bbox.width <= 0) return

                const sceneRect = sceneEl?.children?.[0]
                const coreRect = coreObj?.children?.[0]
                const currentW = sceneRect?.width ?? coreRect?.width
                const currentH = sceneRect?.height ?? coreRect?.height
                if (!currentW || !currentH) return

                const minW = bbox.width + PAD
                const minH = bbox.height + PAD
                const newW = Math.max(currentW, minW)
                const newH = Math.max(currentH, minH)
                if (newW === currentW && newH === currentH) return

                if (sceneRect) {
                    sceneRect.width = newW
                    sceneRect.height = newH
                }
                if (coreRect) {
                    coreRect.width = newW
                    coreRect.height = newH
                }
                const roundedW = Math.round(newW)
                const roundedH = Math.round(newH)
                const prevW =
                    stateRefForComponentStore?.current?.[id]?.width
                const prevH =
                    stateRefForComponentStore?.current?.[id]?.height
                updateComponentBulkPropertiesInLocalStore(
                    id,
                    { width: roundedW, height: roundedH },
                    true
                )
                growEntries.push({
                    action: 'UPDATE_BULK',
                    id,
                    prevProps: { width: prevW, height: prevH },
                    bulkObj: { width: roundedW, height: roundedH },
                })
            })
            if (growEntries.length > 0) {
                recordBatchToHistoryLog?.(growEntries)
                twoJSInstance?.update()
            }
        }

        if (rectsToGrow.length > 0) {
            // Two RAFs: first lets Two.js commit the new font-size to the SVG;
            // second lets the browser flush layout so getBBox reflects the new
            // text dimensions instead of the pre-change cached value.
            requestAnimationFrame(() => {
                twoJSInstance?.update()
                requestAnimationFrame(() => runGrowPass())
            })
        }
    }
}
