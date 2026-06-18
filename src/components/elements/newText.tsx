import React, { useEffect, useState, useRef } from 'react'
import type { ReactElement } from 'react'
import { useImmer } from 'use-immer'
import { useBoardContext } from '../../views/Board/boardContext'

import NewTextFactory from '../../factory/newText'
import { syncTextHitRect, readOpacity } from '../../utils/canvasUtils'
import { lineHeightFor } from '../../utils/textLayout'
import { htmlToBulletText } from '../../utils/htmlToBulletText'
import { DEFAULT_TEXT_FONT_FAMILY } from '../../constants/misc'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElementProps = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InternalState = Record<string, any>

// Selection, drag-follow, font-resize and deletion are owned by the generic
// SelectionController (TEXT_ADAPTER with resizeMode:'font'). This component only
// renders the text and owns the inline text-edit overlay (dblclick → textarea).
function NewText(props: ElementProps): ReactElement {
    const {
        updateComponentBulkPropertiesInLocalStore,
        isPencilMode,
        isArrowDrawMode,
        isTextDrawMode,
        isArrowSelected,
    } = useBoardContext()

    const [internalState, setInternalState] = useImmer<InternalState>({})
    const [textValue, setTextValue] = useState<string>(
        props?.metadata?.content || ''
    )
    const [, setTextSize] = useState<number>(props?.metadata?.fontSize || 36)
    const textValueRef = useRef(textValue)
    const twoTextRef = useRef<ShapeLike>(null)
    // Satellite Two.Text nodes for lines 2..N (line 1 stays `twoText`), and a
    // ref to the layout sync so the metadata effect can re-run it.
    const extraLineNodesRef = useRef<ShapeLike[]>([])
    const syncMultilineRef = useRef<(() => void) | null>(null)

    const two = props.twoJSInstance

    useEffect(() => {
        const prevX = props.x
        const prevY = props.y

        const elementFactory = new NewTextFactory(two, prevX, prevY, props)
        const { group, twoText } = elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }
        twoText.opacity = readOpacity(props)

        twoTextRef.current = twoText

        // Multiline rendering for standalone text: `twoText` holds line 1;
        // satellite Two.Text nodes hold lines 2..N. We honor only hard
        // newlines (Shift+Enter) — standalone text is NOT width-reflowed on
        // resize (per product decision). The whole block is vertically
        // centered around the group origin.
        const syncMultilineLayout = (): void => {
            const t = twoTextRef.current
            if (!t) return
            const lines = (textValueRef.current || '').split('\n')
            const n = lines.length
            const lineH = lineHeightFor(t.size || 36)
            const extra = extraLineNodesRef.current

            t.value = lines[0] ?? ''
            t.translation.set(0, (0 - (n - 1) / 2) * lineH)

            for (let i = 1; i < n; i++) {
                let node = extra[i - 1]
                if (!node) {
                    node = two.makeText(lines[i] ?? '', 0, 0)
                    group.add(node)
                    extra[i - 1] = node
                }
                node.value = lines[i] ?? ''
                node.fill = t.fill
                node.size = t.size
                node.family = t.family
                node.alignment = t.alignment
                node.baseline = t.baseline
                node.opacity = t.opacity
                node.translation.set(0, (i - (n - 1) / 2) * lineH)
            }
            if (extra.length > n - 1) {
                const surplus = extra.splice(Math.max(n - 1, 0))
                if (surplus.length > 0) group.remove(surplus)
            }
            // Keep the transparent hit area covering the whole block so clicks
            // in the gaps between lines still select the text (see canvasUtils).
            syncTextHitRect(two, group)
            two.update()
        }
        syncMultilineRef.current = syncMultilineLayout

        // Union screen box over every line node so the selection rectangle
        // encloses the whole multiline block (not just line 1).
        const blockRect = (): {
            left: number
            right: number
            top: number
            bottom: number
            width: number
            height: number
        } => {
            const nodes = [
                twoTextRef.current,
                ...extraLineNodesRef.current,
            ].filter(Boolean)
            let L = Infinity
            let R = -Infinity
            let T = Infinity
            let B = -Infinity
            nodes.forEach((nd) => {
                const r = nd.getBoundingClientRect(true)
                L = Math.min(L, r.left)
                R = Math.max(R, r.right)
                T = Math.min(T, r.top)
                B = Math.max(B, r.bottom)
            })
            if (L === Infinity) {
                return twoText.getBoundingClientRect(true)
            }
            return {
                left: L,
                right: R,
                top: T,
                bottom: B,
                width: R - L,
                height: B - T,
            }
        }

        // Render any persisted multiline content as the stacked block.
        syncMultilineLayout()
        two.update()

        const groupEl = document.getElementById(group.id)
        if (groupEl) {
            groupEl.setAttribute('class', 'dragger-picker')
            groupEl.setAttribute('data-component-id', props.id)
        }

        setInternalState((draft) => {
            draft.group = { id: group.id, data: group }
            draft.twoText = { id: twoText.id, data: twoText }
            draft.shape = { id: twoText.id, data: twoText }
            draft.text = { id: twoText.id, data: twoText }
            draft.icon = { data: {} }
        })

        const getGroupElementFromDOM = document.getElementById(`${group.id}`)

        const showTextInput = (): void => {
            // A dblclick bubbles from the text node to the group, firing BOTH
            // dblclick listeners below. Without this guard the second call reads
            // getBoundingClientRect on the now-hidden group → (0,0) and drops a
            // duplicate editor in the top-left corner. One editor at a time.
            if (document.querySelector('.temp-input-area')) return

            const groupDomElem = document.getElementById(`${group.id}`)
            if (!groupDomElem) return

            // Live block screen rect = union of every line node's DOM rect.
            // Re-read each frame so the editor follows the text as the canvas
            // pans/zooms. The block is vertically centered on the group origin
            // (line 1 sits at its TOP), so unioning ALL lines — not just line 1 —
            // is what keeps multi-line text centered in the editor/box.
            const blockScreenRect = (): {
                left: number
                top: number
                width: number
                height: number
            } => {
                const lineNodes = [
                    twoTextRef.current,
                    ...extraLineNodesRef.current,
                ].filter(Boolean)
                let L = Infinity
                let R = -Infinity
                let T = Infinity
                let Bm = -Infinity
                lineNodes.forEach((nd: ShapeLike) => {
                    const el = nd?._renderer?.elem as HTMLElement | undefined
                    if (!el) return
                    const r = el.getBoundingClientRect()
                    L = Math.min(L, r.left)
                    R = Math.max(R, r.right)
                    T = Math.min(T, r.top)
                    Bm = Math.max(Bm, r.bottom)
                })
                if (L === Infinity) {
                    const r = (
                        twoText._renderer.elem as HTMLElement
                    ).getBoundingClientRect()
                    return {
                        left: r.left,
                        top: r.top,
                        width: r.width,
                        height: r.height,
                    }
                }
                return { left: L, top: T, width: R - L, height: Bm - T }
            }

            // Measure the text's real screen rect WHILE it's still visible, then
            // hide it with display:none. (We must NOT use visibility:hidden:
            // Two.js drives the SVG visibility/display from its own `.visible`
            // flag and overwrites a CSS visibility we set on the next two.update,
            // re-showing the text on top of the textarea — double text. opacity:0
            // is no good either: the renderer skips updating opacity-0 nodes, so
            // typed changes wouldn't track.) With display:none we can't read the
            // hidden text's rect, so we map its FIXED surface anchor → screen via
            // the live camera instead.
            const startRect = blockScreenRect()
            groupDomElem.style.display = 'none'

            const scale0 = two?.scene?.scale || 1
            // The anchor is invariant during edit: text is left-aligned at the
            // group origin x and vertically centered on the group origin y.
            const surfaceLeft = group.translation.x
            const surfaceCenterY = group.translation.y
            const surfaceWidth = startRect.width / scale0
            // Calibrate the constant part (canvas page offset + glyph bearing)
            // from the real start position so there's no jump entering edit.
            const calibX =
                startRect.left - 8 - two.scene.translation.x - surfaceLeft * scale0
            const calibY =
                startRect.top +
                startRect.height / 2 -
                two.scene.translation.y -
                surfaceCenterY * scale0

            // Camera-dependent geometry — recomputed each two.update (pan/zoom).
            let cssFontSize = (twoText.size || 36) * scale0
            let lineH = Math.ceil(cssFontSize * 1.6)
            let vertPad = Math.ceil((lineH - cssFontSize) / 2) + 4
            let leftAnchor = 0
            let centerY = 0
            let minContentWidth = 0

            const input = document.createElement('textarea')
            const randomId = Math.floor(Math.random() * 90 + 10)
            input.id = `new-text-input-area-${randomId}`
            input.value = textValueRef.current
            input.rows = 1
            input.style.border = 'none'
            input.style.background = 'transparent'
            input.style.padding = `${vertPad}px 8px`
            input.style.color = twoText.fill || '#3A342C'
            // Match the element's current opacity so the editor doesn't flash to
            // full opacity on entering edit mode. Opacity persists in the
            // top-level `opacity` field (legacy rows fall back to metadata).
            input.style.opacity = String(
                readOpacity(group.elementData) ?? group.opacity ?? 1
            )
            input.style.fontSize = `${cssFontSize}px`
            input.style.fontFamily = twoText.family || DEFAULT_TEXT_FONT_FAMILY
            input.style.fontWeight = twoText.weight || 'normal'
            input.style.lineHeight = `${lineH}px`
            input.style.letterSpacing = '0px'
            input.style.textAlign = 'left'
            input.style.position = 'absolute'
            input.style.outline = 'none'
            input.style.resize = 'none'
            input.style.overflow = 'visible'
            input.style.whiteSpace = 'pre'
            input.style.boxSizing = 'border-box'
            input.className = 'temp-input-area'

            document.getElementById('main-two-root')?.append(input)

            const measureSpan = document.createElement('span')
            measureSpan.style.position = 'absolute'
            measureSpan.style.visibility = 'hidden'
            measureSpan.style.whiteSpace = 'pre'
            measureSpan.style.fontSize = `${cssFontSize}px`
            measureSpan.style.fontFamily =
                twoText.family || DEFAULT_TEXT_FONT_FAMILY
            measureSpan.style.fontWeight = twoText.weight || 'normal'
            measureSpan.style.lineHeight = `${lineH}px`
            measureSpan.style.letterSpacing = '0px'
            measureSpan.style.padding = '0'
            document.body.appendChild(measureSpan)

            // Pull font + anchor from the LIVE camera + text position. Called on
            // every two.update so the editor pans/zooms with the text.
            const recomputeGeometry = (): void => {
                const scale = two?.scene?.scale || 1
                cssFontSize = (twoText.size || 36) * scale
                lineH = Math.ceil(cssFontSize * 1.6)
                vertPad = Math.ceil((lineH - cssFontSize) / 2) + 4
                // Map the fixed surface anchor → current screen via the live
                // camera. No getBoundingClientRect (the text is display:none).
                leftAnchor =
                    calibX + two.scene.translation.x + surfaceLeft * scale
                centerY =
                    calibY + two.scene.translation.y + surfaceCenterY * scale
                minContentWidth = surfaceWidth * scale
                input.style.fontSize = `${cssFontSize}px`
                input.style.lineHeight = `${lineH}px`
                input.style.padding = `${vertPad}px 8px`
                measureSpan.style.fontSize = `${cssFontSize}px`
                measureSpan.style.lineHeight = `${lineH}px`
            }

            // Pure DOM: size + place the textarea from the current geometry.
            // No two.update here (so it's safe to call from the update handler).
            const autoSizeAndCenter = (): void => {
                const val = input.value || 'M'
                measureSpan.textContent = val

                const measuredW = measureSpan.offsetWidth
                const measuredH = measureSpan.offsetHeight

                const contentWidth = Math.max(
                    measuredW + 40,
                    minContentWidth + 40,
                    80
                )
                const contentHeight = Math.max(
                    measuredH + vertPad * 2,
                    lineH + vertPad * 2
                )

                input.style.width = `${contentWidth}px`
                input.style.height = `${contentHeight}px`
                input.style.left = `${leftAnchor}px`
                input.style.top = `${centerY - contentHeight / 2}px`
            }

            // Re-glue the editor to the text after any render (pan/zoom/content).
            const repositionEditor = (): void => {
                recomputeGeometry()
                autoSizeAndCenter()
            }

            // On typing: push the value into the hidden Two.js text nodes so the
            // SelectionController's box (and our live block rect) reflect it. The
            // syncMultilineLayout's two.update fires 'update' → repositionEditor.
            const onTextInput = (): void => {
                textValueRef.current = input.value
                syncMultilineLayout()
                repositionEditor()
            }

            repositionEditor()
            two.bind('update', repositionEditor)

            input.addEventListener('input', onTextInput)

            // Pasting a bulleted list from a rich-text source (Docs, Notion,
            // Notes) into this plain textarea would otherwise drop the bullet
            // markers — the source's `text/plain` projection omits them. Read
            // the `text/html` flavor and rebuild `• `-prefixed lines so list
            // structure survives the paste.
            input.addEventListener('paste', (event: ClipboardEvent) => {
                const html = event.clipboardData?.getData('text/html')
                if (!html) return
                const converted = htmlToBulletText(html)
                if (converted == null) return

                event.preventDefault()
                const start = input.selectionStart ?? input.value.length
                const end = input.selectionEnd ?? input.value.length
                input.value =
                    input.value.slice(0, start) +
                    converted +
                    input.value.slice(end)
                const caret = start + converted.length
                input.selectionStart = caret
                input.selectionEnd = caret
                onTextInput()
            })

            input.focus()

            input.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Enter') {
                    if (event.shiftKey) {
                        // Shift+Enter inserts a newline (textarea is
                        // whiteSpace:'pre'); hard newlines are preserved.
                        return
                    }
                    // Plain Enter commits and closes the editor.
                    event.preventDefault()
                    input.blur()
                }
                if (event.key === 'Escape') {
                    event.preventDefault()
                    input.blur()
                }
            })

            input.addEventListener('blur', () => {
                two.unbind('update', repositionEditor)
                input.removeEventListener('input', onTextInput)
                if (measureSpan.parentNode) {
                    measureSpan.parentNode.removeChild(measureSpan)
                }

                groupDomElem.style.display = 'block'

                // Raw text — may contain hard newlines from Shift+Enter.
                const newContent = input.value
                setTextValue(newContent)
                textValueRef.current = newContent

                syncMultilineLayout()

                const bRect = blockRect()
                const newWidth = Math.round(bRect.width || 60)
                const newHeight = Math.round(bRect.height || twoText.size)

                // two.update() re-runs the SelectionController's 'update' bind,
                // which re-syncs its box to the (possibly resized) text block.
                two.update()

                // Merge onto the LIVE metadata (kept current by the toolbar's
                // size/font/opacity handlers + controller resize), not the
                // props snapshot frozen at mount — otherwise editing the text
                // after a size/opacity change would write those stale values
                // back and revert them on reload.
                const baseMetadata =
                    group.elementData?.metadata ?? props.metadata ?? {}
                const updatedMetadata = {
                    ...baseMetadata,
                    content: textValueRef.current,
                }
                updateComponentBulkPropertiesInLocalStore(props.id, {
                    width: newWidth,
                    height: newHeight,
                    metadata: updatedMetadata,
                })

                if (group.elementData) {
                    group.elementData.metadata = updatedMetadata
                }

                input.remove()
            })
        }

        twoText._renderer.elem.addEventListener('dblclick', () => {
            showTextInput()
        })
        getGroupElementFromDOM?.addEventListener('dblclick', () => {
            showTextInput()
        })

        const handleTriggerTextInput = (e: Event): void => {
            const detail = (e as CustomEvent<{ elementId: string }>).detail
            if (detail?.elementId === props.id) {
                setTimeout(() => showTextInput(), 100)
            }
        }
        window.addEventListener('triggerTextInput', handleTriggerTextInput)

        return (): void => {
            window.removeEventListener(
                'triggerTextInput',
                handleTriggerTextInput
            )
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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
            if (props.metadata?.textFontFamily) {
                twoText.family = props.metadata.textFontFamily
            }
            if (
                props.metadata?.content !== undefined &&
                props.metadata.content !== textValueRef.current
            ) {
                textValueRef.current = props.metadata.content
                setTextValue(props.metadata.content)
            }

            // Propagate style/content changes across every line node and
            // restack (handles font-size/family/color from the toolbar and
            // group-apply, plus external content updates).
            syncMultilineRef.current?.()

            two.update()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.x, props.y, props.textColor, props.metadata])

    // Undo/redo reverts text via the history hook, but ElementRenderWrapper
    // freezes our props at mount so the metadata effect above never re-fires.
    // The hook dispatches this event instead; we re-stack through the
    // component's own multiline path so extraLineNodesRef stays consistent.
    useEffect(() => {
        const handleTextReverted = ((
            e: CustomEvent<{ id: string; content: string }>
        ): void => {
            if (e.detail?.id !== props.id) return
            const content = e.detail.content ?? ''
            textValueRef.current = content
            setTextValue(content)
            syncMultilineRef.current?.()
            two?.update()
        }) as EventListener
        window.addEventListener('standaloneTextReverted', handleTextReverted)
        return () =>
            window.removeEventListener(
                'standaloneTextReverted',
                handleTextReverted
            )
    }, [props.id, two])

    useEffect(() => {
        const groupId = internalState?.group?.id
        const el = groupId ? document.getElementById(groupId) : null
        if (el) {
            el.style.pointerEvents =
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
        </React.Fragment>
    )
}

export default NewText
