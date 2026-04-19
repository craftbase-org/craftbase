import Two from 'two.js'

// Shape adapters — how the controller reads/writes dimensions per componentType.
// Only shapes registered here participate in central selection/resize.
// Arrow, pencil, divider intentionally absent — they stay on legacy interactjs
// until we migrate them in a later stage.
const DEFAULT_ADAPTER = {
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

const TEXT_ADAPTER = {
    getLocalSize: (shape) => ({
        width: shape.getBoundingClientRect(true).width || 60,
        height: shape.getBoundingClientRect(true).height || 30,
    }),
    applySize: () => {},
    resizable: false,
    minWidth: 20,
    minHeight: 20,
}

const SHAPE_ADAPTERS = {
    rectangle: DEFAULT_ADAPTER,
    circle: DEFAULT_ADAPTER,
    // newText: TEXT_ADAPTER,
}

const HANDLE_BASE_PX = 10
const CORNER_BASE_PX = 25
const MIN_SCALE_DIMENSION = 20
const SELECTION_PADDING = 5

function buildToolbarState(group, shape) {
    const componentType = group?.elementData?.componentType
    const textChild = group?.children?.find(
        (child) => typeof child.value === 'string'
    )
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

function distSq(ax, ay, bx, by) {
    const dx = ax - bx
    const dy = ay - by
    return dx * dx + dy * dy
}

export default class SelectionController {
    constructor({
        two,
        zui,
        domElement,
        onSelect,
        onDeselect,
        commit,
        recordHistory,
        onDelete,
    }) {
        this.two = two
        this.zui = zui
        this.domElement = domElement
        this.callbacks = {
            onSelect: onSelect || (() => {}),
            onDeselect: onDeselect || (() => {}),
            commit: commit || (() => {}),
            recordHistory: recordHistory || (() => {}),
            onDelete: onDelete || (() => {}),
        }

        this.rotationEnabled = false

        this.targets = new Set()
        this.currentGroup = null
        this.currentShape = null
        this.currentAdapter = null
        this.currentTextChild = null

        this.interaction = null

        this._buildUi()
        this._bindExternal()
    }

    // ---------- UI construction ----------

    _buildUi() {
        const ui = new Two.Group()
        ui.visible = false

        const box = new Two.Rectangle(0, 0, 0, 0)
        box.noFill()
        box.stroke = '#0052CC'
        box.linewidth = 1.5

        // Corner handles: white fill with blue border
        const endpoints = new Two.Points(box.vertices)
        endpoints.size = 10
        endpoints.fill = '#ffffff'
        endpoints.stroke = '#0052CC'
        endpoints.linewidth = 1.5

        // Mid-edge handles (rectangle only)
        this.midPoints = [
            new Two.Vector(0, 0), // n
            new Two.Vector(0, 0), // e
            new Two.Vector(0, 0), // s
            new Two.Vector(0, 0), // w
        ]
        const midEndpoints = new Two.Points(this.midPoints)
        midEndpoints.size = 10
        midEndpoints.fill = '#ffffff'
        midEndpoints.stroke = '#0052CC'
        midEndpoints.linewidth = 1.5
        midEndpoints.visible = false

        ui.add(box, endpoints, midEndpoints)
        this.two.add(ui)

        this.ui = ui
        this.box = box
        this.endpoints = endpoints
        this.midEndpoints = midEndpoints
    }

    _bindExternal() {
        this._onUpdate = () => this.syncToTarget()
        this.two.bind('update', this._onUpdate)

        this._onClearSelector = () => this.detach()
        window.addEventListener('clearSelector', this._onClearSelector, false)

        this._onKeyDown = (e) => {
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

    destroy() {
        this.two.unbind('update', this._onUpdate)
        window.removeEventListener(
            'clearSelector',
            this._onClearSelector,
            false
        )
        window.removeEventListener('keydown', this._onKeyDown, false)
        this._detachPointerStream()
        this.two.remove(this.ui)
    }

    // ---------- Registry ----------

    canHandle(group) {
        const type = group?.elementData?.componentType
        return !!SHAPE_ADAPTERS[type]
    }

    // ---------- Attach / detach ----------

    attach(group, shape) {
        const type = group?.elementData?.componentType
        const adapter = SHAPE_ADAPTERS[type]
        if (!adapter) return false

        if (this.currentGroup && this.currentGroup !== group) {
            this.targets.clear()
        }

        this.currentGroup = group
        this.currentShape = shape || group.children[0]
        this.currentAdapter = adapter
        this.currentTextChild =
            group.children?.find((child) => typeof child.value === 'string') ||
            null
        this.targets.add(group)

        this.ui.visible = true
        this.syncToTarget()
        this.two.update()

        this._attachHoverListener()
        this.callbacks.onSelect(
            buildToolbarState(this.currentGroup, this.currentShape)
        )
        return true
    }

    detach() {
        if (!this.currentGroup) return
        this._detachPointerStream()
        this._detachHoverListener()
        this.targets.clear()
        this.currentGroup = null
        this.currentShape = null
        this.currentAdapter = null
        this.currentTextChild = null
        this.ui.visible = false
        this.domElement.style.cursor = ''
        this.two.update()
        this.callbacks.onDeselect()
    }

    resync() {
        if (this.currentGroup) {
            this.syncToTarget()
            this.two.update()
        }
    }

    // ---------- UI sync ----------

    syncToTarget() {
        if (!this.currentGroup || !this.currentShape || !this.currentAdapter)
            return
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
            this.midPoints[0].set(0, -hh)
            this.midPoints[1].set(hw, 0)
            this.midPoints[2].set(0, hh)
            this.midPoints[3].set(-hw, 0)
        }
    }

    // ---------- Hit testing ----------

    // Returns { mode, corner } in SURFACE coordinates, or null.
    // Radii are scaled by 1 / zui.scale so handles stay grabbable at any zoom.
    hitTest(clientX, clientY) {
        if (!this.currentGroup || !this.ui.visible) return null
        if (this.currentAdapter && !this.currentAdapter.resizable) return null

        const surface = this.zui.clientToSurface(clientX, clientY)
        const scale = this.zui.scale || 1
        const rotateLimit = HANDLE_BASE_PX / scale
        const scaleLimit = CORNER_BASE_PX / scale

        const isRect =
            this.currentGroup?.elementData?.componentType === 'rectangle'
        if (isRect) {
            const midEdge = this._atMidEdge(surface, scaleLimit)
            if (midEdge) return { mode: 'scale', corner: midEdge }
        }

        const corner = this._atCorner(surface, scaleLimit)
        if (!corner) return null

        const isOnInnerRing = this._withinCornerRadius(
            surface,
            corner,
            rotateLimit
        )
        const mode = isOnInnerRing && this.rotationEnabled ? 'rotate' : 'scale'
        return { mode, corner }
    }

    // Returns a vertex's position in surface space (scene-local, pre-zoom).
    // We deliberately avoid Two.Utils.getComputedMatrix here: it would walk
    // up into two.scene whose matrix includes ZUI's zoom/pan, producing
    // client-space coordinates. Our input point is surface-space (via
    // zui.clientToSurface), so both sides must agree on the frame.
    _vertexToSurface(v) {
        const rot = this.ui.rotation || 0
        const cos = Math.cos(rot)
        const sin = Math.sin(rot)
        return {
            x: this.ui.position.x + v.x * cos - v.y * sin,
            y: this.ui.position.y + v.x * sin + v.y * cos,
        }
    }

    _atCorner(point, limit) {
        const verts = this.box.vertices
        const sq = limit * limit
        const corners = [
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

    _atMidEdge(point, limit) {
        const sq = limit * limit
        const edges = [
            { name: 'n-resize', point: this.midPoints[0] },
            { name: 'e-resize', point: this.midPoints[1] },
            { name: 's-resize', point: this.midPoints[2] },
            { name: 'w-resize', point: this.midPoints[3] },
        ]
        for (const edge of edges) {
            const p = this._vertexToSurface(edge.point)
            if (distSq(point.x, point.y, p.x, p.y) < sq) return edge
        }
        return null
    }

    _withinCornerRadius(point, corner, limit) {
        const p = this._vertexToSurface(corner.point)
        return distSq(point.x, point.y, p.x, p.y) < limit * limit
    }

    // ---------- Interaction lifecycle ----------

    beginInteraction(e, hit) {
        if (!this.currentGroup || !hit) return false
        if (hit.mode === 'scale') return this._beginScale(e, hit.corner)
        if (hit.mode === 'rotate' && this.rotationEnabled) {
            return this._beginRotate(e, hit.corner)
        }
        return false
    }

    _beginScale(e, corner) {
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

    _beginRotate(e, corner) {
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

    _attachPointerStream() {
        this._onMove = (ev) => this._onPointerMove(ev)
        this._onUp = (ev) => this._onPointerUp(ev)
        this.domElement.addEventListener('mousemove', this._onMove, false)
        this.domElement.addEventListener('mouseup', this._onUp, false)
    }

    _detachPointerStream() {
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

    _attachHoverListener() {
        if (this._onHover) return
        this._onHover = (ev) => {
            if (this.interaction) return
            const hit = this.hitTest(ev.clientX, ev.clientY)
            if (!hit) {
                this.domElement.style.cursor = ''
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

    _detachHoverListener() {
        if (!this._onHover) return
        this.domElement.removeEventListener('mousemove', this._onHover, false)
        this._onHover = null
    }

    _onPointerMove(e) {
        if (!this.interaction) return
        if (this.interaction.mode === 'scale') this._scaleMove(e)
        else if (this.interaction.mode === 'rotate') this._rotateMove(e)
    }

    _scaleMove(e) {
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

        const isEdgeOnly = ['n-resize', 's-resize', 'e-resize', 'w-resize'].includes(corner.name)
        if (e.shiftKey && !isEdgeOnly) {
            const ratio = Math.min(Math.abs(scaleX), Math.abs(scaleY))
            scaleX = scaleX >= 0 ? ratio : -ratio
            scaleY = scaleY >= 0 ? ratio : -ratio
            newWidth = initialWidth * scaleX
            newHeight = initialHeight * scaleY
        }

        let minW = this.currentAdapter.minWidth ?? MIN_SCALE_DIMENSION
        let minH = this.currentAdapter.minHeight ?? MIN_SCALE_DIMENSION

        if (this.currentTextChild) {
            const bbox = this.currentTextChild._renderer?.elem?.getBBox?.()
            if (bbox && bbox.width > 0) minW = Math.max(minW, bbox.width + 20)
            if (bbox && bbox.height > 0) minH = Math.max(minH, bbox.height + 20)
        }

        if (Math.abs(newWidth) < minW || Math.abs(newHeight) < minH) return

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

        let nextX, nextY
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

    _rotateMove(e) {
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

    _onPointerUp(e) {
        if (!this.interaction) {
            this._detachPointerStream()
            return
        }

        const componentId = this.currentGroup?.elementData?.id
        if (this.interaction.mode === 'scale' && componentId) {
            const { width, height } = this.currentAdapter.getLocalSize(
                this.currentShape
            )
            const patch = {
                width: parseInt(width),
                height: parseInt(height),
                x: parseInt(this.currentGroup.translation.x),
                y: parseInt(this.currentGroup.translation.y),
            }
            this.callbacks.commit(componentId, patch)
        }

        this.interaction = null
        this._detachPointerStream()
    }
}
