import { useState, useRef } from 'react'
import Two from 'two.js'
import { strokeTypeToDashes, clearDashesOnTwoJSShape } from 'utils/misc'
import { updateX1Y1Vertices, updateX2Y2Vertices } from 'utils/updateVertices'
import { DRAFT_STORAGE_KEY } from 'constants/misc'

// Applies a single property back to a Two.js shape during undo.
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

    const recordToHistoryLog = (entry) => {
        const updatedLog = [
            ...historyLogRef.current,
            { ...entry, timestamp: Date.now() },
        ]
        historyLogRef.current = updatedLog
        console.log('historyLog', updatedLog)
        setHistoryLog(updatedLog)
    }

    const undoLastAction = () => {
        if (historyLogRef.current.length === 0) return

        const updatedLog = [...historyLogRef.current]
        const lastEntry = updatedLog.pop()
        historyLogRef.current = updatedLog
        setHistoryLog(updatedLog)

        const { action, id } = lastEntry
        const two = twoJSInstanceRef.current

        if (action === 'ADD') {
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

            window.dispatchEvent(new CustomEvent('elementRemoved', { detail: { id } }))

            if (isPersistedRef.current) {
                deleteComponent({
                    variables: { id },
                    errorPolicy: import.meta.env.VITE_GRAPHQL_ERROR_POLICY,
                })
            }
            requestAnimationFrame(() => two.update())
        } else if (action === 'DELETE') {
            const { prevState } = lastEntry
            const restoredState = { ...prevState, boardId: boardId }
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
                        undoLastAction()
                        setShowPermissionErrorModal(true)
                    }
                })
            }
        } else if (action === 'UPDATE_VERTICES') {
            const { prevX, prevY } = lastEntry

            const updatedStore = { ...stateRefForComponentStore.current }
            updatedStore[id] = { ...updatedStore[id], x: prevX, y: prevY }
            stateRefForComponentStore.current = updatedStore
            setComponentStore(updatedStore)

            const group = two?.scene.children.find(
                (c) => c?.elementData?.id === id
            )
            if (group) {
                group.translation.x = prevX
                group.translation.y = prevY
                two?.update()
            }
            if (isPersistedRef.current) {
                updateComponentInfo({
                    variables: { id, updateObj: { x: prevX, y: prevY } },
                })
            }
            requestAnimationFrame(() => two?.update())
        } else if (action === 'UPDATE_BULK') {
            const { prevProps } = lastEntry

            const updatedStore = { ...stateRefForComponentStore.current }
            updatedStore[id] = { ...updatedStore[id], ...prevProps }
            stateRefForComponentStore.current = updatedStore
            setComponentStore(updatedStore)

            const group = two?.scene.children.find(
                (c) => c?.elementData?.id === id
            )
            if (group) {
                if (prevProps.x !== undefined) group.translation.x = prevProps.x
                if (prevProps.y !== undefined) group.translation.y = prevProps.y
                Object.entries(prevProps).forEach(([name, val]) => {
                    applyPropertyToTwoJSGroup(group, name, val)
                })

                const hasArrowVertices =
                    prevProps.x1 !== undefined ||
                    prevProps.y1 !== undefined ||
                    prevProps.x2 !== undefined ||
                    prevProps.y2 !== undefined
                if (hasArrowVertices) {
                    const line = group.children?.[0]
                    const pointCircle1Group = group.children?.[1]
                    const pointCircle2Group = group.children?.[2]
                    if (line && pointCircle1Group && pointCircle2Group) {
                        const x1 = prevProps.x1 ?? line.vertices[0].x
                        const y1 = prevProps.y1 ?? line.vertices[0].y
                        const x2 = prevProps.x2 ?? line.vertices[1].x
                        const y2 = prevProps.y2 ?? line.vertices[1].y
                        updateX1Y1Vertices(Two, line, x1, y1, pointCircle1Group, two)
                        updateX2Y2Vertices(Two, line, x2, y2, pointCircle2Group, two)
                    }
                }

                two?.update()

                if (prevProps.width !== undefined || prevProps.height !== undefined) {
                    window.dispatchEvent(
                        new CustomEvent('undoSelectorSync', { detail: { elementId: id } })
                    )
                }
            }

            if (lastEntry.syncDefaults) {
                if (prevProps.linewidth !== undefined)
                    setDefaultLinewidth(prevProps.linewidth)
                if (prevProps.strokeType !== undefined) {
                    setDefaultStrokeType(
                        prevProps.strokeType === 'solid' ? null : prevProps.strokeType
                    )
                }
            }
            if (prevProps.strokeType !== undefined) {
                if (selectedComponent?.group?.data?.elementData) {
                    selectedComponent.group.data.elementData.strokeType = prevProps.strokeType
                }
            }
            if (prevProps.linewidth !== undefined || prevProps.strokeType !== undefined) {
                setToolbarRefreshKey((k) => k + 1)
            }

            if (isPersistedRef.current) {
                updateComponentInfo({
                    variables: { id, updateObj: prevProps },
                })
            }
            requestAnimationFrame(() => two?.update())
        }
    }

    const clearHistory = (isPersisted, localDraftKey) => {
        historyLogRef.current = []
        setHistoryLog([])
        if (!isPersisted) {
            localStorage.removeItem(localDraftKey || DRAFT_STORAGE_KEY)
        }
    }

    return {
        historyLog,
        historyLogRef,
        recordToHistoryLog,
        undoLastAction,
        clearHistory,
    }
}
