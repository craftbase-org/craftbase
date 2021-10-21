import React, { useEffect, useState, Fragment } from 'react'
import interact from 'interactjs'
import { useDispatch, useSelector } from 'react-redux'
import ObjectSelector from 'components/utils/objectSelector'
import { setPeronsalInformation, ungroupElements } from 'store/actions/main'
import Loadable from 'react-loadable'
import Loader from 'components/utils/loader'
import ElementWrapper from 'components/elementWrapper'

function GroupedObjectWrapper(props) {
    const status = useSelector((state) => state.main.currentStatus)
    const lastAddedElement = useSelector((state) => state.main.lastAddedElement)
    const dispatch = useDispatch()
    console.log(
        'useSelector',
        useSelector((state) => state)
    )
    const two = props.twoJSInstance

    let rectangleInstance = null
    let groupInstance = null
    let selectorInstance = null

    function onBlurHandler(e) {
        selectorInstance.hide()
        two.update()
    }

    function onFocusHandler(e) {
        document.getElementById(`${groupInstance.id}`).style.outline = 0
    }

    useEffect(() => {
        // Calculate x and y through dividing width and height by 2 or vice versa
        // if x and y are given then multiply width and height into 2
        const offsetHeight = 0

        const prevX = localStorage.getItem('groupobject_coordX')
        const prevY = localStorage.getItem('groupobject_coordY')

        // Dummying group's layout by empty rectangle's shape implementation
        const rectangle = two.makeRectangle(
            parseInt(prevX),
            parseInt(prevY),
            props.itemData.width || 0,
            props.itemData.height || 0
        )
        rectangle.fill = 'rgba(0,0,0,0)'
        rectangle.noStroke()
        rectangleInstance = rectangle

        console.log('rectangle', rectangle.getBoundingClientRect(), props)

        const group = two.makeGroup(rectangle)
        group.elementData = props?.itemData
        group.translation.x = parseInt(prevX) || 500
        group.translation.y = parseInt(prevY) || 200
        two.update()
        // // Iterate over group children
        // props.childrenArr.forEach((item, index) => {
        //   // Create factory for that each component

        // });

        for (let index = 0; index < props.childrenArr.length; index++) {
            const item = props.childrenArr[index]
            console.log('item in childrenArr', item)
            import(`factory/${item.name}`).then((component) => {
                console.log('component', component)
                const componentFactory = new component.default(
                    two,
                    item.x,
                    item.y,
                    {}
                )
                const factoryObject = componentFactory.createElement()
                const coreObject = factoryObject.group
                console.log('factoryObject', factoryObject)
                // set component's coordinates
                coreObject.translation.x = item.x
                coreObject.translation.y = item.y
                group.add(coreObject)
                group.children.unshift(coreObject)
                two.update()
            })
        }

        groupInstance = group

        console.log('Grouped Objects Wrapper', props.twoJSInstance)

        const selector = new ObjectSelector(two, group, 0, 0, 0, 0, 4)
        selector.create()
        selectorInstance = selector

        two.update()

        document
            .getElementById(group.id)
            .setAttribute('class', 'dragger-picker')
        document
            .getElementById(group.id)
            .setAttribute('data-label', 'groupobject_coord')

        const getGroupElementFromDOM = document.getElementById(`${group.id}`)
        getGroupElementFromDOM.addEventListener('focus', onFocusHandler)
        getGroupElementFromDOM.addEventListener('blur', onBlurHandler)

        interact(`#${group.id}`).on('click', () => {
            console.log('on click ')
            selector.update(
                rectangle.getBoundingClientRect(true).left - 10,
                rectangle.getBoundingClientRect(true).right + 10,
                rectangle.getBoundingClientRect(true).top - 10,
                rectangle.getBoundingClientRect(true).bottom + 10
            )
            two.update()
        })

        group._renderer.elem.addEventListener('dblclick', () => {
            // console.log("group dblclick handler", group.children[1].id);

            // loop through all children of group
            props.childrenArr.forEach((child, index) => {
                // This is DOM element's id not the actual data's id
                const childDOMNode = document.getElementById(
                    group.children[index + 1].id
                )
                console.log('childDOMNode', childDOMNode)
                localStorage.setItem(
                    `${child.name}_coordX`,
                    childDOMNode.getBoundingClientRect().x
                )
                localStorage.setItem(
                    `${child.name}_coordY`,
                    childDOMNode.getBoundingClientRect().y
                )
            })
            group.opacity = 0
            dispatch(
                ungroupElements('UNGROUP_ELEMENT', {
                    data: { groupId: props.id },
                })
            )
            // two.remove();
        })

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
                            rectangle.getBoundingClientRect(true).left - 10,
                            rectangle.getBoundingClientRect(true).right + 10,
                            rectangle.getBoundingClientRect(true).top - 10,
                            rectangle.getBoundingClientRect(true).bottom + 10
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
            two.remove(group)
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
