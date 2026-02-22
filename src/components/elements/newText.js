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

            const input = document.createElement('textarea')
            const randomId = Math.floor(Math.random() * 90 + 10)
            input.id = `new-text-input-area-${randomId}`
            input.value = textValueRef.current
            input.rows = 1
            input.style.border = 'none'
            input.style.background = 'transparent'
            input.style.padding = '4px'
            input.style.color = twoText.fill || '#000000'
            input.style.fontSize = `${twoText.size}px`
            input.style.fontFamily = twoText.family || 'sans-serif'
            input.style.textAlign = 'center'
            input.style.position = 'absolute'
            input.style.top = `${screenRect.top}px`
            input.style.left = `${screenRect.left - screenRect.width * 0.5}px`
            input.style.width = `${Math.max(screenRect.width * 2, 80)}px`
            input.style.outline = 'none'
            input.style.resize = 'none'
            input.style.overflow = 'hidden'
            input.className = 'temp-input-area'

            document.getElementById('main-two-root').append(input)

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
