import React, { useEffect, useState } from 'react'
import { useQuery, useMutation, useSubscription } from '@apollo/client'
import Two from 'two.js'
import { useHistory } from 'react-router-dom'

import Loadable from 'react-loadable'
import ZUI from 'two.js/extras/jsm/zui'

import {
    UPDATE_COMPONENT_INFO,
    DELETE_COMPONENT_BY_ID,
    INSERT_COMPONENT,
} from 'schema/mutations'
import Zoomer from 'components/utils/zoomer'
import { GROUP_COMPONENT } from 'constants/misc'
import Spinner from 'components/common/spinner'
import {
    GET_COMPONENT_INFO,
    GET_COMPONENTS_FOR_BOARD,
} from 'schema/subscriptions'
import Loader from 'components/utils/loader'

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

function addZUI(
    props,
    two,
    updateToGlobalState,
    customEventListener,
    setOnGroup
) {
    console.log('two.renderer.domElement', two.renderer.domElement)
    let shape = null
    let domElement = two.renderer.domElement
    let zui = new ZUI(two.scene, domElement)
    let mouse = new Two.Vector()
    let touches = {}
    let distance = 0
    let dragging = false

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
            console.log('shape.elementData', shape.elementData)
            if (shape.elementData?.id !== undefined) {
                // alert('Ctrl + c pressed')
                console.log('ctrl + c', shape)
                customEventListener('COPY', shape.elementData)
            }

            // domElement.removeEventListener('keydown', onKeyDown)
        }
    }

    function mousedown(e) {
        // initialize shape definition
        console.log(
            'e in ZUI mouse down',
            mouse.x,
            mouse.y,
            e.clientX,
            e.clientY
        )
        shape = null
        mouse.x = e.clientX
        mouse.y = e.clientY
        let avoidDragging = false
        let isGroupSelector = false

        var path = e.path || (e.composedPath && e.composedPath())
        // checks for path in event if it contains following element with condition
        path.forEach((item, index) => {
            console.log(
                'item?.classList?.value',
                item?.classList?.value,
                item?.classList?.value &&
                    item?.classList?.value.includes('dragger-picker') &&
                    !item?.classList?.value.includes('avoid-dragging') &&
                    item.tagName === 'g'
            )
            if (item?.classList?.value.includes('avoid-dragging')) {
                avoidDragging = true
            }
            if (
                item?.classList?.value &&
                item?.classList?.value.includes('dragger-picker') &&
                !item?.classList?.value.includes('avoid-dragging') &&
                item.tagName === 'g'
            ) {
                console.log('iterating through path', item.id)
                console.log(
                    'two scene children',
                    two.scene.children,
                    two.scene.children.find((child) => child.id === item.id)
                )
                shape = two.scene.children.find((child) => child.id === item.id)
            }
        })

        if (avoidDragging) {
            shape = null
        }

        // if shape is null, we initialize it with root element

        // inserting prevX and prevY to diff at updateToGlobalState function
        // checking if new x,y are not equal to prev x,y
        // then only perform the mutation

        console.log('props.selectPanMode', props.selectPanMode)
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

            // let dx = e.clientX - mouse.x
            // let dy = e.clientY - mouse.y
            // shape.position.x += dx / zui.scale
            // shape.position.y += dy / zui.scale

            const m = zui.clientToSurface(e.clientX, e.clientY)
            mouse.copy(m)
            newSelectorGroup.position.copy(mouse)
            // console.log(
            //     'mouse in selector group',
            //     mouse,
            //     mouse.getBoundingClientRect()
            // )
            two.update()
            shape = newSelectorGroup
            isGroupSelector = true
        }
        shape.elementData = {
            ...shape?.elementData,
            isGroupSelector: isGroupSelector,
            prevX: parseInt(shape.translation.x),
            prevY: parseInt(shape.translation.y),
        }

        console.log('on mouse down', e, shape)
        let rect = document.getElementById(shape.id).getBoundingClientRect()

        dragging =
            mouse.x > rect.left &&
            mouse.x < rect.right &&
            mouse.y > rect.top &&
            mouse.y < rect.bottom

        window.addEventListener('mousemove', mousemove, false)
        window.addEventListener('mouseup', mouseup, false)
        two.update()
    }

    function mousemove(e) {
        // console.log('mouse move event', shape.elementData.isGroupSelector)
        let dx = e.clientX - mouse.x
        let dy = e.clientY - mouse.y
        // console.log('shape in mousemove', e, shape, props.selectPanMode)

        if (document.getElementById(shape.id).hasAttribute('data-resize')) {
            console.log('element resize is being performed')
            window.removeEventListener('mousemove', mousemove, false)
            window.removeEventListener('mouseup', mouseup, false)
        } else {
            // console.log('inside mousemove', dragging)

            // check if while dragging, the shape does not point to root element (two-0)
            if (
                dragging &&
                shape.id !== 'two-0' &&
                !shape.elementData.isGroupSelector
            ) {
                shape.position.x += dx / zui.scale
                shape.position.y += dy / zui.scale
            } else if (shape.elementData.isGroupSelector) {
                console.log('shape.position', shape)
                let area = shape.children[0]
                let x = e.clientX
                let y = e.clientY

                // let x1 = area.vertices[0].x
                // let x2 = area.vertices[2].x
                // x2 += dx / zui.scale

                // let y1 = area.vertices[0].y
                // let y2 = area.vertices[3].y
                // y2 += dy / zui.scale

                // area.vertices = [
                //     new Two.Anchor(
                //         x1,
                //         y1,
                //         null,
                //         null,
                //         null,
                //         null,
                //         Two.Commands.line
                //     ),
                //     new Two.Anchor(
                //         x2,
                //         y1,
                //         null,
                //         null,
                //         null,
                //         null,
                //         Two.Commands.line
                //     ),

                //     new Two.Anchor(
                //         x2,
                //         y2,
                //         null,
                //         null,
                //         null,
                //         null,
                //         Two.Commands.line
                //     ),
                //     new Two.Anchor(
                //         x1,
                //         y2,
                //         null,
                //         null,
                //         null,
                //         null,
                //         Two.Commands.line
                //     ),
                // ]
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

    function mouseup(e) {
        console.log('e in ZUI mouse up')

        // old school logic here
        // const getCoordLabel = document
        //     .getElementById(shape.id)
        //     .getAttribute('data-label')
        // localStorage.setItem(`${getCoordLabel + 'X'}`, shape.translation.x)
        // localStorage.setItem(`${getCoordLabel + 'Y'}`, shape.translation.y)

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
            console.log('shape group obj', obj)
            two.remove(shape)
            setOnGroup(obj)
        } else if (!props.selectPanMode) {
            // else shape is not a group selector then update shape's properties
            if (
                shape.elementData.x == shape.translation.x &&
                shape.elementData.y == shape.translation.y
            ) {
                console.log('no need to update')
            } else {
                // updating already created two.js scene groups to new x,y set
                shape.elementData.x = shape.translation.x
                shape.elementData.y = shape.translation.y

                oldShapeData = { ...shape.elementData }

                newShapeData = Object.assign({}, shape.elementData, {
                    data: {
                        x: parseInt(shape.translation.x),
                        y: parseInt(shape.translation.y),
                    },
                })
                updateToGlobalState(newShapeData, oldShapeData)
            }
        }
        // let item = {
        //     elementId: shape.elementData.elementId,
        //     data: { x: shape.translation.x, y: shape.translation.y },
        // }
        console.log('shape.elementData.writable', newShapeData)

        window.removeEventListener('mousemove', mousemove, false)
        window.removeEventListener('mouseup', mouseup, false)
        two.update()
    }

    function mousewheel(e) {
        if (e.ctrlKey === true || e.metaKey === true) {
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

    return zui
}

const ElementRenderWrapper = (ElementToRender, data, twoJSInstance) => {
    const RenderElement = () => {
        const [twoJSShape, setTwoJSShape] = useState(null)
        const [componentData, setComponentData] = useState(null)
        const {
            loading: getComponentInfoLoading,
            data: getComponentInfoData,
            error: getComponentInfoError,
        } = useSubscription(GET_COMPONENT_INFO, { variables: { id: data.id } })
        // console.log('in render Element', data, getComponentInfoData?.component)
        const [
            deleteComponent,
            {
                loading: deleteComponentLoading,
                data: deleteComponentData,
                error: deleteComponentError,
            },
        ] = useMutation(DELETE_COMPONENT_BY_ID)

        useEffect(() => {
            if (
                getComponentInfoData?.component != null &&
                componentData === null
            ) {
                if (data.itemData.isDummy) {
                    /** PATCH */
                    //Patch for considering components who are just released from group
                    // that means we render them initially without their server data
                    // and when server data becomes available we ignore this patch
                    if (
                        parseInt(getComponentInfoData.component.x) !==
                        parseInt(data.itemData.x)
                    ) {
                        console.log('is dummy data', data.itemData)
                        setComponentData(data.itemData)
                    } else if (
                        parseInt(getComponentInfoData.component.x) ===
                        parseInt(data.itemData.x)
                    ) {
                        setComponentData(getComponentInfoData.component)
                    }
                    /** PATCH */
                } else {
                    setComponentData(getComponentInfoData?.component)
                }
            } else if (
                getComponentInfoData?.component != null &&
                componentData !== null
            ) {
                const boardId = data.boardId
                const userId = localStorage.getItem('userId')
                const tabsOpen = parseInt(
                    localStorage.getItem(`tabs_open_${boardId}`)
                )

                if (getComponentInfoData?.component.updatedBy != userId) {
                    // console.log('update element wrapper on updatedBy change')
                    setComponentData(getComponentInfoData?.component)
                } else if (
                    getComponentInfoData?.component.updatedBy == userId &&
                    tabsOpen > 1
                ) {
                    // console.log('update element wrapper on tabs open')
                    setComponentData(getComponentInfoData?.component)
                } else {
                    // console.log('update element wrapper on nothing')
                }

                // if (getComponentInfoData?.component.updatedBy != userId) {
                //     setComponentData(getComponentInfoData?.component)
                // }
            }
        }, [getComponentInfoData])

        if (getComponentInfoLoading) {
            return <></>
        }

        if (getComponentInfoError) {
            return <></>
        }

        const handleDeleteComponent = (twoJSShape) => {
            deleteComponent({
                variables: { id: data.id },
                errorPolicy: process.env.REACT_APP_GRAPHQL_ERROR_POLICY,
            })
        }

        // console.log('getComponentInfoData data change', getComponentInfoData)
        return data.twoJSInstance ? (
            getComponentInfoData?.component ? (
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

const GroupRenderWrapper = (ElementToRender, data, cb) => {
    const RenderGroup = () => {
        console.log('in render group wrapper', data)

        return data.twoJSInstance ? (
            <ElementToRender
                {...data}
                unGroup={(twoGroupInstance) => {
                    cb && cb(twoGroupInstance)
                }}
            />
        ) : (
            <Spinner />
        )
    }
    return RenderGroup
}

const Canvas = (props) => {
    // use this data for calculating coordinate graph for grouping
    const {
        loading: getComponentsForBoardLoading,
        data: getComponentsForBoardData,
        error: getComponentsForBoardError,
    } = useSubscription(GET_COMPONENTS_FOR_BOARD, {
        variables: { boardId: props.boardId },
    })
    const [
        insertComponent,
        {
            loading: insertComponentLoading,
            data: insertComponentSuccess,
            error: insertComponentError,
        },
    ] = useMutation(INSERT_COMPONENT)

    // console.log('getComponentsForBoardData', getComponentsForBoardData)

    const [twoJSInstance, setTwoJSInstance] = useState(null)
    const [zuiInstance, setZuiInstance] = useState(null)
    const [currentComponents, setCurrentComponents] = useState([])
    const [prevElements, setPrevElements] = useState([])
    const [onGroup, setOnGroup] = useState(null)
    const [componentsToRender, setComponentsToRender] = useState([])
    const [cloneElement, setCloneElement] = useState(null)
    const [updateComponentInfo] = useMutation(UPDATE_COMPONENT_INFO, {
        ignoreResults: true,
    })

    useEffect(() => {
        // setting pan displacement values to initial
        // localStorage.setItem('displacement_x', 0)
        // localStorage.setItem('displacement_y', 0)

        console.log('CANVAS CDM', props.selectPanMode)
        const elem = document.getElementById('main-two-root')

        const two = new Two({
            fullscreen: true,
            // width: "auto",
        }).appendTo(elem)

        two.update()

        console.log('two', two.scene)

        // two.scene.translation.x = -50
        let zuiInstance = addZUI(
            props,
            two,
            updateToGlobalState,
            customEventListener,
            setOnGroup
        )

        // this.props.getElementsData('CONSTRUCT', arr)
        setZuiInstance(zuiInstance)
        setTwoJSInstance(two)

        const boardId = props.boardId
        const tabsOpen = localStorage.getItem(`tabs_open_${boardId}`)
        console.log(`tabs_open_${boardId}`, tabsOpen)
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

    // once two.js instance is stored in state, attach event listeners
    useEffect(() => {
        // Logic for capturing events in empty space in drawing area
        if (twoJSInstance !== null && zuiInstance !== null) {
            // document
            //     .getElementById('main-two-root')
            //     .addEventListener('mousedown', handleSelectorRectInitialization)
            // document
            //     .getElementById('selector-rect')
            //     .addEventListener('drag', handleSelectorRectDrag)
            // document
            //     .getElementById('selector-rect')
            //     .addEventListener('dragend', handleSelectorRectDragEnd)
        }
    }, [twoJSInstance])

    useEffect(() => {
        console.log(
            'on change props.componentData',
            props.componentData,
            prevElements,
            twoJSInstance
        )

        if (props.componentData?.length > 0 && twoJSInstance) {
            setCurrentComponents(props.componentData)
        }

        // setComponentsToRender()
    }, [props.componentData, twoJSInstance])

    useEffect(() => {
        console.log('on change currentComponents', currentComponents)
        let arr = []
        let components = [...componentsToRender]
        if (currentComponents && twoJSInstance) {
            currentComponents.forEach((item, index) => {
                if (prevElements.includes(item.id)) {
                    // nothing
                } else {
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
                        selectPanMode: props.selectPanMode,
                    }

                    // Different render wrapper for components and group
                    let component = null
                    if (item.componentType === GROUP_COMPONENT) {
                        component = GroupRenderWrapper(
                            ElementToRender,
                            {
                                ...item,
                                ...data,
                            },
                            (twoGroupInstance) => {
                                console.log('on group wrapper callback')
                                handleUngroupComponents(
                                    item.id,
                                    twoGroupInstance
                                )
                            }
                        )
                    } else {
                        component = ElementRenderWrapper(
                            ElementToRender,
                            data,
                            twoJSInstance
                        )
                    }
                    components.push(component)
                }

                arr.push(item.id)
            })
            setComponentsToRender(components)
            twoJSInstance && setPrevElements(arr)
        }

        // setComponentsToRender()
    }, [currentComponents])

    // on group select use effect hook
    useEffect(() => {
        let componentsArr = [...currentComponents]
        if (onGroup) {
            console.log('on group useeffect', onGroup)
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
            const allComponentCoords =
                getComponentsForBoardData?.components || []
            // console.log(
            //     'area_selection allComponentCoords',
            //     xMid,
            //     yMid,
            //     state.getCoordGraph
            // )

            allComponentCoords.forEach((item, index) => {
                console.log('item', item)
                console.log('area_selection item', item)
                if (
                    item.x > x1Coord &&
                    item.x < x2Coord &&
                    item.y > y1Coord &&
                    item.y < y2Coord
                ) {
                    console.log(
                        'area_selection a match',
                        twoJSInstance.scene.children
                    )

                    let findTwoShapeIndex =
                        twoJSInstance.scene.children.findIndex(
                            (child) => child?.elementData?.id === item.id
                        )

                    console.log('findTwoShapeIndex', findTwoShapeIndex)
                    if (findTwoShapeIndex !== -1) {
                        let shape =
                            twoJSInstance.scene.children[findTwoShapeIndex]
                        twoJSInstance.remove([shape])
                    }

                    selectedComponentArr.push(item.id)

                    let relativeX = item.x - xMid
                    let relativeY = item.y - yMid

                    let obj = {
                        ...item,
                        id: item.id,
                        componentType: item.componentType,
                        x: relativeX,
                        relativeX: relativeX,
                        y: relativeY,
                        relativeY: relativeY,
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

            console.log('newGroup', newGroup)

            // filter out those selected children (which are now grouped into one) from main current components array
            // that means we dont render those components as seperate rather they
            // are now children of this new group
            let newComponents = componentsArr.filter((item, index) => {
                if (selectedComponentArr.includes(item.id)) {
                    return false
                } else {
                    return true
                }
            })

            setCurrentComponents([...newComponents, newGroup])
        }
    }, [onGroup])

    useEffect(() => {
        window.addEventListener('keydown', onPasteEvent)
        return () => {
            window.removeEventListener('keydown', onPasteEvent)
        }
    }, [cloneElement])

    const onPasteEvent = (evt) => {
        if (evt.key === 'v' && (evt.ctrlKey || evt.metaKey)) {
            if (
                cloneElement?.id !== undefined &&
                cloneElement.componentType !== 'groupobject'
            ) {
                console.log('ctrl + v', cloneElement)
                let newComponent = getComponentSchema(
                    cloneElement,
                    props.boardId
                )

                insertComponent({ variables: { object: newComponent } })
                setCloneElement(null)
                // alert(`Ctrl+V was pressed ${cloneElement.prevX}`)
            }
        }
    }

    const handleUngroupComponents = (groupId, twoGroupInstance) => {
        const userId = localStorage.getItem('userId')
        let componentsArr = [...currentComponents]
        let groupData = null

        componentsArr.forEach((item) => {
            if (item.id === groupId) {
                groupData = item
            }
        })

        // console.log('groupData', groupData)
        console.log(
            'componentsArr before child insert',
            componentsArr,
            twoGroupInstance
        )
        if (groupData.children?.length > 0) {
            groupData.children.forEach((child) => {
                console.log('iterating children while ungrouping', child)
                // for ungrouping initially supply isDummy to true
                child.isDummy = true
                child.x =
                    parseInt(twoGroupInstance.translation.x) + parseInt(child.x)
                child.y =
                    parseInt(twoGroupInstance.translation.y) + parseInt(child.y)

                componentsArr.push(child)
                updateComponentInfo({
                    variables: {
                        id: child.id,
                        updateObj: {
                            x: child.x,
                            y: child.y,
                            updatedBy: userId,
                        },
                    },
                })
            })
        }
        console.log('componentsArr after child insert', componentsArr)
        let finalComponentsArr = componentsArr.filter(
            (item) => item.id !== groupId
        )
        console.log(
            'final components Arr',
            finalComponentsArr,
            twoGroupInstance,
            twoGroupInstance.children
        )

        // REMOVE CHILDREN HERE

        // removal of group from two.js scene graph
        setTimeout(() => {
            twoGroupInstance.remove([twoGroupInstance.children])

            twoJSInstance.remove([twoGroupInstance])
            twoJSInstance.update()
        }, 1000)

        setCurrentComponents(finalComponentsArr)
    }

    const customEventListener = (action, shapeData) => {
        if (action === 'COPY') {
            setCloneElement(shapeData)
        }
    }

    const updateToGlobalState = (newShapeData, oldShapeData) => {
        const userId = localStorage.getItem('userId')
        console.log('updateToGlobalState', newShapeData, oldShapeData)

        // also check that new x,y is updated or not by comparing to prev x,y
        // then only perform mutation
        if (
            newShapeData.id &&
            (newShapeData.data.x != newShapeData.prevX ||
                newShapeData.data.y != newShapeData.prevY)
        ) {
            updateComponentInfo({
                variables: {
                    id: newShapeData.id,
                    updateObj: {
                        x: parseInt(newShapeData.data.x),
                        y: parseInt(newShapeData.data.y),
                        updatedBy: userId,
                    },
                },
            })
        }

        // props.getElementsData('UPDATE_ELEMENT_DATA', newItem)
    }

    const handleSelectorRectInitialization = (e) => {
        if (props.selectPanMode === false) {
            console.log('event mouse down main root', e, e.target.tagName)
            document.getElementById('main-two-root').focus()
            if (e.target.tagName == 'svg') {
                // construct empty rectangle for selector
                const rect = document.getElementById('selector-rect')
                rect.style.position = 'absolute'
                rect.style.zIndex = '1'
                rect.style.width = '20px'
                rect.style.height = '20px'
                rect.style.border = '0px dashed grey'
                rect.style.transform = `translateX(${e.x - 10}px) translateY(${
                    e.y - 10
                }px) `
                document.getElementById('main-two-root').blur()
                rect.setAttribute('draggable', true)
            }
        } else {
            // document
            //     .getElementById('main-two-root')
            //     .removeEventListener(
            //         'mousedown',
            //         handleSelectorRectInitialization
            //     )
            // document
            //     .getElementById('selector-rect')
            //     .removeEventListener('drag', handleSelectorRectDrag)
            // document
            //     .getElementById('selector-rect')
            //     .removeEventListener('dragend', handleSelectorRectDragEnd)
        }
    }

    const handleSelectorRectDrag = (e) => {
        console.log('selector-rect being dragged', e)

        // let default zoom be zero
        if (zuiInstance.zoom !== 0 || zuiInstance.zoom !== 1) {
            // zuiInstance.zoomSet(1, e.clientX, e.clientY)
            // twoJSInstance.update()
        }

        const rect = document.getElementById('selector-rect')
        rect.style.zIndex = '1'
        rect.style.border = '1px dashed grey'
        rect.style.width = `${Math.abs(e.offsetX)}px`
        rect.style.height = `${Math.abs(e.offsetY)}px`
        // console.log('rect getBoundingClientRect', rect.getBoundingClientRect())
    }

    const handleSelectorRectDragEnd = (e) => {
        console.log('selector-rect drag end', e)
        e.stopPropagation()
        e.stopImmediatePropagation()
        e.preventDefault()
        const rect = document.getElementById('selector-rect')
        rect.style.zIndex = '-1'
        rect.style.width = `${Math.abs(e.offsetX)}px`
        rect.style.height = `${Math.abs(e.offsetY)}px`
        rect.setAttribute('draggable', false)
        rect.blur()
        console.log('rect getBoundingClientRect', rect.getBoundingClientRect())
        handleFinalDrag(rect.getBoundingClientRect())
    }

    const handleFinalDrag = (e) => {
        console.log('final drag', e, getComponentsForBoardData)
        setOnGroup(e)
        // props.getElementsData('AREA_SELECTION', e)
    }

    // console.log('componentsToRender', componentsToRender)
    return (
        <>
            <div id="rsz-rect"></div>
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
