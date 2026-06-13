import React, { useEffect, useState, useRef } from 'react'
import type { ReactElement } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const factoryModules: Record<string, () => Promise<any>> =
    import.meta.glob('../../factory/*.ts')
import Two from 'two.js'
import { useBoardContext } from '../../views/Board/boardContext'
import getEditComponents from '../utils/editWrapper'
import { elementOnBlurHandler } from '../../utils/misc'
import { DEFAULT_TEXT_FONT_FAMILY } from '../../constants/misc'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElementProps = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

// Child element factories load asynchronously, so group.add() can fire out of
// array order on first grouping. Re-sort the group's children by their stored
// z-order `position` (back→front) after every add so the within-group stacking
// always matches the canvas — independent of load timing. The transparent
// selector rectangle (no elementData) is pinned to the back. group.children
// .sort fires Two.js's 'order' event so the SVG <g> nodes physically reorder.
const orderGroupChildrenByZ = (group: ShapeLike): void => {
    group.children.sort((a: ShapeLike, b: ShapeLike) => {
        const aHas = !!a?.elementData
        const bHas = !!b?.elementData
        if (aHas !== bHas) return aHas ? 1 : -1
        const pa = Number.isFinite(a?.elementData?.position)
            ? a.elementData.position
            : 0
        const pb = Number.isFinite(b?.elementData?.position)
            ? b.elementData.position
            : 0
        if (pa !== pb) return pa - pb
        const ca = Number.isFinite(a?.elementData?.createdAt)
            ? a.elementData.createdAt
            : 0
        const cb = Number.isFinite(b?.elementData?.createdAt)
            ? b.elementData.createdAt
            : 0
        if (ca !== cb) return ca - cb
        return String(a?.elementData?.id ?? '').localeCompare(
            String(b?.elementData?.id ?? '')
        )
    })
}

