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
    let groupInstance: ShapeLike = null
    let selectorInstance: ShapeLike = null

    function isInScene(element: ShapeLike): boolean {
        return element && two.scene.children.includes(element)
    }

    function onBlurHandler(e: FocusEvent): void {
        elementOnBlurHandler(e, selectorInstance, two)
        window.dispatchEvent(new CustomEvent('groupBlurred'))
        if (!isDeletingRef.current) {
            const userId = localStorage.getItem('userId')
            const childrenIdsOfTheGroup = props.children.map(
                (item: ShapeLike) => item.id
            )

            let foundOriginalCount = 0
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const blurBatchEntries: any[] = []

            const initialGroupX = parseInt(String(props.x)) || 0
            const initialGroupY = parseInt(String(props.y)) || 0
            const groupMoved =
                Math.abs(groupInstance.translation.x - initialGroupX) > 0.5 ||
                Math.abs(groupInstance.translation.y - initialGroupY) > 0.5

            two.scene.children.forEach((element: ShapeLike) => {
                if (!element.elementData) return
                if (childrenIdsOfTheGroup.includes(element.elementData.id)) {
                    foundOriginalCount++
                    // Restore the element's own (group-level) opacity rather than
                    // forcing 1 — it was hidden at 0 while the group was selected,
                    // and per-element opacity now lives on the group. metadata may
                    // be a pencil vertex array, so guard the `.opacity` read.
                    const elMeta = element.elementData.metadata
                    element.opacity =
                        elMeta && !Array.isArray(elMeta)
                            ? (elMeta.opacity ?? 1)
                            : 1

                    if (!groupMoved) {
                        return
                    }

                    let findRelativeDataForChild: ShapeLike = {}
                    props.children.forEach((item: ShapeLike) => {
                        if (item.id === element?.elementData?.id) {
                            findRelativeDataForChild = item
                        }
                    })
                    const newX =
                        parseInt(String(groupInstance.translation.x)) +
                        parseInt(String(findRelativeDataForChild.x))
                    const newY =
                        parseInt(String(groupInstance.translation.y)) +
                        parseInt(String(findRelativeDataForChild.y))
                    element.translation.x = newX
                    element.translation.y = newY

                    let newMetadata = element.elementData.metadata
                    if (
                        element.elementData.componentType === 'pencil' &&
                        Array.isArray(element.elementData.metadata)
                    ) {
                        newMetadata = element.elementData.metadata.map(
                            (vert: ShapeLike, index: number) => {
                                const lwProp =
                                    vert.lw !== undefined
                                        ? { lw: vert.lw }
                                        : {}
                                if (index === 0) {
                                    return { x: newX, y: newY, ...lwProp }
                                }
                                return {
                                    x:
                                        newX +
                                        parseInt(
                                            String(
                                                vert.x -
                                                    element.elementData
                                                        .metadata[0].x
                                            )
                                        ),
                                    y:
                                        newY +
                                        parseInt(
                                            String(
                                                vert.y -
                                                    element.elementData
                                                        .metadata[0].y
                                            )
                                        ),
                                    ...lwProp,
                                }
                            }
                        )
                        element.children.forEach((eachChild: ShapeLike) => {
                            if (eachChild.vertices) {
                                eachChild.vertices = []
                                newMetadata.forEach(function (
                                    point: ShapeLike
                                ) {
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

                    const childId = element?.elementData?.id
                    const current =
                        stateRefForComponentStore?.current?.[childId] ?? {}
                    const updateObj = {
                        metadata: newMetadata,
                        x: element.translation.x,
                        y: element.translation.y,
                        updatedBy: userId,
                    }

                    const c = current as ShapeLike
                    const positionChanged =
                        c.x !== updateObj.x || c.y !== updateObj.y
                    const metadataChanged = newMetadata !== c.metadata

                    if (!positionChanged && !metadataChanged) {
                        two.update()
                        return
                    }

                    const prevProps = {
                        metadata: c.metadata,
                        x: c.x,
                        y: c.y,
                        updatedBy: c.updatedBy,
                    }
                    updateComponentBulkPropertiesInLocalStore(
                        childId,
                        updateObj,
                        true
                    )
                    blurBatchEntries.push({
                        action: 'UPDATE_BULK',
                        id: childId,
                        prevProps,
                        bulkObj: updateObj,
                    })
                    two.update()
                }
            })

            if (blurBatchEntries.length > 0) {
                recordBatchToHistoryLog(blurBatchEntries)
            }

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

        for (let index = 0; index < props.children.length; index++) {
            const item = props.children[index]
            const factoryKey = `../../factory/${item.componentType}.ts`
            const loader = factoryModules[factoryKey]
            if (typeof loader !== 'function') continue
            loader().then((component) => {
                const componentFactory = new component.default(
                    two,
                    item.x,
                    item.y,
                    { ...item }
                )
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
                orderGroupChildrenByZ(group)
                two.update()
            })
        }

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

        setGroupId(group.id)

        return (): void => {
            if (isInScene(group)) {
                two.remove(group)
            }
        }
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
