import { useEffect, useRef } from 'react'
import { GROUP_COMPONENT } from '../constants/misc'
import { generateUUID } from '../utils/misc'
import { cloneElementData } from '../utils/canvasUtils'

export function useCanvasClipboard({
    twoJSInstance,
    zuiInstanceRef,
    boardId,
    addToLocalComponentStore,
    renderGroupRef,
} = {}) {
    const clipboardRef = useRef(null)
    const lastMouseRef = useRef({ clientX: 0, clientY: 0, hasMoved: false })

    // Track cursor position so paste can land at mouse location
    useEffect(() => {
        const onMove = (e) => {
            lastMouseRef.current = {
                clientX: e.clientX,
                clientY: e.clientY,
                hasMoved: true,
            }
        }
        window.addEventListener('mousemove', onMove)
        return () => window.removeEventListener('mousemove', onMove)
    }, [])

    // Copy handler (Ctrl+C / Cmd+C)
    useEffect(() => {
        const onCopyEvent = (evt) => {
            if (evt.key !== 'c' || !(evt.ctrlKey || evt.metaKey)) return
            const tag = document.activeElement?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return

            const zuiInst = zuiInstanceRef.current
            const liveGroup = zuiInst?.getSelectedGroup?.()
            if (!liveGroup?.elementData?.id) return
            if (!twoJSInstance) return
            evt.preventDefault()

            const originX = liveGroup.translation.x
            const originY = liveGroup.translation.y
            const elementData = liveGroup.elementData

            let payload
            if (elementData.componentType === GROUP_COMPONENT) {
                const children = Array.isArray(elementData.children)
                    ? elementData.children
                    : []
                payload = {
                    kind: 'group',
                    origin: { x: originX, y: originY },
                    width: elementData.width,
                    height: elementData.height,
                    items: children.map((child) => ({ ...child })),
                }
            } else {
                const item = {
                    ...elementData,
                    x: originX,
                    y: originY,
                    relativeX: 0,
                    relativeY: 0,
                }
                // For arrowLine, read live vertex coords (elementData can be stale).
                if (elementData.componentType === 'arrowLine') {
                    const line = liveGroup.children?.[0]
                    if (line?.vertices?.length >= 2) {
                        item.x1 = parseInt(line.vertices[0].x)
                        item.y1 = parseInt(line.vertices[0].y)
                        item.x2 = parseInt(line.vertices[1].x)
                        item.y2 = parseInt(line.vertices[1].y)
                    }
                }
                // For newText, read live Two.js text values so edits after mount are captured.
                if (elementData.componentType === 'newText') {
                    const twoText = liveGroup.children?.[0]
                    if (twoText && typeof twoText.value === 'string') {
                        item.textColor = twoText.fill || item.textColor
                        item.metadata = {
                            ...item.metadata,
                            content: twoText.value,
                            fontSize: twoText.size || item.metadata?.fontSize,
                            textFontFamily: twoText.family || item.metadata?.textFontFamily,
                        }
                    }
                }
                payload = {
                    kind: 'single',
                    origin: { x: originX, y: originY },
                    items: [item],
                }
            }
            clipboardRef.current = payload
        }
        window.addEventListener('keydown', onCopyEvent)
        return () => window.removeEventListener('keydown', onCopyEvent)
    }, [twoJSInstance])

    // Paste handler (Ctrl+V / Cmd+V)
    useEffect(() => {
        const onPasteEvent = (evt) => {
            if (evt.key !== 'v' || !(evt.ctrlKey || evt.metaKey)) return
            const tag = document.activeElement?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return

            const clipboard = clipboardRef.current
            if (!clipboard || !clipboard.items?.length) return

            const zuiInst = zuiInstanceRef.current
            if (!zuiInst?.zui) return
            evt.preventDefault()

            // Resolve paste origin. Fall back to viewport center if cursor hasn't moved.
            let clientX = lastMouseRef.current.clientX
            let clientY = lastMouseRef.current.clientY
            if (!lastMouseRef.current.hasMoved) {
                const rect = document.getElementById('main-two-root')?.getBoundingClientRect()
                if (rect) {
                    clientX = rect.left + rect.width / 2
                    clientY = rect.top + rect.height / 2
                }
            }
            const surface = zuiInst.zui.clientToSurface(clientX, clientY)
            const px = surface.x
            const py = surface.y

            if (clipboard.kind === 'single') {
                const src = clipboard.items[0]
                const newItem = cloneElementData(src, boardId, px, py)
                if (src.componentType === 'arrowLine') {
                    const dx = (src.x2 ?? 0) - (src.x1 ?? 0)
                    const dy = (src.y2 ?? 0) - (src.y1 ?? 0)
                    newItem.x1 = 0
                    newItem.y1 = 0
                    newItem.x2 = dx
                    newItem.y2 = dy
                }
                if (src.componentType === 'pencil' && Array.isArray(src.metadata)) {
                    const dx = px - src.x
                    const dy = py - src.y
                    newItem.metadata = src.metadata.map((pt) => {
                        const lwProp = pt.lw !== undefined ? { lw: pt.lw } : {}
                        return { x: pt.x + dx, y: pt.y + dy, ...lwProp }
                    })
                }
                addToLocalComponentStore(newItem.id, newItem.componentType, newItem)
                return
            }

            if (clipboard.kind === 'group') {
                const newChildren = clipboard.items.map((child) => {
                    const rX = child.relativeX ?? 0
                    const rY = child.relativeY ?? 0
                    const cloned = cloneElementData(child, boardId, rX, rY)
                    cloned.relativeX = rX
                    cloned.relativeY = rY
                    return cloned
                })
                const newGroup = {
                    id: generateUUID(),
                    boardId,
                    componentType: GROUP_COMPONENT,
                    x: px,
                    y: py,
                    width: clipboard.width,
                    height: clipboard.height,
                    fill: null,
                    stroke: null,
                    children: newChildren,
                }
                renderGroupRef.current?.([newGroup])
            }
        }
        window.addEventListener('keydown', onPasteEvent)
        return () => window.removeEventListener('keydown', onPasteEvent)
    }, [boardId, addToLocalComponentStore])

    return { clipboardRef, lastMouseRef }
}
