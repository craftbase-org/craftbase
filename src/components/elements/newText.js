import React, { useEffect, useState, useRef } from 'react'
import interact from 'interactjs'
import { useImmer } from 'use-immer'
import { useBoardContext } from 'views/Board/board'

import { elementOnBlurHandler } from 'utils/misc'
import getEditComponents from 'components/utils/editWrapper'
import NewTextFactory from 'factory/newText'
import Toolbar from 'components/floatingToolbar'
import { TEXT_SIZES_OBJECT } from 'utils/constants'

function NewText(props) {
    const {
        updateComponentBulkPropertiesInLocalStore,
        isPencilMode,
        isArrowDrawMode,
        isTextDrawMode,
        isArrowSelected,
    } = useBoardContext()

    const [showToolbar, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer({})
    const [textValue, setTextValue] = useState(
        props?.metadata?.content || 'Text'
    )
    const [textSize, setTextSize] = useState(props?.metadata?.fontSize || 16)
    const textValueRef = useRef(textValue)
    const twoTextRef = useRef(null)

    const two = props.twoJSInstance

    // Component-level mutable refs matching the pattern used in other elements
    let selectorInstance = null
    let groupObject = null

    function onBlurHandler(e) {
        elementOnBlurHandler(e, selectorInstance, two)
        document.getElementById(`${groupObject.id}`) &&
            document
                .getElementById(`${groupObject.id}`)
                .removeEventListener('keydown', handleKeyDown)
    }

    function handleKeyDown(e) {
        if (e.keyCode === 8 || e.keyCode === 46) {
            props.handleDeleteComponent &&
                props.handleDeleteComponent(groupObject)
            two.remove([groupObject])
            two.update()
        }
    }

    function onFocusHandler() {
        document.getElementById(`${groupObject.id}`).style.outline = 0
        document
            .getElementById(`${groupObject.id}`)
            .addEventListener('keydown', handleKeyDown)
    }

    function closeToolbar() {
        toggleToolbar(false)
    }

    const handleTextSizeChange = (newLabel) => {
        const textSize = TEXT_SIZES_OBJECT[newLabel]
        const twoText = twoTextRef.current
        twoText.size = textSize

        updateComponentBulkPropertiesInLocalStore(props.id, {
            metadata: {
                ...props.metadata,
                fontSize: textSize,
                content: twoText.value,
            },
        })
        two.update()
    }

    useEffect(() => {
        const prevX = props.x
        const prevY = props.y
        let handleGlobalMousedown = null

        // Build Two.js objects via factory
        const elementFactory = new NewTextFactory(two, prevX, prevY, props)
        const { group, twoText } = elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }
        twoText.opacity = props.metadata?.opacity ?? 1

        twoTextRef.current = twoText
        groupObject = group

        // Selector sits inside the group; twoText is already at children[0]
        const { selector } = getEditComponents(two, group, 4)
        selectorInstance = selector
        two.update()

        // ── Resize via corner handles (proportional font-size scaling) ──
        // Adapted from text_resize.html: distance-based proportional resize
        const cornerCircles = [
            selectorInstance.circle1,
            selectorInstance.circle2,
            selectorInstance.circle3,
            selectorInstance.circle4,
        ].filter(Boolean)

        const resizeCursors = [
            'nwse-resize', // circle1 = TL
            'nesw-resize', // circle2 = TR
            'nwse-resize', // circle3 = BR
            'nesw-resize', // circle4 = BL
        ]

        let resizeState = null

        const onResizeMouseMove = (e) => {
            if (!resizeState) return
            const { centerX, centerY, startDist, startSize } = resizeState
            const currentDist = Math.sqrt(
                (e.clientX - centerX) ** 2 + (e.clientY - centerY) ** 2
            )
            const scale = currentDist / Math.max(startDist, 1)
            const newSize = Math.round(
                Math.min(Math.max(startSize * scale, 8), 300)
            )

            twoText.size = newSize
            twoText.leading = newSize
            two.update()

            // Update selector bounds to match new text size
            const bRect = twoText.getBoundingClientRect(true)
            selectorInstance.update(
                bRect.left - 4,
                bRect.right + 4,
                bRect.top - 4,
                bRect.bottom + 4
            )

            setTextSize(newSize)
        }

        const onResizeMouseUp = () => {
            if (!resizeState) return
            const finalSize = twoText.size
            resizeState = null

            window.removeEventListener('mousemove', onResizeMouseMove)
            window.removeEventListener('mouseup', onResizeMouseUp)

            // Persist to store
            const bRect = twoText.getBoundingClientRect(true)
            const newWidth = Math.round(bRect.width || 60)
            const newHeight = Math.round(bRect.height || twoText.size)

            updateComponentBulkPropertiesInLocalStore(props.id, {
                width: newWidth,
                height: newHeight,
                metadata: {
                    ...props.metadata,
                    fontSize: finalSize,
                    content: twoText.value,
                },
            })
        }

        cornerCircles.forEach((circle, index) => {
            const circleElem = circle._renderer?.elem
            if (!circleElem) return

            circleElem.style.cursor = resizeCursors[index]
            circleElem.style.pointerEvents = 'all'

            circleElem.addEventListener('mousedown', (e) => {
                // Only allow resize when selector is visible
                if (selectorInstance.areaGroup.opacity === 0) return

                e.stopPropagation()
                e.preventDefault()

                // Get text center in screen coordinates
                const textDomElem = twoText._renderer.elem
                const textScreenRect = textDomElem.getBoundingClientRect()
                const centerX = textScreenRect.left + textScreenRect.width / 2
                const centerY = textScreenRect.top + textScreenRect.height / 2

                const startDist = Math.sqrt(
                    (e.clientX - centerX) ** 2 + (e.clientY - centerY) ** 2
                )

                resizeState = {
                    centerX,
                    centerY,
                    startDist,
                    startSize: twoText.size || 16,
                }

                window.addEventListener('mousemove', onResizeMouseMove)
                window.addEventListener('mouseup', onResizeMouseUp)
            })
        })

        document
            .getElementById(group.id)
            .setAttribute('class', 'dragger-picker')
        document
            .getElementById(group.id)
            .setAttribute('data-component-id', props.id)

        setInternalState((draft) => {
            draft.group = { id: group.id, data: group }
            draft.twoText = { id: twoText.id, data: twoText }
            // shape and text both point to twoText so the toolbar's
            // opacity (shape.data.opacity) and text-color (text.data.fill)
            // handlers update the Two.js object directly
            draft.shape = { id: twoText.id, data: twoText }
            draft.text = { id: twoText.id, data: twoText }
            draft.icon = { data: {} }
        })

        const getGroupElementFromDOM = document.getElementById(`${group.id}`)
        getGroupElementFromDOM.addEventListener('focus', onFocusHandler)
        getGroupElementFromDOM.addEventListener('blur', onBlurHandler)

        // ── Textarea overlay for editing ──────────────────────────────────────
        const showTextInput = () => {
            const groupDomElem = document.getElementById(`${group.id}`)
            if (!groupDomElem) return

            // Use the native SVG <text> DOM element to derive screen position
            const textDomElem = twoText._renderer.elem
            const screenRect = textDomElem.getBoundingClientRect()

            // Hide the Two.js group so the textarea sits on top cleanly
            groupDomElem.style.display = 'none'

            const fontSize = twoText.size || 16
            // Use a generous line-height so ascenders/descenders are
            // never clipped. A 1.6× multiplier covers most font metrics.
            const lineH = Math.ceil(fontSize * 1.6)
            // Vertical padding inside the textarea prevents the top of
            // tall glyphs (H, d, l …) from being cut off by the element
            // boundary. Half the difference between lineH and fontSize
            // approximates the ascender headroom the browser needs.
            const vertPad = Math.ceil((lineH - fontSize) / 2) + 4

            const input = document.createElement('textarea')
            const randomId = Math.floor(Math.random() * 90 + 10)
            input.id = `new-text-input-area-${randomId}`
            input.value = textValueRef.current
            input.rows = 1
            input.style.border = 'none'
            input.style.background = 'transparent'
            input.style.padding = `${vertPad}px 8px`
            input.style.color = twoText.fill || '#000000'
            input.style.fontSize = `${fontSize}px`
            input.style.fontFamily = twoText.family || 'sans-serif'
            input.style.fontWeight = twoText.weight || 'normal'
            input.style.lineHeight = `${lineH}px`
            input.style.letterSpacing = '0px'
            input.style.textAlign = 'center'
            input.style.position = 'absolute'
            input.style.outline = 'none'
            input.style.resize = 'none'
            input.style.overflow = 'visible'
            input.style.whiteSpace = 'pre'
            input.style.boxSizing = 'border-box'
            input.className = 'temp-input-area'

            // Anchor point: the SVG text element's screen-space center
            const centerX = screenRect.left + screenRect.width / 2
            const centerY = screenRect.top + screenRect.height / 2

            document.getElementById('main-two-root').append(input)

            // ── Offscreen measurement helper ──
            // We create a hidden <span> with identical font styles and
            // read its offsetWidth/offsetHeight. This is more reliable
            // than textarea.scrollWidth which can be affected by cols,
            // min intrinsic sizing, and platform differences.
            const measureSpan = document.createElement('span')
            measureSpan.style.position = 'absolute'
            measureSpan.style.visibility = 'hidden'
            measureSpan.style.whiteSpace = 'pre'
            measureSpan.style.fontSize = `${fontSize}px`
            measureSpan.style.fontFamily = twoText.family || 'sans-serif'
            measureSpan.style.fontWeight = twoText.weight || 'normal'
            measureSpan.style.lineHeight = `${lineH}px`
            measureSpan.style.letterSpacing = '0px'
            measureSpan.style.padding = '0'
            document.body.appendChild(measureSpan)

            const autoSizeAndCenter = () => {
                // Measure the text content with the hidden span
                const val = input.value || 'M' // fallback to 'M' so empty input still has width
                measureSpan.textContent = val

                const measuredW = measureSpan.offsetWidth
                const measuredH = measureSpan.offsetHeight

                // Total textarea size = measured text + padding + breathing room
                const contentWidth = Math.max(
                    measuredW + 40,
                    screenRect.width + 40,
                    80
                )
                const contentHeight = Math.max(
                    measuredH + vertPad * 2,
                    lineH + vertPad * 2
                )

                input.style.width = `${contentWidth}px`
                input.style.height = `${contentHeight}px`

                // Centre over the original text midpoint
                input.style.left = `${centerX - contentWidth / 2}px`
                input.style.top = `${centerY - contentHeight / 2}px`
            }

            autoSizeAndCenter()

            // Re-measure on every keystroke so the box grows with the text
            input.addEventListener('input', autoSizeAndCenter)

            input.onfocus = function () {
                const bRect = twoText.getBoundingClientRect(true)
                selectorInstance.update(
                    bRect.left - 4,
                    bRect.right + 4,
                    bRect.top - 4,
                    bRect.bottom + 4
                )
                selectorInstance.show()
                two.update()
            }

            input.focus()

            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault()
                }
            })

            input.addEventListener('blur', () => {
                // Clean up the input listener and measurement span
                input.removeEventListener('input', autoSizeAndCenter)
                if (measureSpan.parentNode) {
                    measureSpan.parentNode.removeChild(measureSpan)
                }

                groupDomElem.style.display = 'block'

                const newContent = input.value
                setTextValue(newContent)
                textValueRef.current = newContent

                // Reflect change in the Two.js text object
                twoText.value = newContent
                two.update()

                // Recalculate bounds after value update
                const bRect = twoText.getBoundingClientRect(true)
                const newWidth = Math.round(bRect.width || 60)
                const newHeight = Math.round(bRect.height || twoText.size)

                selectorInstance.update(
                    bRect.left - 4,
                    bRect.right + 4,
                    bRect.top - 4,
                    bRect.bottom + 4
                )
                selectorInstance.hide()
                two.update()

                updateComponentBulkPropertiesInLocalStore(props.id, {
                    width: newWidth,
                    height: newHeight,
                    metadata: {
                        ...props.metadata,
                        content: textValueRef.current,
                    },
                })

                input.remove()
            })
        }

        // Double-click on either the SVG <text> node or the outer <g> group triggers editing
        twoText._renderer.elem.addEventListener('dblclick', () => {
            showTextInput()
        })
        getGroupElementFromDOM.addEventListener('dblclick', () => {
            showTextInput()
        })

        // Fired by canvas after the element is first placed on the board
        const handleTriggerTextInput = (e) => {
            if (e.detail.elementId === props.id) {
                setTimeout(() => showTextInput(), 100)
            }
        }
        window.addEventListener('triggerTextInput', handleTriggerTextInput)

        // Single click → show selector + toolbar
        interact(`#${group.id}`).on('click', () => {
            const bRect = twoText.getBoundingClientRect(true)
            selector.update(
                bRect.left - 4,
                bRect.right + 4,
                bRect.top - 4,
                bRect.bottom + 4
            )
            two.update()
            toggleToolbar(true)
        })

        // Hide selector and toolbar when clicking elsewhere
        handleGlobalMousedown = (e) => {
            const path = e.composedPath ? e.composedPath() : e.path || []
            const isOnGroup = path.some((el) => el.id === group.id)
            const isOnToolbar = path.some((el) => el.id === 'floating-toolbar')
            if (!isOnGroup && !isOnToolbar) {
                selectorInstance.hide()
                toggleToolbar(false)
                two.update()
            }
        }
        window.addEventListener('mousedown', handleGlobalMousedown)

        return () => {
            window.removeEventListener(
                'triggerTextInput',
                handleTriggerTextInput
            )
            if (handleGlobalMousedown) {
                window.removeEventListener('mousedown', handleGlobalMousedown)
            }
            window.removeEventListener('mousemove', onResizeMouseMove)
            window.removeEventListener('mouseup', onResizeMouseUp)
        }
    }, [])

    // Sync position and text styling when props change
    useEffect(() => {
        if (internalState?.group?.data) {
            internalState.group.data.translation.x = props.x
            internalState.group.data.translation.y = props.y
            two.update()
        }

        if (internalState?.twoText?.data) {
            const twoText = internalState.twoText.data

            if (props.textColor) {
                twoText.fill = props.textColor
            }
            if (props.metadata?.fontSize) {
                twoText.size = props.metadata.fontSize
                setTextSize(props.metadata.fontSize)
            }
            if (
                props.metadata?.content !== undefined &&
                props.metadata.content !== textValueRef.current
            ) {
                twoText.value = props.metadata.content
                textValueRef.current = props.metadata.content
                setTextValue(props.metadata.content)
            }

            two.update()
        }
    }, [props.x, props.y, props.textColor, props.metadata])

    // Disable pointer events while another draw mode is active
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

    return (
        <React.Fragment>
            <div id="two-new-text"></div>
            {showToolbar ? (
                <Toolbar
                    // Show only text color and opacity; hide everything else
                    hideColorBackground={true}
                    currentFontSize={twoTextRef.current.size}
                    hideColorIcon={true}
                    hideColorText={false}
                    hideBorderSection={true}
                    showTextSizeSection={true}
                    toggle={showToolbar}
                    componentState={internalState}
                    closeToolbar={closeToolbar}
                    componentId={props.id}
                    postToolbarUpdate={() => {
                        two.update()
                    }}
                    onTextSizeChange={handleTextSizeChange}
                />
            ) : null}
        </React.Fragment>
    )
}

export default NewText
