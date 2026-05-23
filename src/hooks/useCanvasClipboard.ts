import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { GROUP_COMPONENT } from '../constants/misc'
import { generateUUID } from '../utils/misc'
import { cloneElementData, getShapeTextNodes } from '../utils/canvasUtils'
import type { ComponentRecord } from '../types/board'

// Two.js scene objects are typed loosely here; canvas-side typing converges
// in Stages 7–9.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZuiInstanceLike = any

interface SingleClipboardPayload {
    kind: 'single'
    origin: { x: number; y: number }
    items: ComponentRecord[]
}

interface GroupClipboardPayload {
    kind: 'group'
    origin: { x: number; y: number }
    width?: number
    height?: number
    items: ComponentRecord[]
}

type ClipboardPayload = SingleClipboardPayload | GroupClipboardPayload

interface MousePosition {
    clientX: number
    clientY: number
    hasMoved: boolean
}

export interface CanvasClipboardOptions {
    twoJSInstance: TwoLike | null
    zuiInstanceRef: MutableRefObject<ZuiInstanceLike | null>
    boardId: string
    addToLocalComponentStore: (
        id: string,
        componentType: string,
        record: ComponentRecord
    ) => void
    renderGroupRef: MutableRefObject<
        ((groups: ComponentRecord[]) => void) | null
    >
}

export interface CanvasClipboardApi {
    clipboardRef: MutableRefObject<ClipboardPayload | null>
    lastMouseRef: MutableRefObject<MousePosition>
}

export function useCanvasClipboard({
    twoJSInstance,
    zuiInstanceRef,
    boardId,
    addToLocalComponentStore,
    renderGroupRef,
}: CanvasClipboardOptions): CanvasClipboardApi {
    const clipboardRef = useRef<ClipboardPayload | null>(null)
    const lastMouseRef = useRef<MousePosition>({
        clientX: 0,
        clientY: 0,
        hasMoved: false,
    })

    // Track cursor position so paste can land at mouse location
    useEffect(() => {
        const onMove = (e: MouseEvent): void => {
            lastMouseRef.current = {
                clientX: e.clientX,
                clientY: e.clientY,
                hasMoved: true,
            }
        }
        window.addEventListener('mousemove', onMove)
        return (): void => window.removeEventListener('mousemove', onMove)
    }, [])

    // Copy handler (Ctrl+C / Cmd+C)
    useEffect(() => {
        const onCopyEvent = (evt: KeyboardEvent): void => {
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

            let payload: ClipboardPayload
            if (elementData.componentType === GROUP_COMPONENT) {
                const children: ComponentRecord[] = Array.isArray(
                    elementData.children
                )
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const item: any = {
                    ...elementData,
                    x: originX,
                    y: originY,
                    relativeX: 0,
                    relativeY: 0,
                }
                if (elementData.componentType === 'arrowLine') {
                    const line = liveGroup.children?.[0]
                    if (line?.vertices?.length >= 2) {
                        item.x1 = parseInt(String(line.vertices[0].x))
                        item.y1 = parseInt(String(line.vertices[0].y))
                        item.x2 = parseInt(String(line.vertices[1].x))
                        item.y2 = parseInt(String(line.vertices[1].y))
                    }
                }
                if (elementData.componentType === 'newText') {
                    // Multiline standalone text is a stack of Two.Text line
                    // nodes (line 1 + satellites) in the same group;
                    // children[0] alone is only line 1. Reconstruct the raw
                    // string from every line node so the clone keeps all
                    // lines.
                    const textNodes = getShapeTextNodes(liveGroup)
                    const firstNode = textNodes[0]
                    if (firstNode && typeof firstNode.value === 'string') {
                        item.textColor = firstNode.fill || item.textColor
                        item.metadata = {
                            ...item.metadata,
                            content: textNodes
                                .map((n) => n.value)
                                .join('\n'),
                            fontSize:
                                firstNode.size || item.metadata?.fontSize,
                            textFontFamily:
                                firstNode.family ||
                                item.metadata?.textFontFamily,
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
        return (): void => window.removeEventListener('keydown', onCopyEvent)
    }, [twoJSInstance, zuiInstanceRef])

    // Paste handler (Ctrl+V / Cmd+V)
    useEffect(() => {
        const onPasteEvent = (evt: KeyboardEvent): void => {
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
                const rect = document
                    .getElementById('main-two-root')
                    ?.getBoundingClientRect()
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
                if (!src) return
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const newItem: any = cloneElementData(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    src as any,
                    boardId,
                    px,
                    py
                )
                if (src.componentType === 'arrowLine') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const s = src as any
                    const dx = (s.x2 ?? 0) - (s.x1 ?? 0)
                    const dy = (s.y2 ?? 0) - (s.y1 ?? 0)
                    newItem.x1 = 0
                    newItem.y1 = 0
                    newItem.x2 = dx
                    newItem.y2 = dy
                }
                if (
                    (src.componentType === 'pencil' ||
                        src.componentType === 'area' ||
                        src.componentType === 'route') &&
                    Array.isArray(src.metadata)
                ) {
                    const dx = px - src.x
                    const dy = py - src.y
                    newItem.metadata = (
                        src.metadata as Array<{ x: number; y: number; lw?: number }>
                    ).map((pt) => {
                        const lwProp =
                            pt.lw !== undefined ? { lw: pt.lw } : {}
                        return { x: pt.x + dx, y: pt.y + dy, ...lwProp }
                    })
                }
                addToLocalComponentStore(
                    newItem.id,
                    newItem.componentType,
                    newItem
                )
                return
            }

            if (clipboard.kind === 'group') {
                const newChildren = clipboard.items.map((child) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const c = child as any
                    const rX = c.relativeX ?? 0
                    const rY = c.relativeY ?? 0
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const cloned: any = cloneElementData(
                        c,
                        boardId,
                        rX,
                        rY
                    )
                    cloned.relativeX = rX
                    cloned.relativeY = rY
                    return cloned
                })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const newGroup: any = {
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
        return (): void => window.removeEventListener('keydown', onPasteEvent)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boardId, addToLocalComponentStore])

    return { clipboardRef, lastMouseRef }
}
