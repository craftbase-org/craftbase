import React, { useEffect, useState, Fragment } from 'react'
import Two from 'two.js'
import interact from 'interactjs'
import { useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import {
    UPDATE_COMPONENT_INFO,
    INSERT_BULK_COMPONENTS,
    DELETE_BULK_COMPONENTS,
} from 'schema/mutations'
import ObjectSelector from 'components/utils/objectSelector'
import getEditComponents from 'components/utils/editWrapper'
import { elementOnBlurHandler, generateUUID } from 'utils/misc'

function getComponentSchema(obj, boardId, parentGroupX, parentGroupY) {
    let generateId = generateUUID()
    return {
        id: generateId,
        boardId: boardId,
        componentType: obj.componentType,
        fill: obj.fill,
        children: obj?.children ? obj.children : null,
        metadata: obj?.metadata ? obj.metadata : {},
        x: parentGroupX + obj.x + 100,
        x1: obj.x1,
        x2: obj.x2,
        y: parentGroupY + obj.y + 100,
        y1: obj.y1,
        y2: obj.y2,
        width: obj.width,
        height: obj.height,
        linewidth: obj.linewidth,
        stroke: obj.stroke,
    }
}

function GroupedObjectWrapper(props) {
    const history = useNavigate()
    // console.log('history', history)
    const [
        insertComponents,
        {
            loading: insertComponentsLoading,
            data: insertComponentsSuccess,
            error: insertComponentsError,
        },
    ] = useMutation(INSERT_BULK_COMPONENTS)
    const [
        deleteComponents,
        {
            loading: deleteComponentsLoading,
            data: deleteComponentsSuccess,
            error: deleteComponentsError,
        },
    ] = useMutation(DELETE_BULK_COMPONENTS)
    const [updateComponentInfo] = useMutation(UPDATE_COMPONENT_INFO, {
        ignoreResults: true,
    })

    const two = props.twoJSInstance
    const [cloneGroupElements, setCloneGroupElements] = useState(null)
    const [deleteGroupElements, setDeleteGroupElements] = useState(null)
    // const [twoGroupInstance,setTwoGroupInstance] = useState(null)
    let rectangleInstance = null
    let groupInstance = null
    let selectorInstance = null

    function onBlurHandler(e) {
        // console.log(
        //     'groupObject on blur handler',
        //     groupInstance,
        //     groupInstance.translation.x,
        //     groupInstance.translation.y
        // )
        elementOnBlurHandler(e, selectorInstance, two)
        // on un-group, these components will return back to their individual state
        // with their new positions depending on group's x,y was changed
        if (deleteGroupElements === null) {
            const userId = localStorage.getItem('userId')
            let childrenIds = props.children.map((item) => item.id)
            two.scene.children.forEach((child) => {
                if (childrenIds.includes(child?.elementData?.id)) {
                    // here child refers to twoJS shape instead of element data from DB
                    child.opacity = 1
                    let findRelativeDataForChild = {}
                    props.children.forEach((item) => {
                        if (item.id === child?.elementData?.id) {
                            findRelativeDataForChild = item
                        }
                    })
                    // console.log(
                    //     'child?.elementData in group on blur',
                    //     child?.elementData,
                    // )
                    console.log('child two.js object', child)
                    console.log('groupInstance', groupInstance)
                    let newX =
                        parseInt(groupInstance.translation.x) +
                        parseInt(findRelativeDataForChild.x)
                    let newY =
                        parseInt(groupInstance.translation.y) +
                        parseInt(findRelativeDataForChild.y)
                    child.translation.x = newX
                    child.translation.y = newY

                    let newMetadata = []
                    if (child.elementData.componentType === 'pencil') {
                        newMetadata = child.elementData.metadata.map(
                            (vert, index) => {
                                if (index === 0) {
                                    return { x: newX, y: newY }
                                } else if (index > 0) {
                                    // here the logic is to get relative vertex coordinates to the original metadata
                                    // so we want to get result of ( relative coordinate + orginal_vert(x) - originalX )
                                    // here originalX means the coordinates of first set of vertices
                                    // since they were the first coordinates to start a path
                                    return {
                                        x:
                                            newX +
                                            parseInt(
                                                vert.x -
                                                    child.elementData
                                                        .metadata[0].x
                                            ),
                                        y:
                                            newY +
                                            parseInt(
                                                vert.y -
                                                    child.elementData
                                                        .metadata[0].y
                                            ),
                                    }
                                }
                            }
                        )
                    }

                    child.children.forEach((eachChild, index) => {
                        if (eachChild.vertices) {
                            console.log(
                                'For each in child.children ... is a Path'
                            )

                            console.log(
                                'child.elementData.metadata',
                                child.elementData.metadata
                            )
                            console.log('newMetadata', newMetadata)
                            eachChild.vertices = []

                            newMetadata.forEach(function (point) {
                                eachChild.vertices.push(
                                    new Two.Vector(
                                        point.x - newX,
                                        point.y - newY
                                    )
                                )
                            })
                        }
                    })
                    // update those component's properties
                    // updateComponentInfo({
                    //     variables: {
                    //         id: child?.elementData?.id,
                    //         updateObj: {
                    //             x: child.translation.x,
                    //             y: child.translation.y,
                    //             updatedBy: userId,
                    //         },
                    //     },
                    // })
                    two.update()
                }
            })
            // props.unGroup && props.unGroup(groupInstance)
        }
        two.remove([groupInstance])
        two.update()
    }

    function onFocusHandler(e) {
        console.log('on groupobject focus')
        document.getElementById(`${groupInstance.id}`).style.outline = 0
    }

    // const customEventListener = (action, shapeData) => {
    //     if (action === 'COPY') {
    //         setCloneGroupElements(shapeData)
    //     }
    // }

    function onKeyDown(evt) {
        // unclosed event listener (temp)
        if (evt.key === 'c' && (evt.ctrlKey || evt.metaKey)) {
            // set element data for copy and paste action
            setCloneGroupElements(groupInstance.elementData)
            // alert('Ctrl + c pressed in group oject')
            // customEventListener('COPY', shape.elementData)
            // domElement.removeEventListener('keydown', onKeyDown)
        }

        if (evt.keyCode === 8 || evt.keyCode === 46) {
            console.log('handle key down event', evt)
            // DELETE/BACKSPACE KEY WAS PRESSED
            // props.handleDeleteComponent &&
            //     props.handleDeleteComponent(groupObject)
            setDeleteGroupElements(groupInstance.elementData)

            two.remove([groupInstance])
            two.update()
        }
    }

    const onPasteEvent = (evt) => {
        if (evt.key === 'v' && (evt.ctrlKey || evt.metaKey)) {
            if (cloneGroupElements?.id !== undefined) {
                console.log('clone element', cloneGroupElements)

                let objects = cloneGroupElements.children.map((item, index) => {
                    let component = getComponentSchema(
                        item,
                        props.boardId,
                        parseInt(cloneGroupElements.x),
                        parseInt(cloneGroupElements.y)
                    )
                    return component
                })
                console.log('objects for insert component bulk', objects)
                insertComponents({
                    variables: {
                        objects: objects,
                    },
                })
                // alert(`Ctrl+V was pressed ${cloneGroupElements.id}`)
                // setCloneGroupElements(null)
            }
            onBlurHandler(evt)
        }
    }

    const handleOnDeleteGroupElements = () => {
        if (deleteGroupElements?.id !== undefined) {
            console.log('delete element', deleteGroupElements)

            let idsArr = deleteGroupElements.children.map((item, index) => {
                return item.id
            })

            deleteComponents({
                variables: {
                    _in: idsArr,
                },
            })

            setDeleteGroupElements(null)
            // alert(`Ctrl+V was pressed ${cloneGroupElements.id}`)
            // setCloneGroupElements(null)
        }
    }

    useEffect(() => {
        window.addEventListener('keydown', onPasteEvent)
        return () => {
            window.removeEventListener('keydown', onPasteEvent)
        }
    }, [cloneGroupElements])

    useEffect(() => {
        if (deleteGroupElements !== null) {
            handleOnDeleteGroupElements()
        }
    }, [deleteGroupElements])

    useEffect(() => {
        console.log('group object props', props)
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
            console.log('item in children', item)
            import(`factory/${item.componentType}`).then((component) => {
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
                console.log(
                    'component coreObject generation in group wrapper',
                    item.componentType,
                    item.x,
                    item.y
                )
                group.add(coreObject)
                // group.children.unshift(coreObject)
                two.update()
            })
        }

        console.log('after group children has been added', group.children)

        groupInstance = group

        // console.log('Grouped Objects Wrapper', props.twoJSInstance)

        const { selector } = getEditComponents(two, group, 4)
        selectorInstance = selector

        two.update()
        console.log(
            'group object translation',
            group.translation.x,
            group.translation.y
        )

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
            rectangle.getBoundingClientRect(true).bottom
        )
        two.update()

        interact(`#${group.id}`).on('click', () => {
            console.log('on click ')
            selector.update(
                rectangle.getBoundingClientRect(true).left,
                rectangle.getBoundingClientRect(true).right,
                rectangle.getBoundingClientRect(true).top,
                rectangle.getBoundingClientRect(true).bottom
            )
            two.update()
        })

        // group._renderer.elem.addEventListener('dblclick', () => {
        //     // console.log("group dblclick handler", group.children[1].id);

        //     // loop through all children of group
        //     props.childrenArr.forEach((child, index) => {
        //         // This is DOM element's id not the actual data's id
        //         const childDOMNode = document.getElementById(
        //             group.children[index + 1].id
        //         )
        //         console.log('childDOMNode', childDOMNode)
        //         localStorage.setItem(
        //             `${child.name}_coordX`,
        //             childDOMNode.getBoundingClientRect().x
        //         )
        //         localStorage.setItem(
        //             `${child.name}_coordY`,
        //             childDOMNode.getBoundingClientRect().y
        //         )
        //     })
        //     group.opacity = 0

        //     // two.remove();
        // })

        interact(`#${group.id}`).resizable({
            edges: { right: true, left: true, top: true, bottom: true },

            listeners: {
                start(event) {
                    getGroupElementFromDOM.setAttribute('data-resize', 'true')
                },
                move(event) {
                    const target = event.target
                    const rect = event.rect

                    const minRectHeight = parseInt(rect.height / 2)
                    const minRectWidth = parseInt(rect.width / 2)

                    if (minRectHeight > 20 && minRectWidth > 20) {
                        rectangle.width = rect.width
                        rectangle.height = rect.height

                        selector.update(
                            rectangle.getBoundingClientRect(true).left,
                            rectangle.getBoundingClientRect(true).right,
                            rectangle.getBoundingClientRect(true).top,
                            rectangle.getBoundingClientRect(true).bottom
                        )
                    }
                    two.update()
                },
                end(event) {
                    console.log('the end')
                    getGroupElementFromDOM.removeAttribute('data-resize')
                },
            },
        })

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
            // two.remove(group)
        }
    }, [])

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
