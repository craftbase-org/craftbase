import { useState, useRef } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import Two from 'two.js'
import { strokeTypeToDashes, clearDashesOnTwoJSShape } from '../utils/misc'
import { updateX1Y1Vertices, updateX2Y2Vertices } from '../utils/updateVertices'
import { getShapeTextNodes } from '../utils/canvasUtils'
import { lineHeightFor } from '../utils/textLayout'
import { DRAFT_STORAGE_KEY } from '../constants/misc'
import type { ComponentRecord, ComponentStore } from '../types/board'

// Two.js scene-group shapes are typed loosely until the canvas internals
// converge (Stages 7–9). Bulk-prop bags are also row-shaped; we accept
// `Partial<ComponentRecord>` plus an `[key: string]: unknown` escape hatch
// for the few fields (relativeX/Y, etc.) that don't live on the DB row type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
type BulkProps = Partial<ComponentRecord> & Record<string, unknown>

// ---- history entry discriminated union ----

interface AddEntry {
    action: 'ADD'
    id: string
    componentInfo: ComponentRecord
    timestamp?: number
}

interface DeleteEntry {
    action: 'DELETE'
    id: string
    prevState: ComponentRecord
    timestamp?: number
}

interface UpdateVerticesEntry {
    action: 'UPDATE_VERTICES'
    id: string
    prevX: number
    prevY: number
    nextX?: number
    nextY?: number
    timestamp?: number
}

interface UpdateBulkEntry {
    action: 'UPDATE_BULK'
    id: string
    prevProps: BulkProps
    bulkObj?: BulkProps
    nextProps?: BulkProps
    syncDefaults?: boolean
    timestamp?: number
}

interface BatchEntry {
    action: 'BATCH'
    entries: HistoryEntry[]
    timestamp?: number
}

export type HistoryEntry =
    | AddEntry
    | DeleteEntry
    | UpdateVerticesEntry
    | UpdateBulkEntry
    | BatchEntry

// ---- hook options ----

// Apollo mutate signatures vary by typing source; keep them loose at the
// boundary. board.tsx (Stage 10) will wire in real Apollo types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApolloMutate = (options?: any) => any

export interface ComponentHistoryOptions {
    twoJSInstanceRef: MutableRefObject<TwoLike | null>
    stateRefForComponentStore: MutableRefObject<ComponentStore>
    isPersistedRef: MutableRefObject<boolean>
    boardId: string
    isPersisted: boolean
    insertComponent: ApolloMutate
    deleteComponent: ApolloMutate
    updateComponentInfo: ApolloMutate
    setComponentStore: Dispatch<SetStateAction<ComponentStore>>
    setShowPermissionErrorModal: Dispatch<SetStateAction<boolean>>
    setDefaultLinewidth: (val: number) => void
    setDefaultStrokeType: (val: string | null) => void
    setToolbarRefreshKey?: Dispatch<SetStateAction<number>>
    selectedComponent: ShapeLike | null
    selectedGroupRef: MutableRefObject<ShapeLike | null>
    stripTypename: (input: unknown) => unknown
}

export interface ComponentHistoryApi {
    historyLog: HistoryEntry[]
    historyLogRef: MutableRefObject<HistoryEntry[]>
    bucketLog: HistoryEntry[]
    bucketLogRef: MutableRefObject<HistoryEntry[]>
    recordToHistoryLog: (entry: HistoryEntry) => void
    recordBatchToHistoryLog: (entries: HistoryEntry[]) => void
    undoLastAction: () => void
    redoLastAction: () => void
    clearHistory: (isPersisted: boolean, localDraftKey?: string) => void
}

