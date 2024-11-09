import React, { useEffect, useState } from 'react'
import interact from 'interactjs'
import { useImmer } from 'use-immer'

import { elementOnBlurHandler } from 'utils/misc'
import getEditComponents from 'components/utils/editWrapper'
import PencilFactory from 'factory/pencil'
import Toolbar from 'components/floatingToolbar'

function Pencil(props) {
    const selectedComponents = []

    const [showToolbar, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer({})

    const two = props.twoJSInstance
    let selectorInstance = null
    let toolbarInstance = null
    let groupObject = null

    // function onBlurHandler(e) {
    //     elementOnBlurHandler(e, selectorInstance, two)
    //     document.getElementById(`${groupObject.id}`) &&
    //         document
    //             .getElementById(`${groupObject.id}`)
    //             .removeEventListener('keydown', handleKeyDown)
    // }

    // function handleKeyDown(e) {
    //     if (e.keyCode === 8 || e.keyCode === 46) {
    //         console.log('handle key down event', e)
    //         // DELETE/BACKSPACE KEY WAS PRESSED
    //         props.handleDeleteComponent &&
    //             props.handleDeleteComponent(groupObject)
    //         two.remove([groupObject])
    //         two.update()
    //     }
    // }

    // function onFocusHandler(e) {
    //     document.getElementById(`${groupObject.id}`).style.outline = 0
    //     document
    //         .getElementById(`${groupObject.id}`)
    //         .addEventListener('keydown', handleKeyDown)
    // }

    // Using unmount phase to remove event listeners
    useEffect(() => {
        // Calculate x and y through dividing width and height by 2 or vice versa
        // if x and y are given then multiply width and height into 2
        const offsetHeight = 0

        const prevX = props.x
        const prevY = props.y

        // Instantiate factory
        const elementFactory = new PencilFactory(two, prevX, prevY, {
            ...props,
        })
        // Get all instances of every sub child element
        const { group, path } = elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }

        if (props.parentGroup) {
            /** This element will be rendered and scoped in its parent group */
            console.log('properties of pencil', props)
            const parentGroup = props.parentGroup
            path.translation.x = props.properties.x
            path.translation.y = props.properties.y
            parentGroup.add(path)
            two.update()
        } else {
            /** This element will render by creating it's own group wrapper */
            groupObject = group

            const { selector } = getEditComponents(two, group, 4)
            selectorInstance = selector

            group.children.unshift(path)
            two.update()

            // document
            //     .getElementById(group.id)
            //     .setAttribute('class', 'dragger-picker')

            document
                .getElementById(group.id)
                .setAttribute('class', 'avoid-dragging')

            // setting database's id in html attribute of element
            document
                .getElementById(group.id)
                .setAttribute('data-component-id', props.id)

            // console.log('two circle', group.id)
            const initialSceneCoords = document
                .getElementById(two.scene.id)
                .getBoundingClientRect()
            console.log('initialSceneCoords', initialSceneCoords)

            setInternalState((draft) => {
                draft.element = {
                    [path.id]: path,
                    [group.id]: group,
                    // [selector.id]: selector,
                }
                draft.group = {
                    id: group.id,
                    data: group,
                }
                draft.shape = {
                    id: path.id,
                    data: path,
                }
                draft.text = {
                    data: {},
                }
                draft.icon = {
                    data: {},
                }
            })

            const getGroupElementFromDOM = document.getElementById(
                `${group.id}`
            )
            // getGroupElementFromDOM.addEventListener('focus', onFocusHandler)
            // getGroupElementFromDOM.addEventListener('blur', onBlurHandler)

            // If component is in area of selection frame/tool, programmatically enable it's selector
            // if (selectedComponents.includes(props.id)) {
            //     console.log('selectedComponents', selectedComponents)

            //     // forcefully
            //     // document.getElementById(`${group.id}`).focus();

            //     selector.update(
            //         circle.getBoundingClientRect(true).left - 10,
            //         circle.getBoundingClientRect(true).right + 10,
            //         circle.getBoundingClientRect(true).top - 10,
            //         circle.getBoundingClientRect(true).bottom + 10
            //     )
            // }

            // const { mousemove, mouseup } = handleDrag(two, group, 'Circle')

            // interact(`#${group.id}`).on('click', () => {
            //     // two.scene.scale = 1
            //     console.log('on click circle', group)
            //     // selector.update(
            //     //     circle.getBoundingClientRect(true).left - 10,
            //     //     circle.getBoundingClientRect(true).right + 10,
            //     //     circle.getBoundingClientRect(true).top - 10,
            //     //     circle.getBoundingClientRect(true).bottom + 10
            //     // )
            //     // two.update()
            //     toggleToolbar(true)
            // })
        }

        return () => {
            console.log('UNMOUNTING in Pencil', group)
            // clean garbage by removing instance
            // two.remove(group)
        }
    }, [])

    useEffect(() => {
        if (internalState?.group?.data) {
            let groupInstance = internalState.group.data
            groupInstance.translation.x = props.x
            groupInstance.translation.y = props.y
            two.update()
        }
        if (internalState?.shape?.data) {
            let shapeInstance = internalState.shape.data

            shapeInstance.width = props.width
                ? props.width
                : shapeInstance.width
            shapeInstance.height = props.height
                ? props.height
                : shapeInstance.height
            shapeInstance.fill = props.fill ? props.fill : shapeInstance.fill

            two.update()
        }
    }, [props.x, props.y, props.fill, props.width, props.height])

    function closeToolbar() {
        toggleToolbar(false)
    }

    return (
        <React.Fragment>
            <div id="two-Pencil"></div>
            {/* <button>change button in group</button> */}
            {showToolbar && (
                <Toolbar
                    toggle={showToolbar}
                    componentState={internalState}
                    closeToolbar={closeToolbar}
                    componentId={props.id}
                    postToolbarUpdate={() => {
                        two.update()
                    }}
                />
            )}
        </React.Fragment>
    )
}

export default Pencil
