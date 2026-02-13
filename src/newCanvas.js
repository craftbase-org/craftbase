import React, { useEffect, useState, useRef } from 'react'
import Two from 'two.js'
import { useNavigate } from 'react-router-dom'

import Loadable from 'react-loadable'
import { ZUI } from 'two.js/extras/jsm/zui'
import { useBoardContext } from 'views/Board/board'

import Zoomer from 'components/utils/zoomer'
import { GROUP_COMPONENT } from 'constants/misc'
import Spinner from 'components/common/spinner'

import Loader from 'components/utils/loader'
import { updateX1Y1Vertices, updateX2Y2Vertices } from 'utils/updateVertices'
import { generateUUID } from 'utils/misc'

function getComponentSchema(obj, boardId) {
    let generateId = generateUUID()
    return {
        boardId: boardId,
        id: generateId,
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

/**
 * @typedef {Object} elementData
 * @property {string} boardId
 * @property {string} componentType
 * @property {string} fill
 * @property {Object} handleDeleteComponent //function
 * @property {number} height
 * @property {number} id // component's id
 * @property {boolean} isDummy
 * @property {boolean} isGroupSelector
 * @property {Object} itemData // the data which we recieve from database
 * @property {Object} metadata
 * @property {number} prevY // the value of prev Y coordinate used to diff
 * @property {number} prevX // the value of prev X coordinate used to diff
 * @property {string} textColor
 * @property {Object} twoJSInstance // the main Two.js instance
 * @property {number} width
 * @property {number} x
 * @property {number} y
 */

var isDrawing

function addZUI(
    props,
    two,
    updateToGlobalState,
    updateComponentVertices,
    customEventListener,
    setOnGroupHandler,
    addToLocalComponentStore,
    setSelectedComponentInBoard,
    setArrowDrawModeOff
) {
    // console.log('two.renderer.domElement', two.renderer.domElement)
    let shape = null
    let domElement = two.renderer.domElement
    let zui = new ZUI(two.scene, domElement)
    let mouse = new Two.Vector()
    let touches = {}
    let distance = 0
    let dragging = false
    let isResizeEvent = false
    let currentPath
    let lastAddedPath
    let paths = []

    let scenario = null
    let SCENARIO_JUST_ADDED_ELEMENT = 'justAddedElement'
    let SCENARIO_PENCIL_MODE = 'pencilMode'
    let SCENARIO_ARROW_DRAW = 'arrowDraw'
    let SCENARIO_DEFAULT = null

    let arrowDrawElement = null

    zui.addLimits(0.06, 8)

    domElement.addEventListener('mousedown', mousedown, false)
    domElement.addEventListener('mousewheel', mousewheel, false)
    domElement.addEventListener('wheel', mousewheel, false)

    domElement.addEventListener('touchstart', touchstart, false)
    domElement.addEventListener('touchmove', touchmove, false)
    domElement.addEventListener('touchend', touchend, false)
    domElement.addEventListener('touchcancel', touchend, false)

    // listen for ctrl + c event
    domElement.addEventListener('keydown', onKeyDown)

    function onKeyDown(evt) {
        // unclosed event listener (temp)
        if (evt.key === 'c' && (evt.ctrlKey || evt.metaKey)) {
            // console.log('shape.elementData', shape.elementData)
            if (shape.elementData?.id !== undefined) {
                // alert('Ctrl + c pressed')
                // console.log('ctrl + c', shape)
                customEventListener('COPY', shape.elementData)
            }

            // domElement.removeEventListener('keydown', onKeyDown)
        }
    }

    function mousedown(e) {
        // initialize shape definition
        // console.log('e in ZUI mouse down', e, e.clientX, e.clientY)
        const lastAddedElementId = localStorage.getItem('lastAddedElementId')

        if (e?.srcElement?.lastChild?.id === 'two-0') {
            let evt = new CustomEvent('clearSelector', {})
            window.dispatchEvent(evt)
        }

        if (isDrawing === true) {
            scenario = SCENARIO_PENCIL_MODE
        }

        const arrowDrawMode = localStorage.getItem('arrowDrawMode')
        if (arrowDrawMode === 'true') {
            scenario = SCENARIO_ARROW_DRAW
        } else if (lastAddedElementId !== null) {
            scenario = SCENARIO_JUST_ADDED_ELEMENT
        }

        switch (scenario) {
            case SCENARIO_ARROW_DRAW: {
                const surfaceCoords = zui.clientToSurface(e.clientX, e.clientY)
                const arrowId = localStorage.getItem('lastAddedElementId')

                arrowDrawElement = two.scene.children.find(
                    (child) => child?.elementData?.id === arrowId
                )

                if (arrowDrawElement) {
                    // Position the group at the clicked point (tail position)
                    arrowDrawElement.position.x = surfaceCoords.x
                    arrowDrawElement.position.y = surfaceCoords.y

                    const line = arrowDrawElement.children[0]
                    const pointCircle1Group = arrowDrawElement.children[1]
                    const pointCircle2Group = arrowDrawElement.children[2]

                    // Reset line vertices: tail at 0,0, head at 0,0
                    updateX1Y1Vertices(
                        Two,
                        line,
                        0,
                        0,
                        pointCircle1Group,
                        two
                    )
                    updateX2Y2Vertices(
                        Two,
                        line,
                        0,
                        0,
                        pointCircle2Group,
                        two
                    )

                    two.update()
                }

                localStorage.removeItem('lastAddedElementId')
                localStorage.removeItem('arrowDrawMode')

                domElement.addEventListener('mousemove', mousemove, false)
                domElement.addEventListener('mouseup', mouseup, false)

                document.getElementById('main-two-root').style.cursor =
                    'crosshair'
                break
            }
            case SCENARIO_JUST_ADDED_ELEMENT:
                domElement.addEventListener('mousemove', mousemove, false)

                // This block falls for the case when there is newly added element and we let user click
                // anywhere to set last added element's position
                const clientToSurface = zui.clientToSurface(
                    e.clientX,
                    e.clientY
                )

                let twoJSElement = two.scene.children.find(
                    (child) => child?.elementData?.id === lastAddedElementId
                )

                if (twoJSElement?.position) {
                    twoJSElement.position.x = clientToSurface.x
                    twoJSElement.position.y = clientToSurface.y

                    two.update()

                    updateComponentVertices(
                        lastAddedElementId,
                        clientToSurface.x,
                        clientToSurface.y
                    )
                }

                localStorage.removeItem('lastAddedElementId')

                // remove event listeners for mousemove
                // domElement.removeEventListener('mousemove', mousemove, false)

                domElement.addEventListener('mousemove', mousemove, false)
                domElement.addEventListener('mouseup', mouseup, false)

                document.getElementById('main-two-root').style.cursor = 'auto'
                break
            case SCENARIO_PENCIL_MODE:
                // do here
                domElement.addEventListener('mousemove', mousemove, false)
                domElement.addEventListener('mouseup', mouseup, false)

                currentPath = two.makePath()
                currentPath.closed = false
                two.add(currentPath)
                paths.push(currentPath)
                break
            default:
                shape = null
                mouse.x = e.clientX
                mouse.y = e.clientY
                let avoidDragging = false
                let isGroupSelector = false

                let path = e.path || (e.composedPath && e.composedPath())

                // checks for path obj in DOM event obj if it contains following element with id attr which matches with similar two.js children group
                // and assigns that specific two.js child(group) to the shape object

                // wiki: two.js has base level group ('scene' which hosts all the objects in instance), so it's like two.js group
                // inside two.js base level group
                path.forEach((item, index) => {
                    // console.log(
                    //     'item?.classList?.value',
                    //     item?.classList?.value,
                    //     item?.classList?.value &&
                    //         item?.classList?.value.includes('dragger-picker') &&
                    //         !item?.classList?.value.includes(
                    //             'avoid-dragging'
                    //         ) &&
                    //         item.tagName === 'g'
                    // )

                    if (item?.classList?.value.includes('avoid-dragging')) {
                        avoidDragging = true
                    }

                    // this does not select path or any inner component
                    // since you mention in condition that only pick with "g" tag name, i.e. group element
                    if (
                        item.tagName === 'g' &&
                        item?.classList?.value.includes('dragger-picker') &&
                        shape == null
                    ) {
                        // console.log('iterating through path', item.id, shape)
                        // console.log(
                        //     'two scene children',
                        //     two.scene.children,
                        //     two.scene.children.find(
                        //         (child) => child.id === item.id
                        //     )
                        // )

                        // if its a arrowLine component and check for class
                        // because we don't want to select top level group id
                        if (item?.classList?.value.includes('is-line-circle')) {
                            // console.log('is arrowLine circle ')
                            // console.log(
                            //     'get attr of parent id',
                            //     document
                            //         .getElementById(item.id)
                            //         .getAttribute('data-parent-id')
                            // )
                            let parentId = document
                                .getElementById(item.id)
                                .getAttribute('data-parent-id')

                            let lineId = document
                                .getElementById(item.id)
                                .getAttribute('data-line-id')

                            let direction = document
                                .getElementById(item.id)
                                .getAttribute('data-direction')

                            let getParentTwoData = two.scene.children.find(
                                (child) => child.id === parentId
                            )

                            // console.log(
                            //     'getParentTwoData and its children',
                            //     getParentTwoData,
                            //     getParentTwoData.children
                            // )

                            let getChildTwoData =
                                getParentTwoData.children.find(
                                    (child) => child.id === item.id
                                )
                            let getSiblingChild =
                                getParentTwoData.children.find(
                                    (child) =>
                                        child.id !== item.id &&
                                        child?.children?.length > 0
                                )
                            let getLineTwoData = getParentTwoData.children.find(
                                (child) => child.id === lineId
                            )
                            // console.log(
                            //     'getChildTwoData',
                            //     getChildTwoData,
                            //     getChildTwoData.type,
                            //     ' getSiblingChild',
                            //     getSiblingChild
                            // )
                            shape = getChildTwoData

                            // setting custom properties to existing two properties
                            shape.lineData = getLineTwoData
                            shape.direction = direction
                            shape.siblingCircle = getSiblingChild

                            shape.opacity = 1
                            shape.siblingCircle.opacity = 1

                            shape.elementData = {
                                // ...shape.elementData,
                                isGroupSelector: false,
                                isLineCircle: true,
                                lineData: getLineTwoData,
                                parentData: getParentTwoData,
                            }
                            // let getChildTwoData =
                        } else {
                            shape = two.scene.children.find(
                                (child) => child.id === item.id
                            )
                        }
                    }
                })

                if (avoidDragging) {
                    shape = {}
                }

                // if shape is null, we initialize it with root element

                // console.log('props.selectPanMode', props.selectPanMode)

                // in case if it's a group selector, it falls under below condition
                if (shape === null) {
                    // shape = two.scene
                    const { x1, x2, y1, y2 } = {
                        x1: 0,
                        x2: 10,
                        y1: 0,
                        y2: 10,
                    }
                    const area = two.makePath(x1, y1, x2, y1, x2, y2, x1, y2)
                    area.fill = 'rgba(0,0,0,0)'
                    area.opacity = 1
                    area.linewidth = 1
                    area.dashes[0] = 4
                    area.stroke = '#505F79'

                    let newSelectorGroup = two.makeGroup(area)

                    const m = zui.clientToSurface(e.clientX, e.clientY)
                    mouse.copy(m)
                    newSelectorGroup.position.copy(mouse)

                    two.update()
                    shape = newSelectorGroup
                    isGroupSelector = true
                }

                // inserting prevX and prevY to diff at updateToGlobalState function
                // checking if new x,y are not equal to prev x,y
                // then only perform the mutation
                if (!avoidDragging) {
                    shape.elementData = {
                        ...shape?.elementData,
                        isGroupSelector: isGroupSelector,
                        prevX: parseInt(shape.translation.x),
                        prevY: parseInt(shape.translation.y),
                    }

                    // console.log('on mouse down')
                    let rect = document
                        .getElementById(shape.id)
                        .getBoundingClientRect()

                    dragging =
                        mouse.x > rect.left &&
                        mouse.x < rect.right &&
                        mouse.y > rect.top &&
                        mouse.y < rect.bottom

                    domElement.addEventListener('mousemove', mousemove, false)
                    domElement.addEventListener('mouseup', mouseup, false)
                }

                // When an arrow or its endpoint circle is selected, disable pointer
                // events on all other components so interactjs resize handlers on
                // shapes like rectangle don't capture events during arrow drag
                if (
                    !avoidDragging &&
                    (shape?.elementData?.isLineCircle ||
                        shape?.elementData?.componentType === 'arrowLine')
                ) {
                    document
                        .querySelectorAll('.dragger-picker:not(.is-line-circle)')
                        .forEach((el) => {
                            el.style.pointerEvents = 'none'
                        })
                }

                // console.log('shape selected', shape)

                if (!shape.elementData.isGroupSelector) {
                    // this internal state is required for floating toolbar component since floating
                    // toolbar relies on the exact structure/schema for component's internal state
                    // so that any changes made from toolbar can be applied directly on component's two.js properties
                    let componentInternalState = {
                        element: {
                            [shape.children[0].id]: shape.children[0],
                            [shape.id]: shape,
                            // [selector.id]: selector,
                        },
                        group: {
                            id: shape.id,
                            data: shape,
                        },
                        shape: {
                            type: shape.elementData.componentType,
                            id: shape.children[0].id,
                            data: shape.children[0],
                        },
                        text: {
                            data: {},
                        },
                        icon: {
                            data: {},
                        },
                    }
                    setSelectedComponentInBoard(componentInternalState)
                }

                two.update()
        }
    }

    function mousemove(e) {
        // console.log(
        //     'mouse move event',
        //     shape?.elementData,
        //     ' shape lineData',
        //     shape?.lineData,
        //     scenario
        // )
        // console.log('shape in mousemove', e, shape, props.selectPanMode)
        const lastAddedElementId = localStorage.getItem('lastAddedElementId')

        if (
            lastAddedElementId !== null &&
            localStorage.getItem('arrowDrawMode') !== 'true'
        ) {
            scenario = SCENARIO_JUST_ADDED_ELEMENT
        }

        switch (scenario) {
            case SCENARIO_ARROW_DRAW:
                if (arrowDrawElement) {
                    const surfaceCoords = zui.clientToSurface(
                        e.clientX,
                        e.clientY
                    )
                    const relX =
                        surfaceCoords.x - arrowDrawElement.position.x
                    const relY =
                        surfaceCoords.y - arrowDrawElement.position.y

                    const line = arrowDrawElement.children[0]
                    const pointCircle2Group = arrowDrawElement.children[2]

                    updateX2Y2Vertices(
                        Two,
                        line,
                        relX,
                        relY,
                        pointCircle2Group,
                        two
                    )
                }
                break
            case SCENARIO_JUST_ADDED_ELEMENT:
                // This block falls for the case when there is newly added element and we let user click
                // anywhere to set last added element's position
                const clientToSurface = zui.clientToSurface(
                    e.clientX,
                    e.clientY
                )

                let twoJSElement = two.scene.children.find(
                    (child) => child?.elementData?.id === lastAddedElementId
                )

                if (twoJSElement?.position) {
                    twoJSElement.position.x = clientToSurface.x
                    twoJSElement.position.y = clientToSurface.y

                    two.update()
                }
                break
            case SCENARIO_PENCIL_MODE:
                let getCoordinate = zui.clientToSurface(e.clientX, e.clientY)

                currentPath.vertices.push(
                    new Two.Vector(getCoordinate.x, getCoordinate.y)
                )
                currentPath.vertices[currentPath.vertices.length - 1].command =
                    'L'
                currentPath.noFill()
                currentPath.stroke = '#000'
                two.update()
                break
            default:
                /**
                    Currently "resize" event handling is at component level.  
                    Once I shift that handling to this one main component,
                    I'll remove this first if condition block
                */

                if (isResizeEvent === true) {
                    domElement.removeEventListener(
                        'mousemove',
                        mousemove,
                        false
                    )
                    domElement.removeEventListener('mouseup', mouseup, false)
                    isResizeEvent = false
                } else if (
                    shape?.id &&
                    document
                        .getElementById(shape.id)
                        .hasAttribute('data-resize')
                ) {
                    // element resize is being performed
                    // console.log('element resize is being performed')
                    isResizeEvent = true
                    domElement.removeEventListener(
                        'mousemove',
                        mousemove,
                        false
                    )
                    domElement.removeEventListener('mouseup', mouseup, false)
                } else if (shape?.id || shape?.elementData) {
                    // console.log('element move operation is being performed')
                    let dx = e.clientX - mouse.x
                    let dy = e.clientY - mouse.y

                    // check if while dragging, the shape does not point to root element (two-0)
                    if (
                        dragging &&
                        shape.id !== 'two-0' &&
                        !shape.elementData.isGroupSelector
                    ) {
                        // code block condition to handle arrow line circle component's dragging
                        // it roughly translates -> does shape === line/arrow line ?
                        if (shape?.lineData) {
                            let line = shape?.lineData

                            if (shape.direction === 'left') {
                                if (e.shiftKey == true) {
                                    let x1 = (line.vertices[0].x +=
                                        dx / zui.scale)
                                    let y1 = (line.vertices[0].y +=
                                        dy / zui.scale)
                                    updateX1Y1Vertices(
                                        Two,
                                        line,
                                        x1,
                                        y1,
                                        shape,
                                        two
                                    )

                                    /* update x2,y2 vertices acc. to shift key press event */
                                    let x2 = line.vertices[1].x
                                    let y2 = y1
                                    updateX2Y2Vertices(
                                        Two,
                                        line,
                                        x2,
                                        y2,
                                        shape.siblingCircle,
                                        two
                                    )
                                } else {
                                    let x1 = (line.vertices[0].x +=
                                        dx / zui.scale)
                                    let y1 = (line.vertices[0].y +=
                                        dy / zui.scale)
                                    updateX1Y1Vertices(
                                        Two,
                                        line,
                                        x1,
                                        y1,
                                        shape,
                                        two
                                    )
                                }
                            } else if (shape.direction === 'right') {
                                if (e.shiftKey === true) {
                                    let x2 = (line.vertices[1].x +=
                                        dx / zui.scale)
                                    let y2 = (line.vertices[1].y +=
                                        dy / zui.scale)
                                    updateX2Y2Vertices(
                                        Two,
                                        line,
                                        x2,
                                        y2,
                                        shape,
                                        two
                                    )

                                    /* update x1,y1 vertices acc. to shift key press event */
                                    let x1 = line.vertices[0].x
                                    let y1 = y2
                                    updateX1Y1Vertices(
                                        Two,
                                        line,
                                        x1,
                                        y1,
                                        shape.siblingCircle,
                                        two
                                    )
                                } else {
                                    let x2 = (line.vertices[1].x +=
                                        dx / zui.scale)
                                    let y2 = (line.vertices[1].y +=
                                        dy / zui.scale)
                                    updateX2Y2Vertices(
                                        Two,
                                        line,
                                        x2,
                                        y2,
                                        shape,
                                        two
                                    )
                                }
                            }
                        }
                        // code block condition to handle normal component's dragging
                        else {
                            shape.position.x += dx / zui.scale
                            shape.position.y += dy / zui.scale
                        }
                    } else if (shape.elementData.isGroupSelector) {
                        // this blocks falls for the case when user has clicked and
                        // is dragging to create a group selector
                        // console.log('shape.position', shape)
                        let area = shape.children[0]
                        let x = e.clientX
                        let y = e.clientY

                        const m = zui.clientToSurface(x, y)
                        mouse.copy(m)

                        const width = mouse.x - shape.position.x
                        const height = mouse.y - shape.position.y

                        area.vertices[1].x = width
                        area.vertices[2].x = width
                        area.vertices[2].y = height
                        area.vertices[3].y = height

                        two.update()
                    } else {
                        if (!props.selectPanMode) {
                            // nothing
                        } else {
                            // zui.translateSurface(dx, dy)
                        }
                    }
                    mouse.set(e.clientX, e.clientY)
                    two.update()
                }
        }
    }

    function mouseup(e) {
        // console.log('e in ZUI mouse up', scenario)
        // old school logic here

        switch (scenario) {
            case SCENARIO_ARROW_DRAW: {
                if (arrowDrawElement) {
                    const line = arrowDrawElement.children[0]
                    const finalX1 = parseInt(line.vertices[0].x)
                    const finalY1 = parseInt(line.vertices[0].y)
                    const finalX2 = parseInt(line.vertices[1].x)
                    const finalY2 = parseInt(line.vertices[1].y)

                    // Update elementData so subsequent drag operations use correct position
                    arrowDrawElement.elementData.x = parseInt(
                        arrowDrawElement.position.x
                    )
                    arrowDrawElement.elementData.y = parseInt(
                        arrowDrawElement.position.y
                    )

                    const newShapeData = {
                        id: arrowDrawElement.elementData.id,
                        prevX: -9999,
                        prevY: -9999,
                        isLineCircle: true,
                        parentData: arrowDrawElement,
                        data: {
                            x: parseInt(arrowDrawElement.position.x),
                            y: parseInt(arrowDrawElement.position.y),
                            x1: finalX1,
                            y1: finalY1,
                            x2: finalX2,
                            y2: finalY2,
                        },
                    }

                    updateToGlobalState(newShapeData, {})
                }

                arrowDrawElement = null
                setArrowDrawModeOff()
                document.getElementById('main-two-root').style.cursor = 'auto'
                domElement.removeEventListener('mousemove', mousemove, false)
                domElement.removeEventListener('mouseup', mouseup, false)
                break
            }
            case SCENARIO_JUST_ADDED_ELEMENT:
                domElement.removeEventListener('mousemove', mousemove, false)
                domElement.removeEventListener('mouseup', mouseup, false)
                break
            case SCENARIO_PENCIL_MODE:
                // isDrawing = false
                // console.log(
                //     'on mouse up pencil mode',
                //     paths,
                //     currentPath.vertices,
                //     currentPath.translation
                // )

                let generateId = generateUUID()
                let componentData = {
                    id: generateId,
                    boardId: props.boardId,
                    componentType: 'pencil',
                    children: {},
                    metadata: [],
                    x: 0,
                    y: 0,
                    linewidth: currentPath.linewidth,
                    stroke: currentPath.stroke,
                }
                componentData.metadata = currentPath.vertices.map(function (
                    vertex
                ) {
                    return { x: vertex.x, y: vertex.y }
                })

                componentData.x = Math.floor(componentData.metadata[0]?.x || 0)
                componentData.y = Math.floor(componentData.metadata[0]?.y || 0)

                addToLocalComponentStore(
                    componentData.id,
                    componentData.componentType,
                    componentData
                )

                // let currentPathRef = currentPath
                // setTimeout(() => {
                //     two.remove(currentPathRef)
                //     two.update()
                // }, 5000)
                break
            default:
                // diff to check new x,y and prev x,y
                let oldShapeData = {}
                let newShapeData = {}
                if (shape?.elementData?.isGroupSelector) {
                    // check on mouse up if shape's a group selector or not
                    // if yes, then call setOnGroup for adding a group in two.js space
                    let area = shape.children[0]
                    let obj = {
                        x: area.vertices[0].x + shape.translation.x,
                        y: area.vertices[0].y + shape.translation.y,
                        left: area.vertices[0].x + shape.translation.x,
                        right: area.vertices[1].x + shape.translation.x,
                        top: area.vertices[0].y + shape.translation.y,
                        bottom: area.vertices[3].y + shape.translation.y,
                        width: area.vertices[2].x - area.vertices[0].x,
                        height: area.vertices[3].y - area.vertices[0].y,
                    }
                    // console.log('shape group obj', obj)
                    two.remove(shape)
                    setOnGroupHandler(obj)
                    setSelectedComponentInBoard(null)
                } else {
                    // else shape is not a group selector then update shape's properties
                    if (
                        shape.elementData.x == shape.translation.x &&
                        shape.elementData.y == shape.translation.y
                    ) {
                        // console.log('no need to update')
                    } else {
                        if (shape?.elementData?.isLineCircle === true) {
                            // console.log('Element is a Line Circle')
                            // updating already created two.js scene groups to new x,y set
                            // shape.elementData.x = shape.translation.x
                            // shape.elementData.y = shape.translation.y
                            shape.opacity = 0
                            shape.siblingCircle.opacity = 0

                            oldShapeData = { ...shape.elementData }

                            newShapeData = Object.assign(
                                {},
                                shape.elementData,
                                {
                                    data: {
                                        // x: parseInt(shape.lineData.translation.x),
                                        // y: parseInt(shape.lineData.translation.y),
                                        x1: parseInt(
                                            shape.lineData.vertices[0].x
                                        ),
                                        y1: parseInt(
                                            shape.lineData.vertices[0].y
                                        ),
                                        x2: parseInt(
                                            shape.lineData.vertices[1].x
                                        ),
                                        y2: parseInt(
                                            shape.lineData.vertices[1].y
                                        ),
                                    },
                                }
                            )

                            updateToGlobalState(newShapeData, oldShapeData)
                        } else {
                            // updating already created two.js scene groups to new x,y set
                            shape.elementData.x = shape.translation.x
                            shape.elementData.y = shape.translation.y

                            oldShapeData = { ...shape.elementData }

                            newShapeData = Object.assign(
                                {},
                                shape.elementData,
                                {
                                    data: {
                                        x: parseInt(shape.translation.x),
                                        y: parseInt(shape.translation.y),
                                    },
                                }
                            )

                            if (
                                shape.elementData.componentType !==
                                'groupobject'
                            ) {
                                updateToGlobalState(newShapeData, oldShapeData)
                            }
                        }
                    }
                }
            // console.log('shape.elementData.writable', newShapeData)
        }

        // let item = {
        //     elementId: shape.elementData.elementId,
        //     data: { x: shape.translation.x, y: shape.translation.y },
        // }
        // Restore pointer events on all components (may have been disabled during arrow drag)
        document.querySelectorAll('.dragger-picker').forEach((el) => {
            el.style.pointerEvents = ''
        })

        shape = {}
        scenario = null

        two.update()

        domElement.removeEventListener('mousemove', mousemove, false)
        domElement.removeEventListener('mouseup', mouseup, false)

        // reset shape to object or null after mouseup event
    }

    function mousewheel(e) {
        if (e.shiftKey === true || e.metaKey === true) {
            let dy = (e.wheelDeltaY || -e.deltaY) / 1000
            zui.zoomBy(dy, e.clientX, e.clientY)
        } else {
            zui.translateSurface(-e.deltaX, -e.deltaY)
        }

        two.update()
    }

    function touchstart(e) {
        switch (e.touches.length) {
            case 2:
                pinchstart(e)
                break
            case 1:
                panstart(e)
                break
        }
    }

    function touchmove(e) {
        switch (e.touches.length) {
            case 2:
                pinchmove(e)
                break
            case 1:
                panmove(e)
                break
        }
    }

    function touchend(e) {
        touches = {}
        let touch = e.touches[0]
        if (touch) {
            // Pass through for panning after pinching
            mouse.x = touch.clientX
            mouse.y = touch.clientY
        }
    }

    function panstart(e) {
        let touch = e.touches[0]
        mouse.x = touch.clientX
        mouse.y = touch.clientY
        two.update()
    }

    function panmove(e) {
        let touch = e.touches[0]
        let dx = touch.clientX - mouse.x
        let dy = touch.clientY - mouse.y
        zui.translateSurface(dx, dy)
        mouse.set(touch.clientX, touch.clientY)
        two.update()
    }

    function pinchstart(e) {
        for (let i = 0; i < e.touches.length; i++) {
            let touch = e.touches[i]
            touches[touch.identifier] = touch
        }
        let a = touches[0]
        let b = touches[1]
        let dx = b.clientX - a.clientX
        let dy = b.clientY - a.clientY
        distance = Math.sqrt(dx * dx + dy * dy)
        mouse.x = dx / 2 + a.clientX
        mouse.y = dy / 2 + a.clientY
    }

    function pinchmove(e) {
        for (let i = 0; i < e.touches.length; i++) {
            let touch = e.touches[i]
            touches[touch.identifier] = touch
        }
        let a = touches[0]
        let b = touches[1]
        let dx = b.clientX - a.clientX
        let dy = b.clientY - a.clientY
        let d = Math.sqrt(dx * dx + dy * dy)
        let delta = d - distance
        zui.zoomBy(delta / 250, mouse.x, mouse.y)
        distance = d
    }

    return { zui, mousemove }
}

const ElementRenderWrapper = (
    ElementToRender,
    data,
    deleteComponentFromLocalStore,
    componentStore
) => {
    const RenderElement = () => {
        const [twoJSShape, setTwoJSShape] = useState(null)
        const [componentData, setComponentData] = useState(null)

        // console.log('in render Element', data, getComponentInfoData?.component)

        useEffect(() => {
            // console.log(
            //     'componentStore change in element render wrapper',
            //     componentStore
            // )
            let allComponents = Object.values(componentStore)
            if (allComponents.length > 0) {
                let componentData = allComponents.find(
                    (item) => data.id === item.id
                )
                // console.log('find component from componentStore', componentData)
                componentData && setComponentData(componentData)
            }
        }, [componentStore])

        if (componentData === null) {
            return <></>
        }

        const handleDeleteComponent = (twoJSShape) => {
            deleteComponentFromLocalStore(data.id)
        }

        return data.twoJSInstance ? (
            componentData !== null ? (
                <ElementToRender
                    handleDeleteComponent={handleDeleteComponent}
                    {...data}
                    {...componentData}
                />
            ) : null
        ) : (
            <Spinner />
        )
    }
    return RenderElement
}

const GroupRenderWrapper = (ElementToRender, data) => {
    const RenderGroup = () => {
        // console.log('in render group wrapper', data)

        return data.twoJSInstance ? <ElementToRender {...data} /> : <Spinner />
    }
    return RenderGroup
}

const Canvas = (props) => {
    // console.log('getComponentsForBoardData', getComponentsForBoardData)

    const {
        addToLocalComponentStore,
        deleteComponentFromLocalStore,
        updateComponentVerticesInLocalStore,
        updateComponentBulkPropertiesInLocalStore,
        setTwoJSInstanceInBoard,
        setSelectedComponentInBoard,
        setArrowDrawModeInBoard,
    } = useBoardContext()

    const [twoJSInstance, setTwoJSInstance] = useState(null)
    const [lastAddedPathId, setLastAddedPathId] = useState(null)
    const [zuiInstance, setZuiInstance] = useState(null)
    const [prevElements, setPrevElements] = useState([])
    const [onGroup, setOnGroup] = useState(null)
    const [componentsToRender, setComponentsToRender] = useState([])
    const [cloneElement, setCloneElement] = useState(null)

    const stateRefForComponentStore = useRef()

    // useEffect(()=>{},[insertComponentSuccess])

    useEffect(() => {
        // setting pan displacement values to initial

        // console.log('CANVAS CDM', props.selectPanMode)
        const elem = document.getElementById('main-two-root')

        const two = new Two({
            fullscreen: true,
            // width: "auto",
        }).appendTo(elem)

        two.update()

        // console.log('two', two.scene)

        // two.scene.translation.x = -50
        let zui_instance = addZUI(
            props,
            two,
            updateToGlobalState,
            updateComponentVertices,
            customEventListener,
            setOnGroupHandler,
            addToLocalComponentStore,
            setSelectedComponentInBoard,
            () => setArrowDrawModeInBoard(false)
        )

        // this.props.getElementsData('CONSTRUCT', arr)
        setZuiInstance(zui_instance)
        setTwoJSInstance(two)
        setTwoJSInstanceInBoard(two)

        const boardId = props.boardId
        const tabsOpen = localStorage.getItem(`tabs_open_${boardId}`)
        // console.log(`tabs_open_${boardId}`, tabsOpen)
        if (tabsOpen == null) {
            localStorage.setItem(`tabs_open_${boardId}`, 1)
        } else {
            localStorage.setItem(
                `tabs_open_${boardId}`,
                parseInt(tabsOpen) + parseInt(1)
            )
        }

        window.onunload = function (e) {
            const newTabCount = localStorage.getItem(`tabs_open_${boardId}`)
            if (newTabCount !== null) {
                localStorage.setItem(`tabs_open_${boardId}`, newTabCount - 1)
            }
        }
    }, [])

    useEffect(() => {
        stateRefForComponentStore.current = props.componentStore
        // console.log(
        //     'change in componentStore in NewCanvas',
        //     stateRefForComponentStore.current
        // )
        if (twoJSInstance !== null && zuiInstance !== null) {
            // listening to the change in components in DB
            // this is especially for capturing INSERT operation
            // where I can assign mousemove event listener to the new component
            let domElement = twoJSInstance?.renderer?.domElement

            domElement.addEventListener(
                'mousemove',
                zuiInstance.mousemove,
                false
            )
        }

        if (Object.values(props.componentStore).length > 0 && twoJSInstance) {
            handleSetComponentsToRender(Object.values(props.componentStore))
        }
    }, [props.componentStore])

    useEffect(() => {
        // console.log('on change props.lastAddedElement')

        if (props.lastAddedElement !== null) {
            let newArr = [
                {
                    ...props.lastAddedElement,
                    isDummy: true,
                },
            ]
            handleSetComponentsToRender(newArr)
        }
    }, [props.lastAddedElement])

    useEffect(() => {
        if (props.isPencilMode === true) {
            isDrawing = true
            document.getElementById('main-two-root').style.cursor = 'crosshair'
        } else {
            isDrawing = false
            document.getElementById('main-two-root').style.cursor = 'auto'
        }
    }, [props.isPencilMode])

    // on group select use effect hook
    useEffect(() => {
        // let componentsArr = [...currentComponents]
        if (onGroup) {
            // console.log('on group useeffect', onGroup)
            let e = onGroup
            let x1Coord = e.left
            let x2Coord = e.right
            let y1Coord = e.top
            let y2Coord = e.bottom

            let xMid = parseInt(e.left) + parseInt(e.width / 2)
            let yMid = parseInt(e.top) + parseInt(e.height / 2)

            const newGroup = {}
            const newChildren = []
            const selectedComponentArr = []
            let twoShapesToDelete = []

            // console.log(
            //     'onGroup get componentStore',
            //     stateRefForComponentStore.current
            // )
            // console.log('x1Coord,x2Coord', x1Coord, x2Coord)
            // console.log('y1Coord,y2Coord', y1Coord, y2Coord)
            const allComponentCoords =
                Object.values(stateRefForComponentStore.current) || []
            // console.log(
            //     'area_selection allComponentCoords',
            //     xMid,
            //     yMid,
            //     state.getCoordGraph
            // )
            // console.log('allComponentCoords', allComponentCoords)
            allComponentCoords.forEach((item, index) => {
                if (
                    item.x > x1Coord &&
                    item.x < x2Coord &&
                    item.y > y1Coord &&
                    item.y < y2Coord
                ) {
                    // console.log('inside component coords condition')
                    selectedComponentArr.push(item.id)

                    let relativeX = item.x - xMid
                    let relativeY = item.y - yMid

                    let newMetadata = []
                    if (item.componentType === 'pencil') {
                        newMetadata = item.metadata.map((vert, index) => {
                            if (index === 0) {
                                return { x: relativeX, y: relativeY }
                            } else if (index > 0) {
                                // here the logic is to get relative vertex coordinates to the original metadata
                                // so we want to get result of ( relative coordinate + orginal_vert(x) - originalX )
                                // here originalX means the coordinates of first set of vertices
                                // since they were the first coordinates to start a path
                                return {
                                    x:
                                        relativeX +
                                        parseInt(vert.x - item.metadata[0].x),
                                    y:
                                        relativeY +
                                        parseInt(vert.y - item.metadata[0].y),
                                }
                            }
                        })
                    }
                    // console.log('newMetadata', newMetadata)
                    let obj = {
                        ...item,
                        metadata: newMetadata,
                        id: item.id,
                        componentType: item.componentType,
                        x: relativeX,
                        relativeX: relativeX,
                        y: relativeY,
                        relativeY: relativeY,
                    }

                    // For arrowLine: read actual vertex coordinates from Two.js scene
                    // to preserve arrow direction (componentStore may have stale/missing values)
                    if (item.componentType === 'arrowLine') {
                        const arrowShape = twoJSInstance.scene.children.find(
                            (child) => child?.elementData?.id === item.id
                        )
                        // Arrow factory adds line as first child (line, pointCircle1Group, pointCircle2Group)
                        const line = arrowShape?.children?.[0]
                        if (line?.vertices?.length >= 2) {
                            obj.x1 = parseInt(line.vertices[0].x)
                            obj.y1 = parseInt(line.vertices[0].y)
                            obj.x2 = parseInt(line.vertices[1].x)
                            obj.y2 = parseInt(line.vertices[1].y)
                        }
                    }

                    newChildren.push(obj)
                }
            })

            newGroup.id = Math.floor(100000 + Math.random() * 900000)
            newGroup.componentType = 'groupobject'
            newGroup.width = e.width
            newGroup.height = e.height

            // Adding half width/height to x,y coords
            // due to selector rectangle being in inside
            // of selected area portion
            newGroup.x = e.x + e.width / 2
            newGroup.y = e.y + e.height / 2

            newGroup.children = newChildren

            // console.log('newGroup.children', newGroup.children)
            // filter out those selected children (which are now grouped into one) from main current components array
            // that means we dont render those components as seperate rather they
            // are now children of this new group

            twoJSInstance.scene.children.forEach((child) => {
                if (selectedComponentArr.includes(child?.elementData?.id)) {
                    child.opacity = 0
                    twoJSInstance.update()
                }
            })

            handleSetComponentsToRender([newGroup])
        }
    }, [onGroup])

    useEffect(() => {
        window.addEventListener('keydown', onPasteEvent)
        return () => {
            window.removeEventListener('keydown', onPasteEvent)
        }
    }, [cloneElement])

    const setOnGroupHandler = (obj) => {
        setOnGroup(obj)
    }

    const handleSetComponentsToRender = (currentComponents) => {
        let arr = [...prevElements]
        // console.log('prevElements', prevElements)
        let components = [...componentsToRender]
        if (currentComponents && twoJSInstance) {
            currentComponents.forEach((item, index) => {
                if (prevElements.includes(item.id)) {
                    // do nothing
                } else {
                    arr.push(item.id)
                    const ElementToRender = Loadable({
                        loader: () =>
                            import(`components/elements/${item.componentType}`),
                        loading: Loader,
                    })
                    const data = {
                        twoJSInstance: twoJSInstance,
                        id: item.id,
                        boardId: props.boardId,
                        // childrenArr: item.children,
                        itemData: item,
                    }

                    // Different render wrapper for components and group
                    let component = null
                    // console.log(
                    //     'in current components to render logic',
                    //     currentComponents,
                    //     props.componentStore
                    // )
                    if (item.componentType === GROUP_COMPONENT) {
                        component = GroupRenderWrapper(ElementToRender, {
                            ...item,
                            ...data,
                        })
                    } else {
                        component = ElementRenderWrapper(
                            ElementToRender,
                            data,
                            deleteComponentFromLocalStore,
                            props.componentStore
                        )
                    }
                    components.push(component)
                }
            })
            setComponentsToRender(components)
            twoJSInstance && setPrevElements(arr)
        }
    }

    const onPasteEvent = (evt) => {
        if (evt.key === 'v' && (evt.ctrlKey || evt.metaKey)) {
            if (
                cloneElement?.id !== undefined &&
                cloneElement.componentType !== 'groupobject'
            ) {
                // console.log('ctrl + v', cloneElement)
                let newComponent = getComponentSchema(
                    cloneElement,
                    props.boardId
                )
                addToLocalComponentStore(
                    newComponent.id,
                    newComponent.componentType,
                    newComponent
                )
                // insertComponent({ variables: { object: newComponent } })
                setCloneElement(null)
                // alert(`Ctrl+V was pressed ${cloneElement.prevX}`)
            }
        }
    }

    const customEventListener = (action, shapeData) => {
        if (action === 'COPY') {
            setCloneElement(shapeData)
        }
    }

    const updateToGlobalState = (newShapeData, oldShapeData) => {
        const userId = localStorage.getItem('userId')
        // console.log('updateToGlobalState', newShapeData, oldShapeData)

        // also check that new x,y is updated or not by comparing to prev x,y
        // then only perform mutation
        if (
            newShapeData.id &&
            (newShapeData.data.x != newShapeData.prevX ||
                newShapeData.data.y != newShapeData.prevY)
        ) {
            let updateObj = {
                x: parseInt(newShapeData.data.x),
                y: parseInt(newShapeData.data.y),
                updatedBy: userId,
            }
            updateComponentBulkPropertiesInLocalStore(
                newShapeData.id,
                updateObj
            )
        }

        if (newShapeData?.isLineCircle === true) {
            let updateObj = {
                x1: parseInt(newShapeData.data.x1),
                x2: parseInt(newShapeData.data.x2),
                y1: parseInt(newShapeData.data.y1),
                y2: parseInt(newShapeData.data.y2),
                updatedBy: userId,
            }
            updateComponentBulkPropertiesInLocalStore(
                newShapeData.parentData.elementData.id,
                updateObj
            )
        }
    }

    const updateComponentVertices = (id, x, y) => {
        updateComponentVerticesInLocalStore(id, x, y)
        document.getElementById('show-click-anywhere-btn').style.opacity = 0
    }

    // if (componentsToRender.length === 0) {
    //     return <></>
    // }

    // console.log('componentsToRender', componentsToRender)
    return (
        <>
            {/* <div id="rsz-rect"></div> */}

            <div id="selector-rect"></div>
            <div id="pan-dragger"></div>

            <div id="main-two-root"></div>
            {/* {twoJSInstance && (
                <React.Fragment>{renderElements()}</React.Fragment>
            )} */}
            {componentsToRender.map((Component, index) => (
                <React.Fragment key={index}>
                    <Component />
                </React.Fragment>
            ))}
            <Zoomer sceneInstance={twoJSInstance} />
        </>
    )
}

export default Canvas