// Applies a single property back to a Two.js shape during undo/redo.
function applyPropertyToTwoJSGroup(
    group: ShapeLike,
    name: string,
    value: unknown
): void {
    const shape = group.children?.[0]
    if (!shape) return

    // Multiline text (standalone or shape-with-text) is a stack of Two.Text
    // line nodes — text props must hit EVERY node, not just children[0].
    // Empty for non-text shapes, so this stays a no-op there.
    const textNodes: ShapeLike[] = getShapeTextNodes(group)
    const isStandaloneText =
        group.elementData?.componentType === 'newText'

    switch (name) {
        case 'fill':
        case 'stroke':
        case 'linewidth':
        case 'radius':
        case 'width':
        case 'height':
        case 'iconStroke':
            shape[name] = value
            break
        case 'textColor':
            // Standalone text records color as a top-level prop; it renders
            // via each line node's `.fill`. Revert all lines, not just line 1.
            if (textNodes.length > 0) {
                textNodes.forEach((n: ShapeLike) => (n.fill = value))
            } else {
                shape[name] = value
            }
            break
        case 'strokeType':
            shape.dashes = strokeTypeToDashes(value as string | null)
            if (!value || value === 'solid') {
                clearDashesOnTwoJSShape(shape)
            }
            break
        case 'metadata':
            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value)
            ) {
                // Fallback single node for legacy/non-multiline shapes where
                // getShapeTextNodes finds no text layer.
                const fallbackTextNode: ShapeLike =
                    typeof shape?.value === 'string'
                        ? shape
                        : group.children?.find(
                              (c: ShapeLike) => typeof c?.value === 'string'
                          )
                const applyToText = (fn: (n: ShapeLike) => void): void => {
                    if (textNodes.length > 0) textNodes.forEach(fn)
                    else if (fallbackTextNode) fn(fallbackTextNode)
                }
                Object.entries(value as Record<string, unknown>).forEach(
                    ([k, v]) => {
                        if (k === 'opacity') {
                            // Opacity lives on the leaf shape (children[0]) by
                            // codebase convention; matches applyGroupProperty.
                            shape.opacity = v
                        } else if (
                            k === 'textFontSize' ||
                            k === 'fontSize'
                        ) {
                            // Standalone text stores size as `fontSize`,
                            // shape-with-text as `textFontSize` — honor both.
                            applyToText((n) => {
                                n.size = v
                                n.leading = v
                            })
                            // Standalone multiline must re-stack at the new
                            // line height (shape-with-text reflows elsewhere).
                            if (isStandaloneText && textNodes.length > 1) {
                                const lh = lineHeightFor(Number(v))
                                const cnt = textNodes.length
                                textNodes.forEach(
                                    (n: ShapeLike, i: number) =>
                                        n.translation.set(
                                            0,
                                            (i - (cnt - 1) / 2) * lh
                                        )
                                )
                            }
                        } else if (k === 'textFontFamily') {
                            applyToText((n) => {
                                n.family = v
                            })
                        } else if (k === 'textFill') {
                            applyToText((n) => {
                                n.fill = v
                            })
                        }
                        // Other metadata keys (textContent, textBaseLine,
                        // hasText) have no direct Two.js field mapping; skip
                        // rather than pollute random properties on the shape.
                    }
                )
            }
            break
        default:
            break
    }
}

