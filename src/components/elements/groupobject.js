import React, { useEffect, useState, Fragment } from 'react'
import interact from 'interactjs'
import { useMutation } from '@apollo/client'
import { useHistory } from 'react-router-dom'

import { INSERT_BULK_COMPONENTS } from 'schema/mutations'
import ObjectSelector from 'components/utils/objectSelector'
import getEditComponents from 'components/utils/editWrapper'
import { elementOnBlurHandler } from 'utils/misc'

function getComponentSchema(obj, boardId) {
    return {
        boardId: boardId,
        componentType: obj.componentType,
        fill: obj.fill,
        children: obj?.children ? obj.children : {},
        metadata: obj?.metadata ? obj.metadata : {},
        x: obj.x + 10,
        x1: obj.x1,
        x2: obj.x2,
        y: obj.y + 10,
        y1: obj.y1,
        y2: obj.y2,
        width: obj.width,
        height: obj.height,
        linewidth: obj.linewidth,
        stroke: obj.stroke,
    }
}

function GroupedObjectWrapper(props) {
    const history = useHistory()
    console.log('history', history)
    const [
        insertComponents,
        {
            loading: insertComponentsLoading,
            data: insertComponentsSuccess,
            error: insertComponentsError,
        },
    ] = useMutation(INSERT_BULK_COMPONENTS)
    const two = props.twoJSInstance
    const [cloneElement, setCloneElement] = useState(null)
    // const [twoGroupInstance,setTwoGroupInstance] = useState(null)
    let rectangleInstance = null
    let groupInstance = null
    let selectorInstance = null

    function onBlurHandler(e) {
        console.log(
            'on groupobject blur',
            groupInstance.translation.x,
            groupInstance.translation.y
        )
        elementOnBlurHandler(e, selectorInstance, two)
        props.unGroup && props.unGroup(groupInstance)
        two.update()
    }

    function onFocusHandler(e) {
        console.log('on groupobject focus')
        document.getElementById(`${groupInstance.id}`).style.outline = 0
    }

    // const customEventListener = (action, shapeData) => {
    //     if (action === 'COPY') {
    //         setCloneElement(shapeData)
    //     }
    // }

    function onKeyDown(evt) {
        // unclosed event listener (temp)
        if (evt.key === 'c' && (evt.ctrlKey || evt.metaKey)) {
            // set element data for copy and paste action
            setCloneElement(groupInstance.elementData)
            // alert('Ctrl + c pressed in group oject')
            // customEventListener('COPY', shape.elementData)
            // domElement.removeEventListener('keydown', onKeyDown)
        }
    }

    const onPasteEvent = (evt) => {
        if (evt.key === 'v' && (evt.ctrlKey || evt.metaKey)) {
            if (cloneElement?.id !== undefined) {
                console.log('clone element', cloneElement)

                let objects = cloneElement.children.map((item, index) => {
                    let component = getComponentSchema(item, props.boardId)
                    return component
                })
                console.log('objects for insert component bulk', objects)
                insertComponents({
                    variables: {
                        objects: objects,
                    },
                })
                // alert(`Ctrl+V was pressed ${cloneElement.id}`)
                // setCloneElement(null)
            }
        }
    }

    useEffect(() => {
        window.addEventListener('keydown', onPasteEvent)
        return () => {
            window.removeEventListener('keydown', onPasteEvent)
        }
    }, [cloneElement])

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
            // console.log('item in children', item)
            import(`factory/${item.componentType}`).then((component) => {
                // console.log('component', component)
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
                group.add(coreObject)
                group.children.unshift(coreObject)
                two.update()
            })
        }

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
