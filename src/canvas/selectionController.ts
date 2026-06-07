import Two from 'two.js'
import {
    findShapeTextLayer,
    getShapeTextNodes,
    renderShapeTextLayer,
    shapeTextStyleFromMeta,
} from '../utils/canvasUtils'
import {
    reflowTextForShape,
    minShapeWidthForText,
} from '../utils/shapeTextFit'

// Two.js scene shapes carry codebase-specific bookkeeping (elementData,
// _renderer, etc.) outside the published types. Stay loose here; Stage 12
// can tighten once newCanvas converges in Stage 9.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GroupLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZuiLike = any

interface ShapeAdapter {
    getLocalSize: (shape: ShapeLike) => { width: number; height: number }
    applySize: (shape: ShapeLike, width: number, height: number) => void
    resizable: boolean
    minWidth: number
    minHeight: number
}

const DEFAULT_ADAPTER: ShapeAdapter = {
    getLocalSize: (shape) => ({
        width: shape.width,
        height: shape.height,
    }),
    applySize: (shape, width, height) => {
        shape.width = width
        shape.height = height
    },
    resizable: true,
    minWidth: 20,
    minHeight: 20,
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TEXT_ADAPTER: ShapeAdapter = {
    getLocalSize: (shape) => ({
        width: shape.getBoundingClientRect(true).width || 60,
        height: shape.getBoundingClientRect(true).height || 30,
    }),
    applySize: () => {},
    resizable: false,
    minWidth: 20,
    minHeight: 20,
}

const SHAPE_ADAPTERS: Record<string, ShapeAdapter> = {
    rectangle: DEFAULT_ADAPTER,
    circle: DEFAULT_ADAPTER,
    diamond: DEFAULT_ADAPTER,
}

// Handle dot diameter in *screen* px, stepped across 3 zoom ranges so the dots
// stay stable instead of rescaling continuously with zoom.
function handleScreenPx(scale: number): number {
    if (scale < 0.5) return 8
    if (scale < 2) return 11
    return 14
}
const HANDLE_HIT_SLOP_MOUSE = 3
const HANDLE_HIT_SLOP_TOUCH = 8
const MIN_SCALE_DIMENSION = 20
const SELECTION_PADDING = 5

interface ToolbarState {
    element: Record<string, ShapeLike>
    group: { id: string; data: GroupLike }
    shape: { type: string | undefined; id: string; data: ShapeLike }
    text: { data: ShapeLike }
    icon: { data: Record<string, unknown> }
}

function buildToolbarState(group: GroupLike, shape: ShapeLike): ToolbarState {
    const componentType = group?.elementData?.componentType
    // First line node of the (possibly multiline) text layer.
    const textChild = getShapeTextNodes(group)[0]
    return {
        element: {
            [shape.id]: shape,
            [group.id]: group,
        },
        group: {
            id: group.id,
            data: group,
        },
        shape: {
            type: componentType,
            id: shape.id,
            data: shape,
        },
        text: { data: textChild || {} },
        icon: { data: {} },
    }
}

function distSq(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax - bx
    const dy = ay - by
    return dx * dx + dy * dy
}

interface SelectionControllerOptions {
    two: TwoLike
    zui: ZuiLike
    domElement: HTMLElement
    onSelect?: (state: ToolbarState) => void
    onDeselect?: () => void
    commit?: (
        id: string,
        patch: { width: number; height: number; x: number; y: number }
    ) => void
    recordHistory?: () => void
    onDelete?: (group: GroupLike) => void
}

interface HitResult {
    mode: 'scale' | 'rotate'
    corner: CornerHandle
}

interface CornerHandle {
    name: string
    point: { x: number; y: number }
}

interface ScaleInteraction {
    mode: 'scale'
    corner: CornerHandle
    startSurface: { x: number; y: number }
    initialWidth: number
    initialHeight: number
    initialPosition: { x: number; y: number }
    initialRotation: number
}

interface RotateInteraction {
    mode: 'rotate'
    corner: CornerHandle
    startSurface: { x: number; y: number }
    initialRotation: number
    center: { x: number; y: number }
}

type Interaction = ScaleInteraction | RotateInteraction

export default class SelectionController {
    two: TwoLike
    zui: ZuiLike
    domElement: HTMLElement
    callbacks: Required<
        Pick<
            SelectionControllerOptions,
            'onSelect' | 'onDeselect' | 'commit' | 'recordHistory' | 'onDelete'
        >
    >

    rotationEnabled = false

    targets: Set<GroupLike> = new Set()
    currentGroup: GroupLike = null
    currentShape: ShapeLike = null
    currentAdapter: ShapeAdapter | null = null
    currentTextChild: ShapeLike = null
    currentTextLayer: ShapeLike = null

    interaction: Interaction | null = null

    ui!: ShapeLike
    box!: ShapeLike
    endpoints!: ShapeLike
    midEndpoints!: ShapeLike
    midPoints!: ShapeLike[]

    private _onUpdate: (() => void) | null = null
    private _onClearSelector: (() => void) | null = null
    private _onKeyDown: ((e: KeyboardEvent) => void) | null = null
    private _onMove: ((ev: MouseEvent) => void) | null = null
    private _onUp: ((ev: MouseEvent) => void) | null = null
    private _onHover: ((ev: MouseEvent) => void) | null = null

    constructor({
        two,
        zui,
        domElement,
        onSelect,
        onDeselect,
        commit,
        recordHistory,
        onDelete,
    }: SelectionControllerOptions) {
        this.two = two
        this.zui = zui
        this.domElement = domElement
        this.callbacks = {
            onSelect: onSelect ?? ((): void => {}),
            onDeselect: onDeselect ?? ((): void => {}),
            commit: commit ?? ((): void => {}),
            recordHistory: recordHistory ?? ((): void => {}),
            onDelete: onDelete ?? ((): void => {}),
        }

        this._buildUi()
        this._bindExternal()
    }

    private _buildUi(): void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ui = new (Two as any).Group()
        ui.visible = false

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const box = new (Two as any).Rectangle(0, 0, 0, 0)
        box.noFill()
        box.stroke = '#C4901A'
        box.linewidth = 1.5

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const endpoints = new (Two as any).Points(box.vertices)
        endpoints.size = 10
        endpoints.fill = '#FFFCF5'
        endpoints.stroke = '#C4901A'
        endpoints.linewidth = 1.5

        this.midPoints = [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new (Two as any).Vector(0, 0), // n
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new (Two as any).Vector(0, 0), // e
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new (Two as any).Vector(0, 0), // s
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new (Two as any).Vector(0, 0), // w
        ]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const midEndpoints = new (Two as any).Points(this.midPoints)
        midEndpoints.size = 10
        midEndpoints.fill = '#FFFCF5'
        midEndpoints.stroke = '#C4901A'
        midEndpoints.linewidth = 1.5
        midEndpoints.visible = false

        ui.add(box, endpoints, midEndpoints)
        this.two.add(ui)

        this.ui = ui
        this.box = box
        this.endpoints = endpoints
        this.midEndpoints = midEndpoints
    }

    private _bindExternal(): void {
        this._onUpdate = (): void => this.syncToTarget()
        this.two.bind('update', this._onUpdate)

        this._onClearSelector = (): void => this.detach()
        window.addEventListener('clearSelector', this._onClearSelector, false)

        this._onKeyDown = (e: KeyboardEvent): void => {
            if (!this.currentGroup) return
            const tag = document.activeElement?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return
            if (e.keyCode === 8 || e.keyCode === 46) {
                this.callbacks.onDelete(this.currentGroup)
                this.detach()
            }
        }
        window.addEventListener('keydown', this._onKeyDown, false)
    }

    destroy(): void {
        if (this._onUpdate) this.two.unbind('update', this._onUpdate)
        if (this._onClearSelector) {
            window.removeEventListener(
                'clearSelector',
                this._onClearSelector,
                false
            )
        }
        if (this._onKeyDown) {
            window.removeEventListener('keydown', this._onKeyDown, false)
        }
        this._detachPointerStream()
        this.two.remove(this.ui)
    }

    canHandle(group: GroupLike): boolean {
        const type = group?.elementData?.componentType
        return !!SHAPE_ADAPTERS[type]
    }

    private _bringToFront(): void {
        const scene = this.two.scene
        const idx = scene.children.indexOf(this.ui)
        if (idx === -1) {
            this.two.add(this.ui)
            return
        }
        if (idx !== scene.children.length - 1) {
            scene.children.splice(idx, 1)
            scene.children.push(this.ui)
        }
    }

    /**
     * Public re-assert of the selection overlay to the top of the scene.
     * Called by the z-order reconcile after it re-sorts element groups, so the
     * selection box never gets buried beneath a just-reordered element. No-op
     * when nothing is selected.
     */
    bringSelectionToFront(): void {
        if (!this.currentGroup) return
        this._bringToFront()
    }

    attach(group: GroupLike, shape?: ShapeLike): boolean {
        const type = group?.elementData?.componentType
        const adapter = SHAPE_ADAPTERS[type]
        if (!adapter) return false

        if (this.currentGroup && this.currentGroup !== group) {
            this.targets.clear()
        }

        this.currentGroup = group
        this.currentShape = shape || group.children[0]
        this.currentAdapter = adapter
        this.currentTextLayer = findShapeTextLayer(group)
        this.currentTextChild = getShapeTextNodes(group)[0] || null
        this.targets.add(group)

        this._bringToFront()
        this.ui.visible = true
        // Per-shape `.dragger-picker { cursor: pointer }` (common.css) sits on
        // the SVG node directly under the cursor and beats the root's inline
        // cursor. This class lets CSS show `move` over the selected shape body.
        this.domElement.classList.add('shape-selected')
        this.syncToTarget()
        this.two.update()

        this._attachHoverListener()
        this.callbacks.onSelect(
            buildToolbarState(this.currentGroup, this.currentShape)
        )
        return true
    }

    detach(): void {
        if (!this.currentGroup) return
        this._detachPointerStream()
        this._detachHoverListener()
        this.targets.clear()
        this.currentGroup = null
        this.currentShape = null
        this.currentAdapter = null
        this.currentTextChild = null
        this.currentTextLayer = null
        this.ui.visible = false
        this.domElement.classList.remove('shape-selected')
        this.domElement.style.cursor = ''
        this.two.update()
        this.callbacks.onDeselect()
    }

    resync(): void {
        if (this.currentGroup) {
            this.syncToTarget()
            this.two.update()
        }
    }

    syncToTarget(): void {
        if (!this.currentGroup || !this.currentShape || !this.currentAdapter)
            return

        const scale = this.zui.scale || 1
        this.box.linewidth = 1.5 / scale
        // Two.Points render with sizeAttenuation=false, so `size` is already a
        // screen-px value (the renderer divides out the scene scale). Set it
        // directly — no /scale — else the dots inflate when zoomed out.
        const handleSize = handleScreenPx(scale)
        this.endpoints.size = handleSize
        this.midEndpoints.size = handleSize

        const { width, height } = this.currentAdapter.getLocalSize(
            this.currentShape
        )
        const pad = SELECTION_PADDING
        this.box.width = width + pad * 2
        this.box.height = height + pad * 2

        this.ui.position.set(
            this.currentGroup.translation.x,
            this.currentGroup.translation.y
        )
        this.ui.rotation = this.currentGroup.rotation || 0

        const isRect =
            this.currentGroup?.elementData?.componentType === 'rectangle'
        this.midEndpoints.visible = isRect
        if (isRect) {
            const hw = (width + pad * 2) / 2
            const hh = (height + pad * 2) / 2
            this.midPoints[0]!.set(0, -hh)
            this.midPoints[1]!.set(hw, 0)
            this.midPoints[2]!.set(0, hh)
            this.midPoints[3]!.set(-hw, 0)
        }
    }

    // ---------- Hit testing ----------

    hitTest(clientX: number, clientY: number): HitResult | null {
        if (!this.currentGroup || !this.ui.visible) return null
        if (this.currentAdapter && !this.currentAdapter.resizable) return null

        const surface = this.zui.clientToSurface(clientX, clientY)
        const scale = this.zui.scale || 1
        // Grab radius is tied to the visible dot (half its diameter) plus a few
        // px of slop, so resize only fires on the dot — not in a bloated zone
        // around it. Constant in screen px at any zoom.
        const hitRadiusPx = handleScreenPx(scale) / 2 + this._hitSlopPx()
        const hitLimit = hitRadiusPx / scale

        const isRect =
            this.currentGroup?.elementData?.componentType === 'rectangle'
        if (isRect) {
            const midEdge = this._atMidEdge(surface, hitLimit)
            if (midEdge) return { mode: 'scale', corner: midEdge }
        }

        const corner = this._atCorner(surface, hitLimit)
        if (!corner) return null

        const isOnInnerRing = this._withinCornerRadius(
            surface,
            corner,
            hitLimit
        )
        const mode = isOnInnerRing && this.rotationEnabled ? 'rotate' : 'scale'
        return { mode, corner }
    }

    private _vertexToSurface(v: { x: number; y: number }): {
        x: number
        y: number
    } {
        const rot = this.ui.rotation || 0
        const cos = Math.cos(rot)
        const sin = Math.sin(rot)
        return {
            x: this.ui.position.x + v.x * cos - v.y * sin,
            y: this.ui.position.y + v.x * sin + v.y * cos,
        }
    }

    private _atCorner(
        point: { x: number; y: number },
        limit: number
    ): CornerHandle | null {
        const verts = this.box.vertices
        const sq = limit * limit
        const corners: CornerHandle[] = [
            { name: 'nw-resize', point: verts[0] },
            { name: 'ne-resize', point: verts[1] },
            { name: 'se-resize', point: verts[2] },
            { name: 'sw-resize', point: verts[3] },
        ]
        for (const c of corners) {
            const p = this._vertexToSurface(c.point)
            if (distSq(point.x, point.y, p.x, p.y) < sq) return c
        }
        return null
    }

    private _atMidEdge(
        point: { x: number; y: number },
        limit: number
    ): CornerHandle | null {
        const sq = limit * limit
        const edges: CornerHandle[] = [
            { name: 'n-resize', point: this.midPoints[0]! },
            { name: 'e-resize', point: this.midPoints[1]! },
            { name: 's-resize', point: this.midPoints[2]! },
            { name: 'w-resize', point: this.midPoints[3]! },
        ]
        for (const edge of edges) {
            const p = this._vertexToSurface(edge.point)
            if (distSq(point.x, point.y, p.x, p.y) < sq) return edge
        }
        return null
    }

    private _withinCornerRadius(
        point: { x: number; y: number },
        corner: CornerHandle,
        limit: number
    ): boolean {
        const p = this._vertexToSurface(corner.point)
        return distSq(point.x, point.y, p.x, p.y) < limit * limit
    }

    // Touch arrives as synthetic mouse events, so the device pointer type is the
    // only signal available — coarse (finger) pointers get a more forgiving slop.
    private _hitSlopPx(): number {
        const coarse =
            typeof window !== 'undefined' &&
            window.matchMedia?.('(pointer: coarse)')?.matches
        return coarse ? HANDLE_HIT_SLOP_TOUCH : HANDLE_HIT_SLOP_MOUSE
    }

    // Is the surface point inside the selection box body (the drag zone)? Uses
    // the same rotation convention as _vertexToSurface, derotated into box space.
    private _withinBody(point: { x: number; y: number }): boolean {
        const rot = this.ui.rotation || 0
        const dx = point.x - this.ui.position.x
        const dy = point.y - this.ui.position.y
        const cos = Math.cos(-rot)
        const sin = Math.sin(-rot)
        const lx = dx * cos - dy * sin
        const ly = dx * sin + dy * cos
        return (
            Math.abs(lx) <= this.box.width / 2 &&
            Math.abs(ly) <= this.box.height / 2
        )
    }

    // ---------- Interaction lifecycle ----------

    beginInteraction(e: MouseEvent, hit: HitResult | null): boolean {
        if (!this.currentGroup || !hit) return false
        if (hit.mode === 'scale') return this._beginScale(e, hit.corner)
        if (hit.mode === 'rotate' && this.rotationEnabled) {
            return this._beginRotate(e, hit.corner)
        }
        return false
    }

    private _beginScale(e: MouseEvent, corner: CornerHandle): boolean {
        if (!this.currentAdapter) return false
        const surface = this.zui.clientToSurface(e.clientX, e.clientY)
        const { width, height } = this.currentAdapter.getLocalSize(
            this.currentShape
        )

        this.interaction = {
            mode: 'scale',
            corner,
            startSurface: { x: surface.x, y: surface.y },
            initialWidth: width,
            initialHeight: height,
            initialPosition: {
                x: this.currentGroup.translation.x,
                y: this.currentGroup.translation.y,
            },
            initialRotation: this.currentGroup.rotation || 0,
        }
        this._attachPointerStream()
        return true
    }

    private _beginRotate(e: MouseEvent, corner: CornerHandle): boolean {
        const surface = this.zui.clientToSurface(e.clientX, e.clientY)
        this.interaction = {
            mode: 'rotate',
            corner,
            startSurface: { x: surface.x, y: surface.y },
            initialRotation: this.currentGroup.rotation || 0,
            center: {
                x: this.currentGroup.translation.x,
                y: this.currentGroup.translation.y,
            },
        }
        this._attachPointerStream()
        return true
    }

    private _attachPointerStream(): void {
        this._onMove = (ev): void => this._onPointerMove(ev)
        this._onUp = (ev): void => this._onPointerUp(ev)
        this.domElement.addEventListener('mousemove', this._onMove, false)
        this.domElement.addEventListener('mouseup', this._onUp, false)
    }

    private _detachPointerStream(): void {
        if (this._onMove) {
            this.domElement.removeEventListener(
                'mousemove',
                this._onMove,
                false
            )
            this._onMove = null
        }
        if (this._onUp) {
            this.domElement.removeEventListener('mouseup', this._onUp, false)
            this._onUp = null
        }
    }

    private _attachHoverListener(): void {
        if (this._onHover) return
        this._onHover = (ev): void => {
            if (this.interaction) return
            const hit = this.hitTest(ev.clientX, ev.clientY)
            if (!hit) {
                // Over the shape body → move (4-way arrow drag cue); empty
                // canvas → default.
                const surface = this.zui.clientToSurface(
                    ev.clientX,
                    ev.clientY
                )
                this.domElement.style.cursor = this._withinBody(surface)
                    ? 'move'
                    : ''
                return
            }
            if (hit.mode === 'rotate') {
                this.domElement.style.cursor = 'alias'
                return
            }
            const name = hit.corner?.name
            if (name === 'nw-resize' || name === 'se-resize') {
                this.domElement.style.cursor = 'nwse-resize'
            } else if (name === 'ne-resize' || name === 'sw-resize') {
                this.domElement.style.cursor = 'nesw-resize'
            } else if (name === 'n-resize' || name === 's-resize') {
                this.domElement.style.cursor = 'ns-resize'
            } else if (name === 'e-resize' || name === 'w-resize') {
                this.domElement.style.cursor = 'ew-resize'
            }
        }
        this.domElement.addEventListener('mousemove', this._onHover, false)
    }

    private _detachHoverListener(): void {
        if (!this._onHover) return
        this.domElement.removeEventListener('mousemove', this._onHover, false)
        this._onHover = null
    }

    private _onPointerMove(e: MouseEvent): void {
        if (!this.interaction) return
        if (this.interaction.mode === 'scale') this._scaleMove(e)
        else if (this.interaction.mode === 'rotate') this._rotateMove(e)
    }

    private _scaleMove(e: MouseEvent): void {
        if (!this.interaction || this.interaction.mode !== 'scale') return
        if (!this.currentAdapter) return
        const {
            corner,
            startSurface,
            initialWidth,
            initialHeight,
            initialPosition,
            initialRotation,
        } = this.interaction
        const surface = this.zui.clientToSurface(e.clientX, e.clientY)

        let deltaX = surface.x - startSurface.x
        let deltaY = surface.y - startSurface.y

        if (initialRotation !== 0) {
            const cos = Math.cos(-initialRotation)
            const sin = Math.sin(-initialRotation)
            const rx = deltaX * cos - deltaY * sin
            const ry = deltaX * sin + deltaY * cos
            deltaX = rx
            deltaY = ry
        }

        let newWidth = initialWidth
        let newHeight = initialHeight
        switch (corner.name) {
            case 'se-resize':
                newWidth = initialWidth + deltaX
                newHeight = initialHeight + deltaY
                break
            case 'sw-resize':
                newWidth = initialWidth - deltaX
                newHeight = initialHeight + deltaY
                break
            case 'ne-resize':
                newWidth = initialWidth + deltaX
                newHeight = initialHeight - deltaY
                break
            case 'nw-resize':
                newWidth = initialWidth - deltaX
                newHeight = initialHeight - deltaY
                break
            case 'n-resize':
                newHeight = initialHeight - deltaY
                break
            case 's-resize':
                newHeight = initialHeight + deltaY
                break
            case 'e-resize':
                newWidth = initialWidth + deltaX
                break
            case 'w-resize':
                newWidth = initialWidth - deltaX
                break
            default:
                break
        }

        let scaleX = newWidth / initialWidth
        let scaleY = newHeight / initialHeight

        const isEdgeOnly = [
            'n-resize',
            's-resize',
            'e-resize',
            'w-resize',
        ].includes(corner.name)
        if (e.shiftKey && !isEdgeOnly) {
            const ratio = Math.min(Math.abs(scaleX), Math.abs(scaleY))
            scaleX = scaleX >= 0 ? ratio : -ratio
            scaleY = scaleY >= 0 ? ratio : -ratio
            newWidth = initialWidth * scaleX
            newHeight = initialHeight * scaleY
        }

        const minW = this.currentAdapter.minWidth ?? MIN_SCALE_DIMENSION
        const minH = this.currentAdapter.minHeight ?? MIN_SCALE_DIMENSION

        // Shape-with-text: width is user-driven, height auto-fits the
        // reflowed lines. The shape may be squeezed until each line holds
        // just its widest single character (1 char/line) — but no further.
        const meta = this.currentGroup?.elementData?.metadata
        const rawText =
            meta && typeof meta.textContent === 'string'
                ? meta.textContent
                : ''
        const hasShapeText =
            !!this.currentTextLayer && !!meta?.hasText && rawText.length > 0

        if (hasShapeText) {
            const kind = this.currentGroup?.elementData?.componentType
            const { style, font } = shapeTextStyleFromMeta(meta)
            const textMinW = minShapeWidthForText(kind, rawText, font)
            if (Math.abs(newWidth) < Math.max(minW, textMinW)) return

            const reflow = reflowTextForShape(
                kind,
                Math.abs(newWidth),
                rawText,
                font
            )
            // Force the height to fit the wrapped lines (auto vertical
            // adjust), preserving the drag direction's sign.
            const signH = newHeight < 0 ? -1 : 1
            newHeight =
                signH * Math.max(Math.abs(newHeight), reflow.requiredHeight)
            // Recompute scales so the anchored corner stays put for the
            // (possibly taller) shape.
            scaleX = newWidth / initialWidth
            scaleY = newHeight / initialHeight

            renderShapeTextLayer(
                this.two,
                this.currentGroup,
                reflow.lines,
                style
            )
        } else if (
            Math.abs(newWidth) < minW ||
            Math.abs(newHeight) < minH
        ) {
            return
        }

        const anchorOffsetX = (initialWidth * (scaleX - 1)) / 2
        const anchorOffsetY = (initialHeight * (scaleY - 1)) / 2

        let adjustX = 0
        let adjustY = 0
        switch (corner.name) {
            case 'nw-resize':
                adjustX = -anchorOffsetX
                adjustY = -anchorOffsetY
                break
            case 'ne-resize':
                adjustX = anchorOffsetX
                adjustY = -anchorOffsetY
                break
            case 'sw-resize':
                adjustX = -anchorOffsetX
                adjustY = anchorOffsetY
                break
            case 'se-resize':
                adjustX = anchorOffsetX
                adjustY = anchorOffsetY
                break
            case 'n-resize':
                adjustX = 0
                adjustY = -anchorOffsetY
                break
            case 's-resize':
                adjustX = 0
                adjustY = anchorOffsetY
                break
            case 'e-resize':
                adjustX = anchorOffsetX
                adjustY = 0
                break
            case 'w-resize':
                adjustX = -anchorOffsetX
                adjustY = 0
                break
            default:
                break
        }

        let nextX: number, nextY: number
        if (initialRotation !== 0) {
            const cos = Math.cos(initialRotation)
            const sin = Math.sin(initialRotation)
            nextX = initialPosition.x + (adjustX * cos - adjustY * sin)
            nextY = initialPosition.y + (adjustX * sin + adjustY * cos)
        } else {
            nextX = initialPosition.x + adjustX
            nextY = initialPosition.y + adjustY
        }

        if (e.altKey) {
            nextX = initialPosition.x
            nextY = initialPosition.y
        }

        this.currentAdapter.applySize(this.currentShape, newWidth, newHeight)
        this.currentGroup.translation.set(nextX, nextY)
        this.syncToTarget()
        this.two.update()
    }

    private _rotateMove(e: MouseEvent): void {
        if (!this.interaction || this.interaction.mode !== 'rotate') return
        const { center, startSurface, initialRotation } = this.interaction
        const surface = this.zui.clientToSurface(e.clientX, e.clientY)
        const startAngle = Math.atan2(
            startSurface.y - center.y,
            startSurface.x - center.x
        )
        const currentAngle = Math.atan2(
            surface.y - center.y,
            surface.x - center.x
        )
        this.currentGroup.rotation =
            initialRotation + (currentAngle - startAngle)
        this.syncToTarget()
        this.two.update()
    }

    private _onPointerUp(_e: MouseEvent): void {
        if (!this.interaction) {
            this._detachPointerStream()
            return
        }

        const componentId = this.currentGroup?.elementData?.id
        if (
            this.interaction.mode === 'scale' &&
            componentId &&
            this.currentAdapter
        ) {
            const { width, height } = this.currentAdapter.getLocalSize(
                this.currentShape
            )
            const patch = {
                width: parseInt(String(width)),
                height: parseInt(String(height)),
                x: parseInt(String(this.currentGroup.translation.x)),
                y: parseInt(String(this.currentGroup.translation.y)),
            }
            this.callbacks.commit(componentId, patch)
        }

        this.interaction = null
        this._detachPointerStream()
    }
}
