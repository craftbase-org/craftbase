import React, { Component } from 'react'
import { connect } from 'react-redux'

import ComponentWrapper from 'components/elementWrapper'
import Toolbar from 'components/floatingToolbar'
import Two from 'two.js'
import Zui from 'two.js/extras/zui'
import panzoom from 'panzoom'

import { getElementsData } from 'store/actions/main'
import Zoomer from 'components/utils/zoomer'
import ZUI from 'two.js/extras/zui'

class CanvasContainer extends Component {
    constructor(props) {
        super(props)
        this.state = {
            twoJSInstance: null,
            PanZoomInstance: null,
            elements: [
                { id: 1, name: 'rect' },
                // { id: 2, name: "Circle" }
            ],
            selectorRectEventRemoveTrigger: false,
            lastAddedElement: {},
        }
    }

    componentDidMount() {
        // setting pan displacement values to initial
        localStorage.setItem('displacement_x', 0)
        localStorage.setItem('displacement_y', 0)

        console.log('CANVAS CDM', this.props.selectPanMode)
        const elem = document.getElementById('main-two-root')

        // Logic for capturing events in empty space in drawing area
        document
            .getElementById('main-two-root')
            .addEventListener(
                'mousedown',
                this.handleSelectorRectInitialization
            )

        document
            .getElementById('selector-rect')
            .addEventListener('drag', this.handleSelectorRectDrag)

        document
            .getElementById('selector-rect')
            .addEventListener('dragend', this.handleSelectorRectDragEnd)

        const two = new Two({
            fullscreen: true,
            // width: "auto",
        }).appendTo(elem)
        two.update()

        console.log('two', two.scene)
        let thisRef = this
        // two.scene.translation.x = -50
        addZUI()

        function addZUI() {
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

            function mousedown(e) {
                mouse.x = e.clientX
                mouse.y = e.clientY

                e.path.forEach((item, index) => {
                    if (
                        item?.classList?.value &&
                        item?.classList?.value.includes('dragger-picker') &&
                        item.tagName === 'g'
                    ) {
                        console.log('iterating through path', item.id)
                        console.log(
                            'two scene children',
                            two.scene.children,
                            two.scene.children.find(
                                (child) => child.id === item.id
                            )
                        )
                        shape = two.scene.children.find(
                            (child) => child.id === item.id
                        )
                    }
                })

                if (shape === null) {
                    shape = two.scene
                }

                let rect = document
                    .getElementById(shape.id)
                    .getBoundingClientRect()
                console.log('shape in mousedown', mouse, rect, shape.id)
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
                let dx = e.clientX - mouse.x
                let dy = e.clientY - mouse.y
                console.log(
                    'shape in mousemove',
                    e,
                    thisRef.props.selectPanMode
                )

                if (
                    document
                        .getElementById(shape.id)
                        .hasAttribute('data-resize') ||
                    !thisRef.props.selectPanMode
                ) {
                    console.log('has pan')
                    window.removeEventListener('mousemove', mousemove, false)
                    window.removeEventListener('mouseup', mouseup, false)
                } else {
                    console.log('inside mousemove', dragging)
                    if (dragging) {
                        shape.position.x += dx / zui.scale
                        shape.position.y += dy / zui.scale
                    } else {
                        zui.translateSurface(dx, dy)
                    }
                    mouse.set(e.clientX, e.clientY)
                    two.update()
                }
            }

            function mouseup(e) {
                console.log(
                    'e in ZUI mouse up',
                    e,
                    two.scene.translation,
                    zui.scale,
                    two.scene.scale,
                    shape.getBoundingClientRect(),
                    shape.getBoundingClientRect(true),
                    shape.translation
                )
                const getCoordLabel = document
                    .getElementById(shape.id)
                    .getAttribute('data-label')
                localStorage.setItem(
                    `${getCoordLabel + 'X'}`,
                    shape.translation.x
                )
                localStorage.setItem(
                    `${getCoordLabel + 'Y'}`,
                    shape.translation.y
                )
                window.removeEventListener('mousemove', mousemove, false)
                window.removeEventListener('mouseup', mouseup, false)
                two.update()
            }

            function mousewheel(e) {
                let dy = (e.wheelDeltaY || -e.deltaY) / 1000
                zui.zoomBy(dy, e.clientX, e.clientY)
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
        }

        const arr = [
            // { id: 1, name: 'buttonWithIcon' },
            { id: 3, name: 'tooltip' },
            {
                id: 4,
                name: 'circle',
                data: {
                    x: 272,
                    y: 707,
                    name: 'circle',
                },
            },
            // { id: 5, name: 'imageCard' },
            // {
            //     id: 6,
            //     name: 'rectangle',
            //     data: { x: 290, y: 430, name: 'rectangle' },
            // },
            { id: 2, name: 'toggle', data: {} },
            // { id: 7, name: 'divider' },
            // { id: 8, name: 'avatar' },
            // { id: 9, name: 'linkWithIcon' },
            // { id: 10, name: 'text', data: { fontSize: '16' } },
            // { id: 11, name: 'overlay' },
            // { id: 12, name: 'button' },
            // { id: 13, name: 'checkbox' },
            // { id: 14, name: 'radiobox' },
            // { id: 15, name: 'textinput' },
            // { id: 16, name: 'dropdown' },
            // { id: 17, name: 'textarea' },
            // {
            //     id: 18,
            //     name: 'groupobject',
            //     children: [
            //         { id: 8, name: 'avatar', x: -30, y: 2 },
            //         { id: 9, name: 'linkwithicon', x: 30, y: 2 },
            //     ],
            // },
        ]

        this.props.getElementsData('CONSTRUCT', arr)
        this.setState({ twoJSInstance: two })
    }

    componentDidUpdate(prevProps, prevState) {
        console.log('when this.props changes', this.props.selectPanMode)
        if (this.props.selectPanMode === false) {
            document
                .getElementById('main-two-root')
                .addEventListener(
                    'mousedown',
                    this.handleSelectorRectInitialization
                )

            document
                .getElementById('selector-rect')
                .addEventListener('drag', this.handleSelectorRectDrag)

            document
                .getElementById('selector-rect')
                .addEventListener('dragend', this.handleSelectorRectDragEnd)
        }
    }

    handleSelectorRectInitialization = (e) => {
        if (this.props.selectPanMode === false) {
            console.log('event mouse down main root', e, e.target.tagName)
            document.getElementById('main-two-root').focus()
            if (e.target.tagName == 'svg') {
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
            document
                .getElementById('main-two-root')
                .removeEventListener(
                    'mousedown',
                    this.handleSelectorRectInitialization
                )

            document
                .getElementById('selector-rect')
                .removeEventListener('drag', this.handleSelectorRectDrag)

            document
                .getElementById('selector-rect')
                .removeEventListener('dragend', this.handleSelectorRectDragEnd)
        }
    }

    handleSelectorRectDrag = (e) => {
        console.log('selector-rect being dragged', e, this.props.selectPanMode)
        const rect = document.getElementById('selector-rect')
        rect.style.zIndex = '1'
        rect.style.border = '1px dashed grey'
        rect.style.width = `${Math.abs(e.offsetX)}px`
        rect.style.height = `${Math.abs(e.offsetY)}px`
        console.log('rect getBoundingClientRect', rect.getBoundingClientRect())
    }

    handleSelectorRectDragEnd = (e) => {
        console.log('selector-rect drag end', e)
        const rect = document.getElementById('selector-rect')
        rect.style.zIndex = '-1'
        rect.style.width = `${Math.abs(e.offsetX)}px`
        rect.style.height = `${Math.abs(e.offsetY)}px`
        rect.setAttribute('draggable', false)
        rect.blur()
        console.log('rect getBoundingClientRect', rect.getBoundingClientRect())
        this.handleFinalDrag(rect.getBoundingClientRect())
    }

    handleFinalDrag = (e) => {
        console.log('final drag', e)
        this.props.getElementsData('AREA_SELECTION', e)
    }

    renderElements = () => {
        console.log(
            'At the time of rendering',
            this.state.twoJSInstance.scene.children
        )

        const elements = this.props.componentData
        const renderData = elements.map((item) => {
            const NewComponent = ComponentWrapper(item.name, {
                twoJSInstance: this.state.twoJSInstance,
                id: item.id,
                childrenArr: item.children,
                itemData: item,
                selectPanMode: this.props.selectPanMode,
            })
            return (
                <React.Fragment key={item.id}>
                    <NewComponent />
                </React.Fragment>
            )
        })

        return renderData
    }

    addElements = (elementName, id) => {
        const arr = [
            // { id: 1, name: "button" },
            // { id: 2, name: "toggle" },
            // { id: 1, name: "tooltip" },
            { id: 1, name: 'circle' },
        ]
        this.props.getElementsData('CONSTRUCT', arr)
    }

    render() {
        return (
            <React.Fragment>
                <div id="rsz-rect"></div>
                <div id="selector-rect"></div>
                <div id="pan-dragger"></div>

                <div id="main-two-root"></div>
                {this.state.twoJSInstance && (
                    <React.Fragment>{this.renderElements()}</React.Fragment>
                )}
                {/* <Toolbar /> */}
                {/* <div className="controls">
          <p>
            <button id="add" onClick={() => this.addElements("button", 2)}>
              Add a rectangle
            </button>

            <button
              id="add-1-2"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              // onClick={() => this.addElements("circle")}
            >
              Toggle me
            </button>
            <button
              onClick={() => {
                this.changeInPlan();
              }}
            >
              Delete
            </button>
            <button
              onClick={() => {
                this.getAllElementsData();
              }}
            >
              {" "}
              Get all elements data{" "}
            </button>
          </p>
        </div> */}
                <Zoomer sceneInstance={this.state.twoJSInstance} />
            </React.Fragment>
        )
    }
}

function mapStateToProps(state) {
    return {
        componentData: state.main.componentData,
    }
}
export default connect(mapStateToProps, {
    getElementsData,
})(CanvasContainer)
