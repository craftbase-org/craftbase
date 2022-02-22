import React, { useState } from 'react'
import PropTypes from 'prop-types'
import idx from 'idx'
import Two from 'two.js'
import interact from 'interactjs'
import {
    createSelectorHook,
    createDispatchHook,
    useDispatch,
    useSelector,
} from 'react-redux'
import { getFourthValue } from 'utils'
import handleDrag from 'components/utils/dragger'
import { setPeronsalInformation } from 'store/actions/main'

function Tooltip(props) {
    const [direction, setArrowDirection] = useState('bottom')

    const status = useSelector((state) => state.main.currentStatus)
    const lastAddedElement = useSelector((state) => state.main.lastAddedElement)
    const dispatch = useDispatch()
    console.log(
        'useSelector',
        useSelector((state) => state)
    )
    const two = props.twoJSInstance

    let tooltipMainRect = null
    let tooltipSecRect = null
    let tooltipText = null
    let initialTextChars = 7

    let arrowDirection = {
        bottom: { x: -25, y: 21 },
        left: { x: -43, y: 0 },
        top: { x: -25, y: -21 },
        right: { x: 43, y: 0 },
    }

    if (
        props.twoJSInstance &&
        (status === 'construct' || lastAddedElement.id === props.id)
    ) {
        // Calculate x and y through dividing width and height by 2 or vice versa
        // if x and y are given then multiply width and height into 2
        const offsetHeight = 0

        const prevX = localStorage.getItem('Tooltip_coordX')
        const prevY = localStorage.getItem('Tooltip_coordY')

        // Main container rectangle for tooltip
        const mainRect = two.makeRectangle(0, 0, 90, 45)
        mainRect.fill = '#505F79'
        mainRect.noStroke()
        tooltipMainRect = mainRect

        // The rectangle which will act as the arrow pointer for
        // tooltip

        let tooltipSize = {
            S: {},
            M: {},
            L: {},
        }

        arrowDirection = {
            bottom: {
                x: parseInt(-(tooltipMainRect.width / 4)),
                y: parseInt(tooltipMainRect.height / 2),
            },
            left: {
                x: parseInt(-(tooltipMainRect.width / 2)),
                y: 0,
            },
            top: {
                x: parseInt(-(tooltipMainRect.width / 4)),
                y: parseInt(-(tooltipMainRect.height / 2)),
            },
            right: {
                x: parseInt(tooltipMainRect.width / 2),
                y: 0,
            },
        }

        const secondaryRect = two.makeRectangle(
            arrowDirection[direction].x,
            arrowDirection[direction].y,
            14,
            14
        )

        secondaryRect.fill = '#505F79'
        secondaryRect.noStroke()
        secondaryRect.rotation = 0.8
        tooltipSecRect = secondaryRect

        const text = new Two.Text('Tooltip', 0, 0)
        text.size = '16'
        text.fill = '#fff'
        text.weight = '400'
        tooltipText = text

        const group = two.makeGroup(mainRect, secondaryRect, text)
        group.elementData = { ...props.itemData, ...props }
        // const calcX = parseInt(prevX) + (parseInt(rect.width / 2) - 10);
        // const calcY = parseInt(prevY) - (parseInt(46) - parseInt(rect.height / 2));
        // group.center();
        group.translation.x = parseInt(prevX) || 500
        group.translation.y = parseInt(prevY) || 200
        console.log('Tooltip', props.twoJSInstance)
        two.update()

        document
            .getElementById(group.id)
            .setAttribute('class', 'dragger-picker')
        document
            .getElementById(group.id)
            .setAttribute('data-label', 'Tooltip_coord')

        text._renderer.elem.addEventListener('dblclick', () => {
            let inputCharCounter = 0
            let initialScrollHeight = 0
            console.log('on click for texy', text.id, text.width)
            const input = document.createElement('textarea')
            //   input.rows = "text";
            input.value = text.value
            const twoTextInstance = document.getElementById(`${text.id}`)
            const getCoordOfContainer = tooltipMainRect.getBoundingClientRect()
            const getCoordOfText = twoTextInstance.getBoundingClientRect()

            const CoordXForInput =
                parseInt(getCoordOfContainer.left) +
                parseInt(getCoordOfContainer.width / 3)
            const CoordYForInput =
                parseInt(getCoordOfContainer.top) +
                parseInt(getCoordOfContainer.height / 6)

            console.log(
                'getCoordOfContainer',
                getCoordOfContainer,
                CoordXForInput,
                CoordYForInput
            )

            twoTextInstance.style.display = 'none'

            input.style.position = 'absolute'
            input.style.top = `${CoordYForInput}px`
            input.style.left = `${CoordXForInput}px`
            input.style.width = `${getCoordOfText.width}px`
            input.style.height = `${getCoordOfContainer.height}px`
            input.style.overflow = 'hidden'
            input.className = 'temp-input-area'
            initialScrollHeight = 40

            document.getElementById('main-two-root').append(input)
            input.focus()

            input.addEventListener('input', () => {
                inputCharCounter = inputCharCounter + 1
                if (inputCharCounter > 0) {
                    onTextInputChange(input, initialScrollHeight)
                    two.update()
                } else {
                    initialScrollHeight = input.scrollHeight
                }
            })

            input.addEventListener('blur', () => {
                console.log('on blur', input.value)
                twoTextInstance.style.display = 'block'
                input.remove()
                text.value = input.value
                two.update()
            })
        })
        // const { mousemove, mouseup } = handleDrag(two, group, 'Tooltip')
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
        //                 event.rect.left,
        //                 event.pageX,
        //                 event.clientX
        //             )
        //             // alternate -> take event.rect.left for x
        //             localStorage.setItem(
        //                 'Tooltip_coordX',
        //                 parseInt(event.pageX)
        //             )
        //             localStorage.setItem(
        //                 'Tooltip_coordY',
        //                 parseInt(event.pageY - offsetHeight)
        //             )
        //             dispatch(setPeronsalInformation('COMPLETE', { data: {} }))
        //         },
        //     },
        // })
    }

    function onTextInputChange(input, initialScrollHeight) {
        console.log(
            'initialScrollHeight',
            tooltipText,
            initialScrollHeight,
            input.scrollHeight
        )

        if (input.scrollHeight > initialScrollHeight) {
            tooltipMainRect.height = parseInt(tooltipMainRect.height) + 5
            input.style.height = `${
                tooltipMainRect.height - parseInt(tooltipMainRect.height / 8)
            }px`
            input.style.top = `${parseInt(input.style.top) - 2}px`

            tooltipText.height = tooltipMainRect.height
            tooltipText.width = tooltipMainRect.width
        }

        arrowDirection = {
            bottom: {
                x: parseInt(-(tooltipMainRect.width / 4)),
                y: parseInt(tooltipMainRect.height / 2),
            },
            left: {
                x: parseInt(-(tooltipMainRect.width / 2)),
                y: 0,
            },
            top: {
                x: parseInt(-(tooltipMainRect.width / 4)),
                y: parseInt(-(tooltipMainRect.height / 2)),
            },
            right: {
                x: parseInt(tooltipMainRect.width / 2),
                y: 0,
            },
        }

        tooltipSecRect.translation.x = arrowDirection[direction].x
        tooltipSecRect.translation.y = arrowDirection[direction].y
    }

    function onTooltipChange(pos) {
        setArrowDirection(pos)
        tooltipSecRect.translation.x = arrowDirection[pos].x
        tooltipSecRect.translation.y = arrowDirection[pos].y
        two.update()
    }

    return (
        <React.Fragment>
            <div id="two-Tooltip"></div>
            <button
                onClick={() => {
                    onTooltipChange('right')
                }}
            >
                Tooltip toggle arrow
            </button>
            {/* <button>change button in group</button> */}
        </React.Fragment>
    )
}

export default Tooltip
