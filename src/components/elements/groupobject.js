import React, { useEffect, useState, useRef, Fragment } from 'react'

const factoryModules = import.meta.glob('../../factory/*.js')
import Two from 'two.js'
import { useBoardContext } from 'views/Board/board'
import { useMutation } from '@apollo/client'
import { UPDATE_COMPONENT_INFO } from 'schema/mutations'
import ObjectSelector from 'components/utils/objectSelector'
import getEditComponents from 'components/utils/editWrapper'
import { elementOnBlurHandler } from 'utils/misc'

function GroupedObjectWrapper(props) {
    // console.log('history', history)
    const [updateComponentInfo] = useMutation(UPDATE_COMPONENT_INFO, {
        ignoreResults: true,
    })
    const {
        addToLocalComponentStore,
        updateComponentBulkPropertiesInLocalStore,
        deleteBulkComponentsFromLocalStore,
        recordBatchToHistoryLog,
        isPencilMode,
        isArrowDrawMode,
        isArrowSelected,
    } = useBoardContext()

    const two = props.twoJSInstance
    const [deleteGroupElements, setDeleteGroupElements] = useState(null)
    const [groupId, setGroupId] = useState(null)
    const isDeletingRef = useRef(false)
    // const [twoGroupInstance,setTwoGroupInstance] = useState(null)
    let rectangleInstance = null
    let groupInstance = null
    let selectorInstance = null

    function isInScene(element) {
        return element && two.scene.children.includes(element)
    }

    function onBlurHandler(e) {
        // console.log(
        //     'groupObject on blur handler',
        //     groupInstance,
        //     groupInstance.translation.x,
        //     groupInstance.translation.y
        // )
        elementOnBlurHandler(e, selectorInstance, two)
        window.dispatchEvent(new CustomEvent('groupBlurred'))
        // on un-group, these components will return back to their individual state
        // with their new positions depending on group's x,y was changed
        if (!isDeletingRef.current) {
            const userId = localStorage.getItem('userId')
            let childrenIdsOfTheGroup = props.children.map((item) => item.id)

            let foundOriginalCount = 0

            // two.scene.children means all the elements you see in canvas drawing area
            two.scene.children.forEach((element) => {
                if (!element.elementData) return
                if (childrenIdsOfTheGroup.includes(element.elementData.id)) {
                    foundOriginalCount++
                    element.opacity = 1
                    let findRelativeDataForChild = {}
                    props.children.forEach((item) => {
                        if (item.id === element?.elementData?.id) {
                            findRelativeDataForChild = item
                        }
                    })
                    let newX =
                        parseInt(groupInstance.translation.x) +
                        parseInt(findRelativeDataForChild.x)
                    let newY =
                        parseInt(groupInstance.translation.y) +
                        parseInt(findRelativeDataForChild.y)
                    element.translation.x = newX
                    element.translation.y = newY

                    let newMetadata = element.elementData.metadata
                    if (
                        element.elementData.componentType === 'pencil' &&
                        Array.isArray(element.elementData.metadata)
                    ) {
                        newMetadata = element.elementData.metadata.map(
                            (vert, index) => {
                                const lwProp =
                                    vert.lw !== undefined ? { lw: vert.lw } : {}
                                if (index === 0) {
                                    return { x: newX, y: newY, ...lwProp }
                                } else if (index > 0) {
                                    return {
                                        x:
                                            newX +
                                            parseInt(
                                                vert.x -
                                                    element.elementData
                                                        .metadata[0].x
                                            ),
                                        y:
                                            newY +
                                            parseInt(
                                                vert.y -
                                                    element.elementData
                                                        .metadata[0].y
                                            ),
                                        ...lwProp,
                                    }
                                }
                            }
                        )
                        element.children.forEach((eachChild) => {
                            if (eachChild.vertices) {
                                eachChild.vertices = []
                                newMetadata.forEach(function (point) {
                                    eachChild.vertices.push(
                                        new Two.Anchor(
                                            point.x - newX,
                                            point.y - newY
                                        )
                                    )
                                })
                            }
                        })
                    }

                    let updateObj = {
                        metadata: newMetadata,
                        x: element.translation.x,
                        y: element.translation.y,
                        updatedBy: userId,
                    }
                    updateComponentBulkPropertiesInLocalStore(
                        element?.elementData?.id,
                        updateObj
                    )
                    two.update()
                }
            })

            // Pasted group: children were never added as individual scene elements,
            // so nothing was found above. Add each child to the component store at
            // its absolute position so they persist as individual elements.
            if (foundOriginalCount === 0 && props.children.length > 0) {
                const gx = parseInt(groupInstance.translation.x)
                const gy = parseInt(groupInstance.translation.y)
                const batchEntries = []
                props.children.forEach((child) => {
                    const localX = parseInt(child.x ?? child.relativeX ?? 0)
                    const localY = parseInt(child.y ?? child.relativeY ?? 0)
                    const absX = gx + localX
                    const absY = gy + localY

                    let childMetadata = child.metadata
                    if (
                        child.componentType === 'pencil' &&
                        Array.isArray(child.metadata)
                    ) {
                        childMetadata = child.metadata.map((vert, index) => {
                            const lwProp =
                                vert.lw !== undefined ? { lw: vert.lw } : {}
                            if (index === 0) {
                                return { x: absX, y: absY, ...lwProp }
                            }
                            return {
                                x: absX + parseInt(vert.x - localX),
                                y: absY + parseInt(vert.y - localY),
                                ...lwProp,
                            }
                        })
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
                        true // skipHistory — batch entry recorded below
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

    function onFocusHandler(e) {
        document.getElementById(`${groupInstance.id}`).style.outline = 0
        window.dispatchEvent(
            new CustomEvent('groupFocused', {
                detail: { group: groupInstance },
            })
        )
    }

    function onKeyDown(evt) {
        console.log('GroupedObjectWrapper ... onKeyDown')
        if (evt.keyCode === 8 || evt.keyCode === 46) {
            console.log(
                'GroupedObjectWrapper ... onKeyDown ... condition(evt.keyCode === 8 || evt.keyCode === 46) === true',
                groupInstance
            )
            // DELETE/BACKSPACE KEY WAS PRESSED
            // set ref before removal so the blur handler (stale closure) skips un-group logic
            isDeletingRef.current = true
            setDeleteGroupElements(groupInstance.elementData)

            if (isInScene(groupInstance)) {
                two.remove([groupInstance])
                // two.update() is handled by elementOnBlurHandler which fires synchronously
                // during the DOM removal above — calling it again here causes a double-remove crash
            }
        }
    }

    const handleOnDeleteGroupElements = () => {
        if (deleteGroupElements?.id !== undefined) {
            const idsArr = deleteGroupElements.children.map((item) => item.id)

            // Synchronously remove the hidden child elements from Two.js scene and
            // reconcile the SVG DOM before deleteBulkComponentsFromLocalStore triggers
            // React unmounts. The element components' cleanup effects call
            // two.remove(group), which becomes a no-op once the elements are already
            // out of two.scene.children (Two.js Group.remove() skips ids it doesn't own).
            // This prevents the half-reconciled SVG state that causes mousedown's
            // two.update() to throw NotFoundError on subsequent clicks.
            const toRemove = two.scene.children.filter(
                (el) =>
                    el.elementData && idsArr.includes(el.elementData.id)
            )
            if (toRemove.length > 0) {
                two.remove(toRemove)
                try {
                    two.update()
                } catch (err) {
                    // If the SVG tree is in an inconsistent state from a prior
                    // operation (e.g., elements nested under a removed group),
                    // clear the leftover subtractions so they don't re-trigger the
                    // same crash on the next two.update() call.
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
    }, [deleteGroupElements])

    useEffect(() => {
        const onZoomChanged = (e) => {
            if (!selectorInstance) return
            selectorInstance.setScale(e.detail.scale)
            two.update()
        }
        window.addEventListener('zoomChanged', onZoomChanged)
        return () => window.removeEventListener('zoomChanged', onZoomChanged)
    }, [])

    useEffect(() => {
        // console.log('group object props', props)
        // Calculate x and y through dividing width and height by 2 or vice versa
        // if x and y are given then multiply width and height into 2
        const offsetHeight = 0

        const prevX = props.x
        const prevY = props.y

        // Dummying group's layout by empty rectangle's shape implementation
        const rectangle = two.makeRectangle(
            0,
            0,
            props?.width || 0,
            props?.height || 0
        )
        rectangle.fill = 'rgba(0,0,0,0)'
        rectangle.noStroke()
        rectangleInstance = rectangle

        // console.log('rectangle', rectangle.getBoundingClientRect(), props)

        const group = two.makeGroup(rectangle)
        group.elementData = {
            ...props?.itemData,
            children: props.children,
            isGroupSelector: true,
        }
        group.translation.x = parseInt(prevX) || 500
        group.translation.y = parseInt(prevY) || 200
        two.update()
        // // Iterate over group children
        // props.childrenArr.forEach((item, index) => {
        //   // Create factory for that each component

        // });

        for (let index = 0; index < props.children.length; index++) {
            const item = props.children[index]
            const factoryKey = `../../factory/${item.componentType}.js`
            if (typeof factoryModules[factoryKey] !== 'function') continue
            factoryModules[factoryKey]().then((component) => {
                const componentFactory = new component.default(
                    two,
                    item.x,
                    item.y,
                    { ...item }
                )
                const factoryObject = componentFactory.createElement()
                const coreObject = factoryObject.group
                // console.log('factoryObject', factoryObject)
                // set component's coordinates
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
                    twoText.family = meta.textFamily || 'Caveat'
                    coreObject.add(twoText)
                }

                group.add(coreObject)
                // group.children.unshift(coreObject)
                two.update()
            })
        }

        // console.log('after group children has been added', group.children)

        groupInstance = group

        // console.log('Grouped Objects Wrapper', props.twoJSInstance)

        const { selector } = getEditComponents(two, group, 4)
        selectorInstance = selector

        two.update()
        // console.log(
        //     'group object translation',
        //     group.translation.x,
        //     group.translation.y
        // )

        document
            .getElementById(group.id)
            .setAttribute('class', 'dragger-picker')
        document
            .getElementById(group.id)
            .setAttribute('data-label', 'groupobject_coord')

        document.getElementById(group.id).dispatchEvent(new Event('mousedown'))

        const getGroupElementFromDOM = document.getElementById(`${group.id}`)
        getGroupElementFromDOM.addEventListener('focus', onFocusHandler)
        getGroupElementFromDOM.addEventListener('blur', onBlurHandler)
        getGroupElementFromDOM.addEventListener('keydown', onKeyDown)

        getGroupElementFromDOM.focus()

        // simulating click behvior
        selector.update(
            rectangle.getBoundingClientRect(true).left,
            rectangle.getBoundingClientRect(true).right,
            rectangle.getBoundingClientRect(true).top,
            rectangle.getBoundingClientRect(true).bottom,
            two.scene.scale
        )
        two.update()

        // interact(`#${group.id}`).on('click', () => {
        //     console.log('on click ')
        //     selector.update(
        //         rectangle.getBoundingClientRect(true).left,
        //         rectangle.getBoundingClientRect(true).right,
        //         rectangle.getBoundingClientRect(true).top,
        //         rectangle.getBoundingClientRect(true).bottom
        //     )
        //     two.update()
        // })

        // group._renderer.elem.addEventListener('dblclick', () => {
        //     // console.log("group dblclick handler", group.children[1].id);

        //     // loop through all children of group
        //     props.childrenArr.forEach((element, index) => {
        //         // This is DOM element's id not the actual data's id
        //         const childDOMNode = document.getElementById(
        //             group.children[index + 1].id
        //         )
        //         console.log('childDOMNode', childDOMNode)
        //         localStorage.setItem(
        //             `${element.name}_coordX`,
        //             childDOMNode.getBoundingClientRect().x
        //         )
        //         localStorage.setItem(
        //             `${element.name}_coordY`,
        //             childDOMNode.getBoundingClientRect().y
        //         )
        //     })
        //     group.opacity = 0

        //     // two.remove();
        // })

        setGroupId(group.id)

        // interact(`#${group.id}`).resizable({
        //     edges: { right: true, left: true, top: true, bottom: true },

        //     listeners: {
        //         start(event) {
        //             getGroupElementFromDOM.setAttribute('data-resize', 'true')
        //         },
        //         move(event) {
        //             const target = event.target
        //             const rect = event.rect

        //             const minRectHeight = parseInt(rect.height / 2)
        //             const minRectWidth = parseInt(rect.width / 2)

        //             if (minRectHeight > 20 && minRectWidth > 20) {
        //                 rectangle.width = rect.width
        //                 rectangle.height = rect.height

        //                 selector.update(
        //                     rectangle.getBoundingClientRect(true).left,
        //                     rectangle.getBoundingClientRect(true).right,
        //                     rectangle.getBoundingClientRect(true).top,
        //                     rectangle.getBoundingClientRect(true).bottom
        //                 )
        //             }
        //             two.update()
        //         },
        //         end(event) {
        //             console.log('the end')
        //             getGroupElementFromDOM.removeAttribute('data-resize')
        //         },
        //     },
        // })

        // interact(`#${group.id}`).draggable({
        //     // enable inertial throwing
        //     inertia: false,

        //     listeners: {
        //         start(event) {
        //             // console.log(event.type, event.target);
        //         },
        //         move(event) {
        //             event.target.style.transform = `translate(${
        //                 event.pageX
        //             }px, ${event.pageY - offsetHeight}px)`
        //         },
        //         end(event) {
        //             console.log(
        //                 'event x',
        //                 event.target.getBoundingClientRect(),
        //                 event.pageX,
        //                 event.clientX
        //             )
        //             // alternate -> take event.rect.left for x
        //             localStorage.setItem(
        //                 'groupobject_coordX',
        //                 parseInt(event.pageX)
        //             )
        //             localStorage.setItem(
        //                 'groupobject_coordY',
        //                 parseInt(event.pageY - offsetHeight)
        //             )
        //             dispatch(setPeronsalInformation('COMPLETE', { data: {} }))
        //         },
        //     },
        // })

        return () => {
            if (isInScene(group)) {
                two.remove(group)
            }
        }
    }, [])

    // When pencil mode is active, disable pointer events on this component
    useEffect(() => {
        if (groupId && document.getElementById(groupId)) {
            document.getElementById(groupId).style.pointerEvents =
                isPencilMode || isArrowDrawMode || isArrowSelected
                    ? 'none'
                    : 'auto'
        }
    }, [isPencilMode, isArrowDrawMode, isArrowSelected, groupId])

    return (
        <React.Fragment>
            {/* <div id="two-grouped-object-wrapper">
        {parentGroupState && renderElements()}
      </div> */}
            {/* <button>change button in group</button> */}
        </React.Fragment>
    )
}

export default GroupedObjectWrapper