function GroupedObjectWrapper(props: ElementProps): ReactElement {
    const {
        addToLocalComponentStore,
        updateComponentBulkPropertiesInLocalStore,
        deleteBulkComponentsFromLocalStore,
        recordBatchToHistoryLog,
        stateRefForComponentStore,
        isPencilMode,
        isArrowDrawMode,
        isArrowSelected,
    } = useBoardContext()

    const two = props.twoJSInstance
    const [deleteGroupElements, setDeleteGroupElements] =
        useState<ShapeLike>(null)
    const [groupId, setGroupId] = useState<string | null>(null)
    const isDeletingRef = useRef(false)
    // Last group position already written to history. commitGroupMove() compares
    // the live translation against this so a move is recorded exactly once,
    // whether the commit is triggered by drag-end (mouseup) or blur.
    const lastCommitPosRef = useRef<{ x: number; y: number } | null>(null)
    let groupInstance: ShapeLike = null
    let selectorInstance: ShapeLike = null

    function isInScene(element: ShapeLike): boolean {
        return element && two.scene.children.includes(element)
    }

    // Tear down just the transient overlay (resize box + member copies) and drop
    // the selection state — without touching the store. two.remove defers the
    // SVG detach to the next update; if that throws (scene.subtractions pitfall,
    // see CLAUDE.md) clear the stuck subtraction so future updates don't keep
    // retrying the broken removal.
    function dismissOverlayNode(): void {
        selectorInstance?.hide?.()
        window.dispatchEvent(new CustomEvent('groupBlurred'))
        try {
            two.remove([groupInstance])
            two.update()
        } catch (err) {
            console.warn('two.update() during group overlay teardown:', err)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const scene = two.scene as any
            scene.subtractions.length = 0
            scene._flagSubtractions = false
        }
    }

    // Restore the (group-level) opacity of our member elements — they were
    // hidden at 0 under the overlay. metadata may be a pencil vertex array, so
    // guard the `.opacity` read.
    function revealMembers(): void {
        const childrenIds = props.children.map((i: ShapeLike) => i.id)
        two.scene.children.forEach((element: ShapeLike) => {
            if (!element.elementData) return
            if (!childrenIds.includes(element.elementData.id)) return
            const elMeta = element.elementData.metadata
            element.opacity =
                elMeta && !Array.isArray(elMeta) ? (elMeta.opacity ?? 1) : 1
        })
    }

    // Sync the (hidden) member elements to the overlay's current position and
    // record the move to history as ONE batch. Idempotent: if the group hasn't
    // moved since the last commit (lastCommitPosRef) it's a no-op, so calling it
    // on BOTH drag-end (mouseup) and blur never double-records. Committing on
    // drag-end is what makes a group move the last history entry — so undo
    // reverts the move even while the group is still selected, instead of
    // popping the previous action (e.g. a paste).
    function commitGroupMove(): void {
        if (isDeletingRef.current) return
        if (!groupInstance || !isInScene(groupInstance)) return

        const gx = parseInt(String(groupInstance.translation.x))
        const gy = parseInt(String(groupInstance.translation.y))
        const baseline = lastCommitPosRef.current
        if (
            baseline &&
            Math.abs(gx - baseline.x) < 0.5 &&
            Math.abs(gy - baseline.y) < 0.5
        ) {
            return
        }

        const userId = localStorage.getItem('userId')
        const childrenIds = props.children.map((i: ShapeLike) => i.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const batchEntries: any[] = []

        two.scene.children.forEach((element: ShapeLike) => {
            if (!element.elementData) return
            if (!childrenIds.includes(element.elementData.id)) return

            let relativeData: ShapeLike = {}
            props.children.forEach((item: ShapeLike) => {
                if (item.id === element.elementData.id) relativeData = item
            })
            const newX = gx + parseInt(String(relativeData.x))
            const newY = gy + parseInt(String(relativeData.y))
            element.translation.x = newX
            element.translation.y = newY

            let newMetadata = element.elementData.metadata
            if (
                element.elementData.componentType === 'pencil' &&
                Array.isArray(element.elementData.metadata)
            ) {
                const m0 = element.elementData.metadata[0]
                newMetadata = element.elementData.metadata.map(
                    (vert: ShapeLike, index: number) => {
                        const lwProp =
                            vert.lw !== undefined ? { lw: vert.lw } : {}
                        if (index === 0) {
                            return { x: newX, y: newY, ...lwProp }
                        }
                        return {
                            x: newX + parseInt(String(vert.x - m0.x)),
                            y: newY + parseInt(String(vert.y - m0.y)),
                            ...lwProp,
                        }
                    }
                )
                element.children.forEach((eachChild: ShapeLike) => {
                    if (eachChild.vertices) {
                        eachChild.vertices = []
                        newMetadata.forEach((point: ShapeLike) => {
                            eachChild.vertices.push(
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                new (Two as any).Anchor(
                                    point.x - newX,
                                    point.y - newY
                                )
                            )
                        })
                    }
                })
            }

            const childId = element.elementData.id
            const current = (stateRefForComponentStore?.current?.[childId] ??
                {}) as ShapeLike
            const updateObj = {
                metadata: newMetadata,
                x: newX,
                y: newY,
                updatedBy: userId,
            }
            const positionChanged =
                current.x !== updateObj.x || current.y !== updateObj.y
            const metadataChanged = newMetadata !== current.metadata
            if (!positionChanged && !metadataChanged) return

            const prevProps = {
                metadata: current.metadata,
                x: current.x,
                y: current.y,
                updatedBy: current.updatedBy,
            }
            updateComponentBulkPropertiesInLocalStore(childId, updateObj, true)
            batchEntries.push({
                action: 'UPDATE_BULK',
                id: childId,
                prevProps,
                bulkObj: updateObj,
            })
        })

        if (batchEntries.length > 0) {
            recordBatchToHistoryLog(batchEntries)
        }
        // Advance the baseline even if nothing recorded, so we don't re-scan on
        // every subsequent mouseup at the same position.
        lastCommitPosRef.current = { x: gx, y: gy }
        two.update()
    }

    function onBlurHandler(e: FocusEvent): void {
        elementOnBlurHandler(e, selectorInstance, two)
        window.dispatchEvent(new CustomEvent('groupBlurred'))
        if (!isDeletingRef.current) {
            // Commit any pending move FIRST so the (hidden) originals are synced
            // to the overlay's final position before we reveal them below.
            // Idempotent with the drag-end commit, so this won't double-record.
            commitGroupMove()

            const childrenIdsOfTheGroup = props.children.map(
                (item: ShapeLike) => item.id
            )
            let foundOriginalCount = 0
            two.scene.children.forEach((element: ShapeLike) => {
                if (!element.elementData) return
                if (childrenIdsOfTheGroup.includes(element.elementData.id)) {
                    foundOriginalCount++
                    // Reveal the (now position-synced) original: restore its own
                    // group-level opacity — it was hidden at 0 under the overlay.
                    // metadata may be a pencil vertex array, so guard the read.
                    const elMeta = element.elementData.metadata
                    element.opacity =
                        elMeta && !Array.isArray(elMeta)
                            ? (elMeta.opacity ?? 1)
                            : 1
                }
            })
            two.update()

            if (foundOriginalCount === 0 && props.children.length > 0) {
                const gx = parseInt(String(groupInstance.translation.x))
                const gy = parseInt(String(groupInstance.translation.y))
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const batchEntries: any[] = []
                props.children.forEach((child: ShapeLike) => {
                    const localX = parseInt(
                        String(child.x ?? child.relativeX ?? 0)
                    )
                    const localY = parseInt(
                        String(child.y ?? child.relativeY ?? 0)
                    )
                    const absX = gx + localX
                    const absY = gy + localY

                    let childMetadata = child.metadata
                    if (
                        child.componentType === 'pencil' &&
                        Array.isArray(child.metadata)
                    ) {
                        childMetadata = child.metadata.map(
                            (vert: ShapeLike, index: number) => {
                                const lwProp =
                                    vert.lw !== undefined
                                        ? { lw: vert.lw }
                                        : {}
                                if (index === 0) {
                                    return { x: absX, y: absY, ...lwProp }
                                }
                                return {
                                    x: absX + parseInt(String(vert.x - localX)),
                                    y: absY + parseInt(String(vert.y - localY)),
                                    ...lwProp,
                                }
                            }
                        )
                    }

                    const childData = {
                        ...child,
                        x: absX,
                        y: absY,
                        metadata: childMetadata,
                    }
                    addToLocalComponentStore(
                        child.id,
                        child.componentType,
                        childData,
                        true
                    )
                    batchEntries.push({ action: 'ADD', id: child.id })
                })
                recordBatchToHistoryLog(batchEntries)
            }
        }
        if (isInScene(groupInstance)) {
            two.remove([groupInstance])
            two.update()
        }
    }

    function onFocusHandler(): void {
        if (!groupInstance) return
        const el = document.getElementById(`${groupInstance.id}`)
        if (el) el.style.outline = '0'
        window.dispatchEvent(
            new CustomEvent('groupFocused', {
                detail: { group: groupInstance },
            })
        )
    }

    function onKeyDown(evt: KeyboardEvent): void {
        if (evt.keyCode === 8 || evt.keyCode === 46) {
            isDeletingRef.current = true
            setDeleteGroupElements(groupInstance.elementData)

            if (isInScene(groupInstance)) {
                two.remove([groupInstance])
            }
        }
    }

    const handleOnDeleteGroupElements = (): void => {
        if (deleteGroupElements?.id !== undefined) {
            const idsArr = deleteGroupElements.children.map(
                (item: ShapeLike) => item.id
            )

            // Synchronously remove children from the scene before React unmounts
            // them. See CLAUDE.md "Two.js scene.subtractions Pitfall" — the
            // try/catch + subtractions reset here is the canonical recovery
            // pattern.
            const toRemove = two.scene.children.filter(
                (el: ShapeLike) =>
                    el.elementData && idsArr.includes(el.elementData.id)
            )
            if (toRemove.length > 0) {
                two.remove(toRemove)
                try {
                    two.update()
                } catch (err) {
                    console.warn(
                        'two.update() during group delete reconciliation:',
                        err
                    )
                    two.scene.subtractions.length = 0
                    two.scene._flagSubtractions = false
                }
            }

            deleteBulkComponentsFromLocalStore(idsArr)
            setDeleteGroupElements(null)
        }
    }

    useEffect(() => {
        if (deleteGroupElements !== null) {
            handleOnDeleteGroupElements()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deleteGroupElements])

    useEffect(() => {
        const onZoomChanged = (e: Event): void => {
            const detail = (e as CustomEvent<{ scale: number }>).detail
            if (!selectorInstance || !detail) return
            selectorInstance.setScale(detail.scale)
            two.update()
        }
        window.addEventListener('zoomChanged', onZoomChanged)
        return (): void =>
            window.removeEventListener('zoomChanged', onZoomChanged)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const prevX = props.x
        const prevY = props.y

        const rectangle = two.makeRectangle(
            0,
            0,
            props?.width || 0,
            props?.height || 0
        )
        rectangle.fill = 'rgba(0,0,0,0)'
        rectangle.noStroke()

        const group = two.makeGroup(rectangle)
        group.elementData = {
            ...props?.itemData,
            children: props.children,
            isGroupSelector: true,
        }
        group.translation.x = parseInt(String(prevX)) || 500
        group.translation.y = parseInt(String(prevY)) || 200
        two.update()

        // Load every member's FACTORY chunk IN PARALLEL, then add them all +
        // hide the on-canvas originals in a SINGLE two.update() so the
        // group-select swap is atomic. Loading factories one-by-one and adding
        // members as each resolved (a per-child two.update each), while newCanvas
        // hid the originals up-front, left a blank frame (the flicker) between
        // "originals hidden" and "members painted". Factories are prefetched
        // (board.tsx warm list), so Promise.all resolves on the next microtask
        // on a warm cache.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const loaders = props.children.map((item: any) => {
            const factoryKey = `../../factory/${item.componentType}.ts`
            const loader = factoryModules[factoryKey]
            return typeof loader === 'function'
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  loader().then((mod: any) => ({ item, mod }))
                : Promise.resolve(null)
        })

        Promise.all(loaders).then((resolved) => {
            resolved.forEach((entry) => {
                if (!entry) return
                const { item, mod } = entry
                const componentFactory = new mod.default(two, item.x, item.y, {
                    ...item,
                })
                const factoryObject = componentFactory.createElement()
                const coreObject = factoryObject.group
                coreObject.translation.x = item.x
                coreObject.translation.y = item.y
                if (item.metadata?.opacity !== undefined) {
                    coreObject.opacity = item.metadata.opacity
                }

                const meta = item.metadata || {}
                if (meta.hasText && meta.textContent) {
                    const twoText = two.makeText(meta.textContent, 0, 0)
                    twoText.fill = meta.textFill || '#000'
                    twoText.size = meta.textFontSize || 24
                    twoText.alignment = 'center'
                    twoText.baseline = meta.textBaseLine || 'middle'
                    twoText.family =
                        meta.textFontFamily ||
                        meta.textFamily ||
                        DEFAULT_TEXT_FONT_FAMILY
                    coreObject.add(twoText)
                }

                coreObject.elementData = item
                group.add(coreObject)
            })
            orderGroupChildrenByZ(group)

            // Atomic swap: hide the on-canvas originals (group-SELECT only —
            // `membersToHide` is unset for paste) in the SAME update that
            // reveals the member copies, so there is never a blank frame.
            const hideIds: string[] = Array.isArray(props.membersToHide)
                ? props.membersToHide
                : []
            if (hideIds.length) {
                const hideSet = new Set(hideIds)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                two.scene.children.forEach((child: any) => {
                    if (hideSet.has(child?.elementData?.id)) child.opacity = 0
                })
            }

            two.update()
        })

        groupInstance = group

        const { selector } = getEditComponents(two, group, 4)
        selectorInstance = selector

        two.update()

        const groupEl = document.getElementById(group.id)
        if (groupEl) {
            groupEl.setAttribute('class', 'dragger-picker')
            groupEl.setAttribute('data-label', 'groupobject_coord')
            groupEl.dispatchEvent(new Event('mousedown'))
            groupEl.addEventListener('focus', onFocusHandler)
            groupEl.addEventListener('blur', onBlurHandler)
            groupEl.addEventListener('keydown', onKeyDown)
            groupEl.focus()
        }

        // simulating click behavior
        selector.update(
            rectangle.getBoundingClientRect(true).left,
            rectangle.getBoundingClientRect(true).right,
            rectangle.getBoundingClientRect(true).top,
            rectangle.getBoundingClientRect(true).bottom,
            two.scene.scale
        )
        two.update()

        // Baseline for commitGroupMove — the group's initial position. A move
        // is only recorded once it diverges from this (then it advances).
        lastCommitPosRef.current = {
            x: parseInt(String(group.translation.x)),
            y: parseInt(String(group.translation.y)),
        }

        setGroupId(group.id)

        return (): void => {
            if (isInScene(group)) {
                two.remove(group)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Commit the move on drag-end so it lands in history immediately (like a
    // single shape's mouseup), making it the entry an undo reverts even while
    // the group stays selected. commitGroupMove is a no-op unless the group
    // actually moved, so this safely fires on every mouseup.
    useEffect(() => {
        const onMouseUp = (): void => commitGroupMove()
        window.addEventListener('mouseup', onMouseUp, false)
        return (): void =>
            window.removeEventListener('mouseup', onMouseUp, false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Self-teardown when our members are removed out from under us — e.g. undo
    // of a paste, which fires 'elementRemoved' per member via the history
    // applyBatch. Without this the transient overlay (its member copies + the
    // resize box) would linger over now-deleted shapes as a stale selection.
    // We only dismiss the overlay here; the members are already being removed
    // by whoever fired the event, so we never touch the store. The group's own
    // Delete-key path sets isDeletingRef and owns its teardown, so we skip then.
    useEffect(() => {
        const memberIds = new Set(
            (props.children ?? [])
                .map((c: ShapeLike) => c?.id)
                .filter(Boolean)
        )
        const onMemberRemoved = ((e: CustomEvent<{ id: string }>): void => {
            if (isDeletingRef.current) return
            if (!memberIds.has(e.detail?.id)) return
            // Already torn down (a sibling member fired first) — nothing to do.
            if (!groupInstance || !isInScene(groupInstance)) return

            dismissOverlayNode()
            // The overlay has done its job; drop the listener so dead overlays
            // don't accumulate across repeated paste/undo cycles.
            window.removeEventListener('elementRemoved', onMemberRemoved)
        }) as EventListener
        window.addEventListener('elementRemoved', onMemberRemoved)
        return (): void =>
            window.removeEventListener('elementRemoved', onMemberRemoved)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // After an undo/redo, the overlay shows STATIC copies that can't reflect
    // members the history just moved/re-added underneath it (applyBatch touches
    // the real members, not the overlay's copies). Dismiss the overlay so the
    // user sees the real, now-updated members: reveal their opacity, then drop
    // the overlay. We don't commit here — the move was already reverted.
    useEffect(() => {
        const onHistoryApplied = (): void => {
            if (isDeletingRef.current) return
            if (!groupInstance || !isInScene(groupInstance)) return
            revealMembers()
            dismissOverlayNode()
        }
        window.addEventListener('historyApplied', onHistoryApplied)
        return (): void =>
            window.removeEventListener('historyApplied', onHistoryApplied)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const el = groupId ? document.getElementById(groupId) : null
        if (el) {
            el.style.pointerEvents =
                isPencilMode || isArrowDrawMode || isArrowSelected
                    ? 'none'
                    : 'auto'
        }
    }, [isPencilMode, isArrowDrawMode, isArrowSelected, groupId])

    return <React.Fragment />
}

export default GroupedObjectWrapper