export function useComponentHistory({
    twoJSInstanceRef,
    stateRefForComponentStore,
    isPersistedRef,
    boardId,
    insertComponent,
    deleteComponent,
    updateComponentInfo,
    setComponentStore,
    setShowPermissionErrorModal,
    setDefaultLinewidth,
    setDefaultStrokeType,
    setToolbarRefreshKey,
    selectedComponent,
    selectedGroupRef,
    stripTypename,
}: ComponentHistoryOptions): ComponentHistoryApi {
    const [historyLog, setHistoryLog] = useState<HistoryEntry[]>([])
    const historyLogRef = useRef<HistoryEntry[]>([])
    const [bucketLog, setBucketLog] = useState<HistoryEntry[]>([])
    const bucketLogRef = useRef<HistoryEntry[]>([])

    const writeHistory = (next: HistoryEntry[]): void => {
        historyLogRef.current = next
        setHistoryLog(next)
    }
    const writeBucket = (next: HistoryEntry[]): void => {
        bucketLogRef.current = next
        setBucketLog(next)
    }

    // ---- per-action apply helpers (shared by undo and redo dispatchers) ----

    const applyRemove = (id: string): void => {
        const two = twoJSInstanceRef.current
        const group = two?.scene.children.find(
            (c: ShapeLike) => c?.elementData?.id === id
        )
        if (group) {
            two.remove([group])
        }
        const updatedStore = { ...stateRefForComponentStore.current }
        delete updatedStore[id]
        stateRefForComponentStore.current = updatedStore
        setComponentStore(updatedStore)

        window.dispatchEvent(
            new CustomEvent('elementRemoved', { detail: { id } })
        )

        if (isPersistedRef.current) {
            deleteComponent({
                variables: { id },
                errorPolicy: import.meta.env.VITE_GRAPHQL_ERROR_POLICY,
            })
        }
        requestAnimationFrame(() => two?.update())
    }

    const applyInsert = (
        id: string,
        componentInfo: ComponentRecord,
        onPermissionError?: () => void
    ): void => {
        const two = twoJSInstanceRef.current
        // A DELETE entry snapshots prevState as { ...store[id] }; if the
        // component wasn't in the store at delete time (transient/group ids,
        // double-delete, already-removed), that snapshot is {}. Restoring it
        // would write a { boardId }-only entry that later breaks Share's bulk
        // insert (componentType NOT NULL). Same guard as applyBatch.
        if (!componentInfo || !componentInfo.componentType) return
        const restoredState = { ...componentInfo, boardId }
        const updatedStore = {
            ...stateRefForComponentStore.current,
            [id]: restoredState,
        }
        stateRefForComponentStore.current = updatedStore
        setComponentStore(updatedStore)
        if (isPersistedRef.current) {
            insertComponent({
                variables: { object: stripTypename(restoredState) },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }).catch((error: any) => {
                const isPermissionError = error.graphQLErrors?.some(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (e: any) => e.extensions?.code === 'permission-error'
                )
                if (isPermissionError) {
                    onPermissionError?.()
                    setShowPermissionErrorModal(true)
                }
            })
        }
        requestAnimationFrame(() => two?.update())
    }

    const applyVertices = (id: string, x: number, y: number): void => {
        const two = twoJSInstanceRef.current
        const updatedStore = { ...stateRefForComponentStore.current }
        const current = updatedStore[id]
        if (current) {
            updatedStore[id] = { ...current, x, y }
        }
        stateRefForComponentStore.current = updatedStore
        setComponentStore(updatedStore)

        const group = two?.scene.children.find(
            (c: ShapeLike) => c?.elementData?.id === id
        )
        if (group) {
            group.translation.x = x
            group.translation.y = y
            two?.update()
        }
        if (isPersistedRef.current) {
            updateComponentInfo({
                variables: { id, updateObj: { x, y } },
            })
        }
        requestAnimationFrame(() => two?.update())
    }

    const applyBulkProps = (
        id: string,
        props: BulkProps,
        syncDefaults?: boolean
    ): void => {
        const two = twoJSInstanceRef.current
        const updatedStore = { ...stateRefForComponentStore.current }
        const current = updatedStore[id]
        if (current) {
            updatedStore[id] = { ...current, ...props } as ComponentRecord
        }
        stateRefForComponentStore.current = updatedStore
        setComponentStore(updatedStore)

        const group = two?.scene.children.find(
            (c: ShapeLike) => c?.elementData?.id === id
        )
        if (group) {
            if (props.x !== undefined) group.translation.x = props.x
            if (props.y !== undefined) group.translation.y = props.y
            Object.entries(props).forEach(([name, val]) => {
                applyPropertyToTwoJSGroup(group, name, val)
            })

            const hasArrowVertices =
                props.x1 !== undefined ||
                props.y1 !== undefined ||
                props.x2 !== undefined ||
                props.y2 !== undefined
            if (hasArrowVertices) {
                const line = group.children?.[0]
                const pointCircle1Group = group.children?.[1]
                const pointCircle2Group = group.children?.[2]
                if (line && pointCircle1Group && pointCircle2Group) {
                    const x1 = props.x1 ?? line.vertices[0].x
                    const y1 = props.y1 ?? line.vertices[0].y
                    const x2 = props.x2 ?? line.vertices[1].x
                    const y2 = props.y2 ?? line.vertices[1].y
                    updateX1Y1Vertices(Two, line, x1, y1, pointCircle1Group, two)
                    updateX2Y2Vertices(Two, line, x2, y2, pointCircle2Group, two)
                }
            }

            two?.update()

            if (props.width !== undefined || props.height !== undefined) {
                window.dispatchEvent(
                    new CustomEvent('undoSelectorSync', {
                        detail: { elementId: id },
                    })
                )
            }
        }

        if (syncDefaults) {
            if (props.linewidth !== undefined && props.linewidth !== null) {
                setDefaultLinewidth(props.linewidth)
            }
            if (props.strokeType !== undefined) {
                setDefaultStrokeType(
                    props.strokeType === 'solid' ? null : props.strokeType
                )
            }
        }
        if (props.strokeType !== undefined) {
            if (selectedComponent?.group?.data?.elementData) {
                selectedComponent.group.data.elementData.strokeType =
                    props.strokeType
            }
        }
        if (props.linewidth !== undefined || props.strokeType !== undefined) {
            setToolbarRefreshKey?.((k) => k + 1)
        }

        if (isPersistedRef.current) {
            updateComponentInfo({
                variables: { id, updateObj: props },
            })
        }
        requestAnimationFrame(() => two?.update())
    }

    const applyBatch = (
        entries: HistoryEntry[],
        direction: 'undo' | 'redo'
    ): void => {
        // direction: 'undo' (DELETE→insert, ADD→remove) or 'redo' (DELETE→remove, ADD→insert)
        const two = twoJSInstanceRef.current
        const updatedStore = { ...stateRefForComponentStore.current }

        entries.forEach((e) => {
            const isInsert =
                (direction === 'undo' && e.action === 'DELETE') ||
                (direction === 'redo' && e.action === 'ADD')
            const isRemove =
                (direction === 'undo' && e.action === 'ADD') ||
                (direction === 'redo' && e.action === 'DELETE')

            if (isInsert) {
                const source =
                    direction === 'undo' && e.action === 'DELETE'
                        ? e.prevState
                        : e.action === 'ADD'
                          ? e.componentInfo
                          : undefined
                if (!source) return
                const restoredState = { ...source, boardId }
                updatedStore[e.action === 'DELETE' ? e.id : e.id] =
                    restoredState
                if (isPersistedRef.current) {
                    insertComponent({
                        variables: { object: stripTypename(restoredState) },
                    })
                }
            } else if (isRemove) {
                const id =
                    e.action === 'ADD' || e.action === 'DELETE'
                        ? e.id
                        : undefined
                if (!id) return
                delete updatedStore[id]
                window.dispatchEvent(
                    new CustomEvent('elementRemoved', {
                        detail: { id },
                    })
                )
                const sceneGroup = two?.scene.children.find(
                    (c: ShapeLike) => c?.elementData?.id === id
                )
                if (sceneGroup) two?.remove([sceneGroup])
                if (isPersistedRef.current) {
                    deleteComponent({ variables: { id } })
                }
            } else if (e.action === 'UPDATE_BULK') {
                // Used by group bulk-apply: a single BATCH carries one
                // UPDATE_BULK per group child, so one undo press rolls them
                // all back together.
                const propsToApply: BulkProps | undefined =
                    direction === 'undo' ? e.prevProps : e.bulkObj
                if (!propsToApply) return
                const existing = updatedStore[e.id]
                if (existing) {
                    updatedStore[e.id] = {
                        ...existing,
                        ...propsToApply,
                    } as ComponentRecord
                }
                const sceneGroup = two?.scene.children.find(
                    (c: ShapeLike) => c?.elementData?.id === e.id
                )
                if (sceneGroup) {
                    // Position sync — group ungroup batches include x/y so
                    // the original scene shapes need to translate back.
                    if (propsToApply.x !== undefined)
                        sceneGroup.translation.x = propsToApply.x
                    if (propsToApply.y !== undefined)
                        sceneGroup.translation.y = propsToApply.y
                    Object.entries(propsToApply).forEach(([name, val]) => {
                        applyPropertyToTwoJSGroup(sceneGroup, name, val)
                    })
                    // ArrowLine vertex handling
                    const hasArrowVertices =
                        propsToApply.x1 !== undefined ||
                        propsToApply.y1 !== undefined ||
                        propsToApply.x2 !== undefined ||
                        propsToApply.y2 !== undefined
                    if (hasArrowVertices) {
                        const line = sceneGroup.children?.[0]
                        const pointCircle1Group = sceneGroup.children?.[1]
                        const pointCircle2Group = sceneGroup.children?.[2]
                        if (line && pointCircle1Group && pointCircle2Group) {
                            const x1 = propsToApply.x1 ?? line.vertices[0].x
                            const y1 = propsToApply.y1 ?? line.vertices[0].y
                            const x2 = propsToApply.x2 ?? line.vertices[1].x
                            const y2 = propsToApply.y2 ?? line.vertices[1].y
                            updateX1Y1Vertices(
                                Two,
                                line,
                                x1,
                                y1,
                                pointCircle1Group,
                                two
                            )
                            updateX2Y2Vertices(
                                Two,
                                line,
                                x2,
                                y2,
                                pointCircle2Group,
                                two
                            )
                        }
                    }
                    // Pencil metadata reconstruction
                    if (
                        sceneGroup.elementData?.componentType === 'pencil' &&
                        Array.isArray(propsToApply.metadata)
                    ) {
                        const path = sceneGroup.children?.[0]
                        if (path?.vertices) {
                            const baseX =
                                propsToApply.x ?? sceneGroup.translation.x
                            const baseY =
                                propsToApply.y ?? sceneGroup.translation.y
                            path.vertices = []
                            ;(
                                propsToApply.metadata as Array<{
                                    x: number
                                    y: number
                                }>
                            ).forEach((point) => {
                                path.vertices.push(
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    new (Two as any).Anchor(
                                        point.x - baseX,
                                        point.y - baseY
                                    )
                                )
                            })
                        }
                    }
                    // Keep elementData snapshot in sync
                    if (sceneGroup.elementData) {
                        Object.entries(propsToApply).forEach(([k, v]) => {
                            sceneGroup.elementData[k] = v
                        })
                    }
                    if (
                        propsToApply.width !== undefined ||
                        propsToApply.height !== undefined
                    ) {
                        window.dispatchEvent(
                            new CustomEvent('undoSelectorSync', {
                                detail: { elementId: e.id },
                            })
                        )
                    }
                }
                // If a group is currently focused and contains this child,
                // also mutate the visible coreObj so undo/redo reflects on
                // screen without waiting for the user to ungroup.
                const activeGroup = selectedGroupRef?.current
                const groupChildren = activeGroup?.elementData?.children
                if (Array.isArray(groupChildren)) {
                    const inGroup = groupChildren.some(
                        (c: ShapeLike) => c?.id === e.id
                    )
                    if (inGroup) {
                        const coreObj = activeGroup.children?.find(
                            (c: ShapeLike) => c?.elementData?.id === e.id
                        )
                        if (coreObj) {
                            const isOpacityChange =
                                'metadata' in propsToApply &&
                                propsToApply.metadata &&
                                typeof propsToApply.metadata === 'object' &&
                                'opacity' in
                                    (propsToApply.metadata as Record<
                                        string,
                                        unknown
                                    >)
                            if (isOpacityChange) coreObj.opacity = 1
                            Object.entries(propsToApply).forEach(
                                ([name, val]) => {
                                    applyPropertyToTwoJSGroup(
                                        coreObj,
                                        name,
                                        val
                                    )
                                }
                            )
                        }
                        // Mirror onto the child entry inside elementData.children
                        groupChildren.forEach((c: ShapeLike) => {
                            if (c?.id === e.id) {
                                Object.entries(propsToApply).forEach(
                                    ([k, v]) => {
                                        c[k] = v
                                    }
                                )
                            }
                        })
                    }
                }
                if (isPersistedRef.current) {
                    updateComponentInfo({
                        variables: { id: e.id, updateObj: propsToApply },
                    })
                }
            }
        })

        stateRefForComponentStore.current = updatedStore
        setComponentStore(updatedStore)
        requestAnimationFrame(() => two?.update())
    }

    // ---- public recorders ----

    const recordToHistoryLog = (entry: HistoryEntry): void => {
        const updatedLog: HistoryEntry[] = [
            ...historyLogRef.current,
            { ...entry, timestamp: Date.now() },
        ]
        writeHistory(updatedLog)
        // Fresh user action invalidates the redo branch
        writeBucket([])
    }

    const recordBatchToHistoryLog = (entries: HistoryEntry[]): void => {
        const updatedLog: HistoryEntry[] = [
            ...historyLogRef.current,
            { action: 'BATCH', entries, timestamp: Date.now() },
        ]
        writeHistory(updatedLog)
        writeBucket([])
    }

    // Capture the post-action ("next") state needed to redo this entry.
    // Only UPDATE_VERTICES and UPDATE_BULK need extra capture — for
    // ADD/DELETE/BATCH the original entry already contains everything redo needs.
    const captureNextState = (entry: HistoryEntry): HistoryEntry => {
        if (entry.action === 'UPDATE_VERTICES') {
            const current = stateRefForComponentStore.current[entry.id]
            return {
                ...entry,
                nextX: current?.x,
                nextY: current?.y,
            }
        }
        if (entry.action === 'UPDATE_BULK') {
            const current = stateRefForComponentStore.current[entry.id]
            const nextProps: BulkProps = {}
            Object.keys(entry.prevProps || {}).forEach((k) => {
                ;(nextProps as Record<string, unknown>)[k] = (
                    current as unknown as Record<string, unknown> | undefined
                )?.[k]
            })
            return { ...entry, nextProps }
        }
        return entry
    }

    const undoLastAction = (): void => {
        if (historyLogRef.current.length === 0) return

        const updatedLog = [...historyLogRef.current]
        const lastEntry = updatedLog.pop()
        if (!lastEntry) return
        writeHistory(updatedLog)

        const enrichedForRedo = captureNextState(lastEntry)

        if (lastEntry.action === 'ADD') {
            applyRemove(lastEntry.id)
        } else if (lastEntry.action === 'DELETE') {
            applyInsert(lastEntry.id, lastEntry.prevState, () =>
                undoLastAction()
            )
        } else if (lastEntry.action === 'BATCH') {
            applyBatch(lastEntry.entries, 'undo')
        } else if (lastEntry.action === 'UPDATE_VERTICES') {
            applyVertices(lastEntry.id, lastEntry.prevX, lastEntry.prevY)
        } else if (lastEntry.action === 'UPDATE_BULK') {
            applyBulkProps(
                lastEntry.id,
                lastEntry.prevProps,
                lastEntry.syncDefaults
            )
        }

        const updatedBucket = [...bucketLogRef.current, enrichedForRedo]
        writeBucket(updatedBucket)
    }

    const redoLastAction = (): void => {
        if (bucketLogRef.current.length === 0) return

        const updatedBucket = [...bucketLogRef.current]
        const entry = updatedBucket.pop()
        if (!entry) return
        writeBucket(updatedBucket)

        if (entry.action === 'ADD') {
            applyInsert(entry.id, entry.componentInfo)
        } else if (entry.action === 'DELETE') {
            applyRemove(entry.id)
        } else if (entry.action === 'BATCH') {
            applyBatch(entry.entries, 'redo')
        } else if (entry.action === 'UPDATE_VERTICES') {
            applyVertices(
                entry.id,
                entry.nextX ?? entry.prevX,
                entry.nextY ?? entry.prevY
            )
        } else if (entry.action === 'UPDATE_BULK') {
            applyBulkProps(
                entry.id,
                entry.nextProps ?? entry.prevProps,
                entry.syncDefaults
            )
        }

        // Push the original-shape entry back into historyLog without going
        // through recordToHistoryLog — that would clear bucketLog and break
        // consecutive redos.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cleanEntry: any = { ...entry }
        delete cleanEntry.nextX
        delete cleanEntry.nextY
        delete cleanEntry.nextProps
        const updatedLog = [...historyLogRef.current, cleanEntry as HistoryEntry]
        writeHistory(updatedLog)
    }

    const clearHistory = (
        isPersistedArg: boolean,
        localDraftKey?: string
    ): void => {
        writeHistory([])
        writeBucket([])
        if (!isPersistedArg) {
            localStorage.removeItem(localDraftKey || DRAFT_STORAGE_KEY)
        }
    }

    return {
        historyLog,
        historyLogRef,
        bucketLog,
        bucketLogRef,
        recordToHistoryLog,
        recordBatchToHistoryLog,
        undoLastAction,
        redoLastAction,
        clearHistory,
    }
}
