import { useState, useRef } from 'react'
import Two from 'two.js'
import { strokeTypeToDashes, clearDashesOnTwoJSShape } from '../utils/misc'
import { updateX1Y1Vertices, updateX2Y2Vertices } from '../utils/updateVertices'
import { DRAFT_STORAGE_KEY } from '../constants/misc'

// Applies a single property back to a Two.js shape during undo/redo.
function applyPropertyToTwoJSGroup(group, name, value) {
    const shape = group.children?.[0]
    if (!shape) return

    switch (name) {
        case 'fill':
        case 'stroke':
        case 'linewidth':
        case 'radius':
        case 'width':
        case 'height':
        case 'textColor':
        case 'iconStroke':
            shape[name] = value
            break
        case 'strokeType':
            shape.dashes = strokeTypeToDashes(value)
            if (!value || value === 'solid') {
                clearDashesOnTwoJSShape(shape)
            }
            break
        case 'metadata':
            if (value && typeof value === 'object') {
                Object.entries(value).forEach(([k, v]) => {
                    shape[k] = v
                })
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
    isPersisted,
    insertComponent,
    deleteComponent,
    updateComponentInfo,
    setComponentStore,
    setShowPermissionErrorModal,
    setDefaultLinewidth,
    setDefaultStrokeType,
    setToolbarRefreshKey,
    selectedComponent,
    stripTypename,
} = {}) {
    const [historyLog, setHistoryLog] = useState([])
    const historyLogRef = useRef([])
    const [bucketLog, setBucketLog] = useState([])
    const bucketLogRef = useRef([])

    const writeHistory = (next) => {
        historyLogRef.current = next
        setHistoryLog(next)
    }
    const writeBucket = (next) => {
        bucketLogRef.current = next
        setBucketLog(next)
    }

    // ---- per-action apply helpers (shared by undo and redo dispatchers) ----

    const applyRemove = (id) => {
        const two = twoJSInstanceRef.current
        const group = two?.scene.children.find(
            (c) => c?.elementData?.id === id
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

    const applyInsert = (id, componentInfo, onPermissionError) => {
        const two = twoJSInstanceRef.current
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
            }).catch((error) => {
                const isPermissionError = error.graphQLErrors?.some(
                    (e) => e.extensions?.code === 'permission-error'
                )
                if (isPermissionError) {
                    onPermissionError?.()
                    setShowPermissionErrorModal(true)
                }
            })
        }
        requestAnimationFrame(() => two?.update())
    }

    const applyVertices = (id, x, y) => {
        const two = twoJSInstanceRef.current
        const updatedStore = { ...stateRefForComponentStore.current }
        updatedStore[id] = { ...updatedStore[id], x, y }
        stateRefForComponentStore.current = updatedStore
        setComponentStore(updatedStore)

        const group = two?.scene.children.find(
            (c) => c?.elementData?.id === id
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

    const applyBulkProps = (id, props, syncDefaults) => {
        const two = twoJSInstanceRef.current
        const updatedStore = { ...stateRefForComponentStore.current }
        updatedStore[id] = { ...updatedStore[id], ...props }
        stateRefForComponentStore.current = updatedStore
        setComponentStore(updatedStore)

        const group = two?.scene.children.find(
            (c) => c?.elementData?.id === id
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
            if (props.linewidth !== undefined)
                setDefaultLinewidth(props.linewidth)
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

    const applyBatch = (entries, direction) => {
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
                    direction === 'undo' ? e.prevState : e.componentInfo
                const restoredState = { ...source, boardId }
                updatedStore[e.id] = restoredState
                if (isPersistedRef.current) {
                    insertComponent({
                        variables: { object: stripTypename(restoredState) },
                    })
                }
            } else if (isRemove) {
                delete updatedStore[e.id]
                window.dispatchEvent(
                    new CustomEvent('elementRemoved', {
                        detail: { id: e.id },
                    })
                )
                const sceneGroup = two?.scene.children.find(
                    (c) => c?.elementData?.id === e.id
                )
                if (sceneGroup) two?.remove([sceneGroup])
                if (isPersistedRef.current) {
                    deleteComponent({ variables: { id: e.id } })
                }
            }
        })

        stateRefForComponentStore.current = updatedStore
        setComponentStore(updatedStore)
        requestAnimationFrame(() => two?.update())
    }

    // ---- public recorders ----

    const recordToHistoryLog = (entry) => {
        const updatedLog = [
            ...historyLogRef.current,
            { ...entry, timestamp: Date.now() },
        ]
        writeHistory(updatedLog)
        // Fresh user action invalidates the redo branch
        writeBucket([])
    }

    const recordBatchToHistoryLog = (entries) => {
        const updatedLog = [
            ...historyLogRef.current,
            { action: 'BATCH', entries, timestamp: Date.now() },
        ]
        writeHistory(updatedLog)
        writeBucket([])
    }

    // Capture the post-action ("next") state needed to redo this entry.
    // Only UPDATE_VERTICES and UPDATE_BULK need extra capture — for ADD/DELETE/BATCH
    // the original entry already contains everything redo needs.
    const captureNextState = (entry) => {
        const { action, id } = entry
        const current = stateRefForComponentStore.current[id]
        if (action === 'UPDATE_VERTICES') {
            return {
                ...entry,
                nextX: current?.x,
                nextY: current?.y,
            }
        }
        if (action === 'UPDATE_BULK') {
            const nextProps = {}
            Object.keys(entry.prevProps || {}).forEach((k) => {
                nextProps[k] = current?.[k]
            })
            return { ...entry, nextProps }
        }
        return entry
    }

    const undoLastAction = () => {
        if (historyLogRef.current.length === 0) return

        const updatedLog = [...historyLogRef.current]
        const lastEntry = updatedLog.pop()
        writeHistory(updatedLog)

        const enrichedForRedo = captureNextState(lastEntry)

        const { action, id } = lastEntry

        if (action === 'ADD') {
            applyRemove(id)
        } else if (action === 'DELETE') {
            applyInsert(id, lastEntry.prevState, () => undoLastAction())
        } else if (action === 'BATCH') {
            applyBatch(lastEntry.entries, 'undo')
        } else if (action === 'UPDATE_VERTICES') {
            applyVertices(id, lastEntry.prevX, lastEntry.prevY)
        } else if (action === 'UPDATE_BULK') {
            applyBulkProps(id, lastEntry.prevProps, lastEntry.syncDefaults)
        }

        const updatedBucket = [...bucketLogRef.current, enrichedForRedo]
        writeBucket(updatedBucket)
    }

    const redoLastAction = () => {
        if (bucketLogRef.current.length === 0) return

        const updatedBucket = [...bucketLogRef.current]
        const entry = updatedBucket.pop()
        writeBucket(updatedBucket)

        const { action, id } = entry

        if (action === 'ADD') {
            applyInsert(id, entry.componentInfo)
        } else if (action === 'DELETE') {
            applyRemove(id)
        } else if (action === 'BATCH') {
            applyBatch(entry.entries, 'redo')
        } else if (action === 'UPDATE_VERTICES') {
            applyVertices(id, entry.nextX, entry.nextY)
        } else if (action === 'UPDATE_BULK') {
            applyBulkProps(id, entry.nextProps, entry.syncDefaults)
        }

        // Push the original-shape entry back into historyLog without going through
        // recordToHistoryLog — that would clear bucketLog and break consecutive redos.
        const cleanEntry = { ...entry }
        delete cleanEntry.nextX
        delete cleanEntry.nextY
        delete cleanEntry.nextProps
        const updatedLog = [...historyLogRef.current, cleanEntry]
        writeHistory(updatedLog)
    }

    const clearHistory = (isPersisted, localDraftKey) => {
        writeHistory([])
        writeBucket([])
        if (!isPersisted) {
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
