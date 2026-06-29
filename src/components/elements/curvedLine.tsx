import React, { useEffect, useRef } from 'react'
import type { ReactElement } from 'react'
import { useBoardContext } from '../../views/Board/boardContext'

import CurvedLineFactory from '../../factory/curvedLine'
import { strokeTypeToDashes } from '../../utils/misc'
import {
    attachHandleCounterScale,
    attachStrokeCounterScale,
} from '../../utils/handleScale'

// A multi-point curved line. Renders as an open, curved Two.Path (see the
// factory). Unlike the geo route it does NOT counter-scale on zoom — a plain
// whiteboard line should scale with the world like every other shape.
//
// When selected it shows one draggable circle handle per vertex; dragging a
// handle reshapes the curve live (the curved Path re-flows its control points
// automatically) and persists the new vertex array into `metadata` on release.
// The drag is self-contained here (using the camera's clientToSurface) rather
// than threaded through the canvas's arrow-endpoint machinery, since that is
// hard-wired to a fixed 2-endpoint shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElementProps = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

const HANDLE_RADIUS = 5
// Clickable band width (screen px) around the curve, held constant at any zoom
// so the line stays easy to select even at 10%.
const HIT_BAND_PX = 22

function CurvedLine(props: ElementProps): ReactElement {
    const {
        isPencilMode,
        isArrowDrawMode,
        isArrowSelected,
        zuiInBoard,
        selectedComponent,
        updateComponentBulkPropertiesInLocalStore,
    } = useBoardContext()

    const two = props.twoJSInstance

    const groupRef = useRef<ShapeLike>(null)
    const pathRef = useRef<ShapeLike>(null)
    const handlesRef = useRef<ShapeLike[]>([])

    // Live values read inside DOM drag handlers registered once at mount — keep
    // them in refs to dodge the stale-closure trap (see CLAUDE.md).
    const zuiRef = useRef<ShapeLike>(zuiInBoard)
    const persistRef = useRef(updateComponentBulkPropertiesInLocalStore)
    const idRef = useRef<string>(props.id)
    useEffect(() => {
        zuiRef.current = zuiInBoard
    }, [zuiInBoard])
    useEffect(() => {
        persistRef.current = updateComponentBulkPropertiesInLocalStore
    }, [updateComponentBulkPropertiesInLocalStore])
    useEffect(() => {
        idRef.current = props.id
    }, [props.id])

    useEffect(() => {
        const prevX = props.x
        const prevY = props.y

        const elementFactory = new CurvedLineFactory(two, prevX, prevY, {
            ...props,
        })
        const { group, path } = elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }

        if (props.parentGroup) {
            // Member of a selected/copied group — render the path into the parent
            // group; no per-vertex handles for grouped members.
            const parentGroup = props.parentGroup
            path.translation.x = props.properties.x
            path.translation.y = props.properties.y
            parentGroup.add(path)
            two.update()
            return (): void => {
                two.remove(group)
            }
        }

        groupRef.current = group
        pathRef.current = path
        two.update()

        const groupEl = document.getElementById(group.id)
        if (groupEl) {
            groupEl.setAttribute('class', 'dragger-picker')
            groupEl.setAttribute('data-component-id', props.id)
            groupEl.setAttribute('data-linewidth', String(props.linewidth ?? ''))
        }
        // Show the `move` cursor over the line body, matching the selection
        // controller's body cursor for other shapes (the curve is a drag zone).
        // Inline beats the base `.dragger-picker` rule but yields to the
        // `!important` draw/pan-mode overrides.
        const pathEl = document.getElementById(path.id)
        if (pathEl) pathEl.style.cursor = 'move'

        // Fat transparent hit path so the (thin) curve is easy to click — its
        // `d` mirrors the visible path (a MutationObserver tracks vertex drags
        // for free), and its stroke width counter-scales so the clickable band
        // stays a constant ~22px on screen at any zoom (else ~0.25px at 10%).
        // A raw SVG node (not a Two child) so it never gets recolored/exported.
        let hitObserver: MutationObserver | null = null
        let detachHitScale: (() => void) | null = null
        if (pathEl) {
            const hitEl = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'path'
            )
            hitEl.setAttribute('stroke', 'transparent')
            hitEl.setAttribute('fill', 'none')
            hitEl.setAttribute('pointer-events', 'stroke')
            hitEl.setAttribute('stroke-linecap', 'round')
            hitEl.setAttribute('stroke-linejoin', 'round')
            hitEl.style.cursor = 'move'
            const syncD = (): void => {
                const d = pathEl.getAttribute('d')
                if (d) hitEl.setAttribute('d', d)
            }
            syncD()
            pathEl.parentNode?.insertBefore(hitEl, pathEl)
            hitObserver = new MutationObserver(syncD)
            hitObserver.observe(pathEl, {
                attributes: true,
                attributeFilter: ['d'],
            })
            detachHitScale = attachStrokeCounterScale(
                (w) => hitEl.setAttribute('stroke-width', String(w)),
                HIT_BAND_PX,
                two,
                zuiRef.current?.zui?.scale ?? two?.scene?.scale ?? 1
            )
        }

        // Build one draggable handle per vertex (children of the group, so they
        // move/scale with it). Hidden until the line is selected.
        const verts = path.vertices
        const handles: ShapeLike[] = []
        for (let i = 0; i < verts.length; i++) {
            const v = verts[i]
            const handle = two.makeCircle(v.x, v.y, HANDLE_RADIUS)
            handle.fill = '#f4f4f2'
            handle.stroke = '#6965db'
            handle.linewidth = 1.5
            group.add(handle)
            handles.push(handle)
        }
        handlesRef.current = handles
        two.update()

        // Hold the vertex dots at a constant on-screen size so they stay
        // grabbable when zoomed far out (else ~1px at 20%).
        const initialScale =
            zuiRef.current?.zui?.scale ?? two?.scene?.scale ?? 1
        const detachHandleScale = attachHandleCounterScale(
            handles,
            two,
            initialScale
        )

        // Per-vertex drag, wired directly on each handle's SVG node. stopPropagation
        // keeps the canvas from also starting a body-drag / reselect.
        const cleanups: Array<() => void> = []
        handles.forEach((handle, index) => {
            const el = document.getElementById(handle.id)
            if (!el) return
            // `move` cursor on the vertex handles too, matching the body + the
            // selection controller's drag-zone cursor.
            el.style.cursor = 'move'
            el.setAttribute('class', 'dragger-picker is-vertex-handle')
            el.setAttribute('data-vertex-index', String(index))
            // Hidden handles must not eat clicks (opacity-0 SVG still hit-tests).
            el.style.pointerEvents = 'none'

            const onMouseDown = (e: MouseEvent): void => {
                e.preventDefault()
                e.stopPropagation()

                const onMove = (me: MouseEvent): void => {
                    const z = zuiRef.current
                    const grp = groupRef.current
                    const pth = pathRef.current
                    if (!z?.zui || !grp || !pth) return
                    const surface = z.zui.clientToSurface(me.clientX, me.clientY)
                    const vertex = pth.vertices[index]
                    vertex.x = surface.x - grp.translation.x
                    vertex.y = surface.y - grp.translation.y
                    handle.translation.x = vertex.x
                    handle.translation.y = vertex.y
                    // Curved, non-manual Path recomputes its control points from
                    // the anchors on render — flag the vertices so it re-flows.
                    pth._flagVertices = true
                    two.update()
                }

                const onUp = (): void => {
                    window.removeEventListener('mousemove', onMove)
                    window.removeEventListener('mouseup', onUp)
                    const grp = groupRef.current
                    const pth = pathRef.current
                    if (!grp || !pth) return
                    // Persist absolute vertex coords (same convention as route).
                    const newVerts = pth.vertices.map((vx: ShapeLike) => ({
                        x: Math.round(grp.translation.x + vx.x),
                        y: Math.round(grp.translation.y + vx.y),
                    }))
                    grp.elementData = { ...grp.elementData, metadata: newVerts }
                    // skipHistory: the component snapshots props at mount
                    // (frozen props), so an UPDATE_BULK undo would revert the
                    // store without re-flowing this Two.js path — a confusing
                    // partial undo. Persist to store + DB, but keep vertex
                    // tweaks out of the undo stack for now. (DB write still
                    // happens — it's gated on persisted mode, not this flag.)
                    persistRef.current?.(
                        idRef.current,
                        { metadata: newVerts },
                        true
                    )
                }

                window.addEventListener('mousemove', onMove)
                window.addEventListener('mouseup', onUp)
            }

            el.addEventListener('mousedown', onMouseDown)
            cleanups.push(() => el.removeEventListener('mousedown', onMouseDown))
        })

        return (): void => {
            hitObserver?.disconnect()
            detachHitScale?.()
            detachHandleScale()
            cleanups.forEach((fn) => fn())
            two.remove(group)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Show the vertex handles only while this line is the active selection.
    useEffect(() => {
        const group = groupRef.current
        if (!group) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const selectedId = (selectedComponent as any)?.group?.id
        const isSelected = selectedId != null && selectedId === group.id
        handlesRef.current.forEach((handle) => {
            handle.opacity = isSelected ? 1 : 0
            const el = document.getElementById(handle.id)
            if (el) el.style.pointerEvents = isSelected ? 'auto' : 'none'
        })
        two.update()
    }, [selectedComponent, two])

    // Reactive style updates (stroke / width / dash) — mirrors route/arrow.
    useEffect(() => {
        const path = pathRef.current
        if (!path) return
        if (props.stroke) path.stroke = props.stroke
        if (props.linewidth) path.linewidth = props.linewidth
        path.dashes = strokeTypeToDashes(props.strokeType)
        two.update()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.stroke, props.linewidth, props.strokeType])

    // Disable hit-testing while a draw tool is active (matches route/area).
    useEffect(() => {
        const group = groupRef.current
        const el = group ? document.getElementById(group.id) : null
        if (el) {
            el.style.pointerEvents =
                isPencilMode || isArrowDrawMode || isArrowSelected
                    ? 'none'
                    : 'auto'
        }
    }, [isPencilMode, isArrowDrawMode, isArrowSelected])

    return <React.Fragment />
}

export default CurvedLine
