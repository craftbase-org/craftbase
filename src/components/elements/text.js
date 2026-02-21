import React, { useEffect, useState, useRef } from 'react'
import PropTypes from 'prop-types'
import interact from 'interactjs'
import { useImmer } from 'use-immer'
import { useBoardContext } from 'views/Board/board'

import { elementOnBlurHandler } from 'utils/misc'
import getEditComponents from 'components/utils/editWrapper'
import handleDrag from 'components/utils/dragger'
import Toolbar from 'components/floatingToolbar'
import { setPeronsalInformation } from 'store/actions/main'
import ElementFactory from 'factory/text'

// Scale factors follow a doubling pattern per step: S=1x, M=2x, L=4x, XL=8x
// Ratio between any two sizes = newScale / currentScale
const TEXT_SIZE_SCALES = { S: 1, M: 2, L: 4, XL: 8 }
const TEXT_SIZE_VALUES = { S: 12, M: 16, L: 24, XL: 36 }

function Text(props) {
    const {
        addToLocalComponentStore,
        updateComponentBulkPropertiesInLocalStore,
        isPencilMode,
        isArrowDrawMode,
        isTextDrawMode,
        isArrowSelected,
    } = useBoardContext()

    const [showToolbar, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer({ textFontSize: 16 })
    const [textValue, setTextValue] = useState(props?.metadata?.content || '')
    const textValueRef = useRef(textValue)

    const two = props.twoJSInstance
    let selectorInstance = null
    let groupObject = null

    // Refs to Two.js objects needed by the text-size change handler
    const rectangleRef = useRef(null)
    const rectTextGroupRef = useRef(null)
    const svgElemRef = useRef(null)
    const currentTextSizeLabelRef = useRef(null)

    function onBlurHandler(e) {
        elementOnBlurHandler(e, selectorInstance, two)
        document.getElementById(`${groupObject.id}`) &&
            document
                .getElementById(`${groupObject.id}`)
                .removeEventListener('keydown', handleKeyDown)
    }

    function handleKeyDown(e) {
        if (e.keyCode === 8 || e.keyCode === 46) {
            console.log('handle key down event', e)
            // DELETE/BACKSPACE KEY WAS PRESSED
            props.handleDeleteComponent &&
                props.handleDeleteComponent(groupObject)
            two.remove([groupObject])
            two.update()
        }
    }

    function onFocusHandler(e) {
        document.getElementById(`${groupObject.id}`).style.outline = 0
        document
            .getElementById(`${groupObject.id}`)
            .addEventListener('keydown', handleKeyDown)
    }

    const handleTextSizeChange = (newLabel) => {
        const rectangle = rectangleRef.current
        const rectTextGroup = rectTextGroupRef.current
        const svgElem = svgElemRef.current
        if (!rectangle || !rectTextGroup || !svgElem) return

        const currentLabel = currentTextSizeLabelRef.current || 'M'
        const ratio =
            TEXT_SIZE_SCALES[newLabel] / TEXT_SIZE_SCALES[currentLabel]

        const newWidth = Math.round(rectangle.width * ratio)
        const newHeight = Math.round(rectangle.height * ratio)

        rectangle.width = newWidth
        rectangle.height = newHeight
        rectTextGroup.width = newWidth
        rectTextGroup.height = newHeight

        // Preserve existing content and font-size before rewriting innerHTML
        const existingContainer = svgElem.querySelector(
            `.foreign-text-container-${props.id}`
        )
        const currentContent = existingContainer?.innerHTML || ''
        const currentFontSize = existingContainer?.style?.fontSize || '16px'

        const bRect = rectTextGroup.getBoundingClientRect(true)
        svgElem.innerHTML = `
<foreignObject x=${bRect.left} y=${bRect.top} width=${newWidth} height=${newHeight}>
    <div class="foreign-text-container-base foreign-text-container-${props.id}" style="font-size:${currentFontSize}">${currentContent}</div>
</foreignObject>
`
        two.update()

        updateComponentBulkPropertiesInLocalStore(props.id, {
            width: newWidth,
            height: newHeight,
            metadata: {
                ...props.metadata,
                content: textValueRef.current,
                fontSize: TEXT_SIZE_VALUES[newLabel],
            },
        })

        currentTextSizeLabelRef.current = newLabel
    }

    // Using unmount phase to remove event listeners
    useEffect(() => {
        let textFontSize = props?.metadata?.fontSize || 16
        let itemData = props?.itemData
        let handleGlobalMousedown = null
        // Calculate x and y through dividing width and height by 2 or vice versa
        // if x and y are given then multiply width and height into 2
        const offsetHeight = 0
        const prevX = props.x
        const prevY = props.y

        // Instantiate factory
        const elementFactory = new ElementFactory(two, prevX, prevY, props)
        // Get all instances of every sub child element
        const { group, rectTextGroup, rectangle } =
            elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }
        rectTextGroup.opacity = props.metadata?.opacity ?? 1
        // the custom foreign object hook
        const svgElem = rectTextGroup._renderer.elem

        // Populate refs so handleTextSizeChange can access Two.js objects
        rectangleRef.current = rectangle
        rectTextGroupRef.current = rectTextGroup
        svgElemRef.current = svgElem
        // Derive current size label from saved fontSize (fallback to 'M')
        const savedFontSize = props?.metadata?.fontSize || 16
        currentTextSizeLabelRef.current =
            Object.entries(TEXT_SIZE_VALUES).find(
                ([, v]) => v === savedFontSize
            )?.[0] || 'M'

        // Apply saved font size from DB (persists across page reloads)
        if (props?.metadata?.fontSize) {
            const textContainers = document.getElementsByClassName(
                `foreign-text-container-${props.id}`
            )
            if (textContainers.length > 0) {
                textContainers[0].style.fontSize = `${props.metadata.fontSize}px`
            }
        }

        // Function to show text input
        const showTextInput = () => {
            const twoTextInstance = document.getElementById(`${group.id}`)
            if (!twoTextInstance) return

            // Use svgElem (the rectTextGroup's DOM element) rather than the outer group
            // so the selector's extended bounds don't push the textarea upward
            const getCoordOfBtnText = svgElem.getBoundingClientRect()
            twoTextInstance.style.display = 'none'

            const input = document.createElement('textarea')
            const topBuffer = 0
            const randomNumber = Math.floor(Math.random() * 90 + 10)
            input.id = `two-temp-input-area-${randomNumber}`
            input.value = props?.itemData?.text || textValueRef.current || ''
            input.style.border = 'none'
            input.style.background = 'transparent'
            input.style.padding = '6px'
            input.style.color = props?.itemData?.color || '#000'
            input.style.fontSize = `${props.metadata?.fontSize || textFontSize}px`
            input.style.position = 'absolute'
            input.style.top = `${getCoordOfBtnText.top - topBuffer}px`
            input.style.left = `${getCoordOfBtnText.left}px`
            input.style.outline = 'none'
            input.className = 'temp-input-area'

            document.getElementById('main-two-root').append(input)

            input.onfocus = function (e) {
                const currentLabel = currentTextSizeLabelRef.current || 'M'
                const newWidth = Math.round(rectangle.width)
                const newHeight = Math.round(rectangle.height)
                selectorInstance.update(0, newWidth, 0, newHeight)
                selectorInstance.show()
                two.update()
            }

            input.focus()

            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    input.rows = input.rows + 1
                }
                if (event.key === ' ') {
                    console.log('space key pressed!')
                    input.style.width = input.style.width + 5
                    rectangle.width = rectangle.width + 5
                    two.update()
                }
            })

            input.addEventListener('blur', () => {
                console.log(
                    'at blur text',
                    input.value,
                    input.rows,
                    input.scrollHeight,
                    document.getElementById(input.id).getBoundingClientRect()
                )

                twoTextInstance.style.display = 'block'
                setTextValue(input.value)
                textValueRef.current = input.value

                // Preserve any font-size set by the toolbar during this session
                const existingContainer = svgElem.querySelector(
                    `.foreign-text-container-${props.id}`
                )
                const preservedFontSize =
                    existingContainer?.style?.fontSize || `${textFontSize}px`

                const currentLabel = currentTextSizeLabelRef.current || 'M'
                const newWidth = Math.round(rectangle.width)
                const newHeight = Math.round(rectangle.height)
                selectorInstance.update(0, newWidth, 0, newHeight)
                selectorInstance.hide()

                rectTextGroup.height =
                    input.scrollHeight < 60
                        ? input.scrollHeight
                        : input.scrollHeight - 20
                rectangle.height =
                    input.scrollHeight < 60
                        ? input.scrollHeight
                        : input.scrollHeight - 20
                two.update()

                svgElem.innerHTML = `
          <foreignObject x=${
              rectTextGroup.getBoundingClientRect(true).left
          } y=${rectTextGroup.getBoundingClientRect(true).top} width=${
              rectangle.width
          } height=${rectangle.height}>
              <div class="foreign-text-container-base foreign-text-container-${
                  props.id
              }" style="font-size:${preservedFontSize}">${textValueRef.current}</div>
          </foreignObject>
          `
                two.update()

                let updateObj = {
                    width: rectangle.width,
                    height: rectangle.height,
                    metadata: {
                        ...props.metadata,
                        content: textValueRef.current,
                    },
                }
                updateComponentBulkPropertiesInLocalStore(props.id, updateObj)
                input.remove()
            })
        }

        // Listen for trigger text input event from canvas
        const handleTriggerTextInput = (e) => {
            if (e.detail.elementId === props.id) {
                // Show the text element's own toolbar (not the board's generic one)
                toggleToolbar(true)
                setTimeout(() => showTextInput(), 100)
            }
        }
        window.addEventListener('triggerTextInput', handleTriggerTextInput)

        if (props.parentGroup) {
            /** This element will be rendered and scoped in its parent group */
            const parentGroup = props.parentGroup
            parentGroup.add(rectTextGroup)
            two.update()
        } else {
            /** This element will render by creating it's own group wrapper */
            groupObject = group

            const { selector } = getEditComponents(two, group, 4)
            selectorInstance = selector

            group.children.unshift(rectTextGroup)
            two.update()

            document
                .getElementById(group.id)
                .setAttribute('class', 'dragger-picker')

            // setting database's id in html attribute of element
            document
                .getElementById(group.id)
                .setAttribute('data-component-id', props.id)

            setInternalState((draft) => {
                draft.element = {
                    [rectTextGroup.id]: rectTextGroup,
                    [group.id]: group,
                    [rectangle.id]: rectangle,
                    // [selector.id]: selector,
                }
                draft.group = {
                    id: group.id,
                    data: group,
                }
                draft.shape = {
                    id: rectangle.id,
                    data: rectangle,
                }
                // draft.text = {
                //   id: text.id,
                //   data: text,
                // };
                draft.icon = {
                    data: {},
                }
            })

            const getGroupElementFromDOM = document.getElementById(
                `${group.id}`
            )
            getGroupElementFromDOM.addEventListener('focus', onFocusHandler)
            getGroupElementFromDOM.addEventListener('blur', onBlurHandler)

            // const { mousemove, mouseup } = handleDrag(two, group, 'text')

            interact(`#${group.id}`).on('click', () => {
                console.log(
                    'group id rectText id rect id',
                    group.id,
                    rectTextGroup.id,
                    rectangle.id,
                    rectTextGroup.getBoundingClientRect(true)
                )
                selector.update(
                    rectTextGroup.getBoundingClientRect(true).left - 4,
                    rectTextGroup.getBoundingClientRect(true).right + 4,
                    rectTextGroup.getBoundingClientRect(true).top - 4,
                    rectTextGroup.getBoundingClientRect(true).bottom + 4
                )
                two.update()
                toggleToolbar(true)
            })

            handleGlobalMousedown = (e) => {
                const path = e.composedPath ? e.composedPath() : e.path || []
                const isOnGroup = path.some((el) => el.id === group.id)
                const isOnToolbar = path.some(
                    (el) => el.id === 'floating-toolbar'
                )
                if (!isOnGroup && !isOnToolbar) {
                    toggleToolbar(false)
                }
            }
            window.addEventListener('mousedown', handleGlobalMousedown)

            // Captures double click event for text
            // and generates temporary textarea support for it
            rectTextGroup._renderer.elem.addEventListener('dblclick', () => {
                showTextInput()
            })
        }

        return () => {
            // console.log('UNMOUNTING in text', group)
            // clean garbage by removing instance
            // two.remove(group)
            window.removeEventListener(
                'triggerTextInput',
                handleTriggerTextInput
            )
            if (handleGlobalMousedown) {
                window.removeEventListener('mousedown', handleGlobalMousedown)
            }
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
            if (props.width !== shapeInstance.width) {
                shapeInstance.width = props.width
            }

            if (props.height !== shapeInstance.height) {
                shapeInstance.height = props.height
            }
        }
    }, [
        props.x,
        props.y,
        props.width,
        props.height,
        props.metadata,
        props.textColor,
    ])

    // When pencil mode, arrow mode, or text mode is active, disable pointer events on this component
    useEffect(() => {
        const groupId = internalState?.group?.id
        if (groupId && document.getElementById(groupId)) {
            document.getElementById(groupId).style.pointerEvents =
                isPencilMode ||
                isArrowDrawMode ||
                isTextDrawMode ||
                isArrowSelected
                    ? 'none'
                    : 'auto'
        }
    }, [
        isPencilMode,
        isArrowDrawMode,
        isTextDrawMode,
        isArrowSelected,
        internalState?.group?.id,
    ])

    function closeToolbar() {
        toggleToolbar(false)
    }

    return (
        <React.Fragment>
            <div id="two-text"></div>
            {showToolbar ? (
                <Toolbar
                    hideColorIcon={true}
                    hideColorBackground={true}
                    hideBorderSection={true}
                    showTextSizeSection={true}
                    currentFontSize={props?.metadata?.fontSize || 16}
                    onTextSizeChange={handleTextSizeChange}
                    toggle={showToolbar}
                    componentState={internalState}
                    closeToolbar={closeToolbar}
                    componentId={props.id}
                    enableClassNameStyling={true}
                    classNameLabel={`foreign-text-container-${props.id}`}
                    updateComponent={() => {
                        two.update()
                    }}
                />
            ) : null}
        </React.Fragment>
    )
}

// Text.propTypes = {
//   x: PropTypes.string,
//   y: PropTypes.string,
// };

// Text.defaultProps = {
//   x: 100,
//   y: 50,
// };

export default Text
