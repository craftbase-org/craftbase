import Two from 'two.js'
import Main from './main'
import { strokeTypeToDashes } from 'utils/misc'

const C = Two.Commands

// 9 anchors: 2 per vertex (corners) + 1 explicit closing anchor that
// duplicates vertex[0]'s position. The closing anchor draws the final
// straight edge (L → T) — without it Two.js leaves the segment missing
// when `automatic = false`. Mirrors Two.RoundedRectangle's 10-anchor
// approach (vertices[9] copies vertices[8]).
//
// Order clockwise from top:
//   v[0] T_in  (move)         — start point on L→T edge near T
//   v[1] T_out (curve)        — end of T corner; left ctrl points at T
//   v[2] R_in  (curve, line)  — straight edge T→R, no controls
//   v[3] R_out (curve)        — end of R corner
//   v[4] B_in  (curve, line)  — straight edge R→B
//   v[5] B_out (curve)        — end of B corner
//   v[6] L_in  (curve, line)  — straight edge B→L
//   v[7] L_out (curve)        — end of L corner
//   v[8] close (line)         — duplicate of v[0], closes L→T edge
function makeAnchors() {
    const anchors = []
    for (let i = 0; i < 9; i++) {
        anchors.push(
            new Two.Anchor(0, 0, 0, 0, 0, 0, i === 0 ? C.move : C.curve)
        )
    }
    anchors[8].command = C.line
    return anchors
}

function setAnchor(a, x, y, lx, ly, rx, ry) {
    a.x = x
    a.y = y
    a.controls.left.set(lx, ly)
    a.controls.right.set(rx, ry)
}

function applyDiamondGeometry(path, w, h, r) {
    const hw = w / 2
    const hh = h / 2
    const L = Math.hypot(hw, hh)
    if (L === 0) return
    const cr = Math.min(Math.max(r, 0), L * 0.4)
    const insetX = (cr * hw) / L
    const insetY = (cr * hh) / L

    const v = path.vertices
    setAnchor(v[0], -insetX, -hh + insetY, 0, 0, insetX, -insetY)
    setAnchor(v[1], insetX, -hh + insetY, -insetX, -insetY, 0, 0)
    setAnchor(v[2], hw - insetX, -insetY, 0, 0, insetX, insetY)
    setAnchor(v[3], hw - insetX, insetY, insetX, -insetY, 0, 0)
    setAnchor(v[4], insetX, hh - insetY, 0, 0, -insetX, insetY)
    setAnchor(v[5], -insetX, hh - insetY, insetX, insetY, 0, 0)
    setAnchor(v[6], -hw + insetX, insetY, 0, 0, -insetX, -insetY)
    setAnchor(v[7], -hw + insetX, -insetY, -insetX, insetY, 0, 0)
    // Closing anchor — same position as v[0]; line command produces the
    // final L→T straight segment.
    setAnchor(v[8], -insetX, -hh + insetY, 0, 0, 0, 0)

    path._flagVertices = true
}

function attachSizeAccessors(path, state) {
    Object.defineProperty(path, 'width', {
        configurable: true,
        enumerable: true,
        get() {
            return state.w
        },
        set(v) {
            state.w = v
            applyDiamondGeometry(path, state.w, state.h, state.r)
        },
    })
    Object.defineProperty(path, 'height', {
        configurable: true,
        enumerable: true,
        get() {
            return state.h
        },
        set(v) {
            state.h = v
            applyDiamondGeometry(path, state.w, state.h, state.r)
        },
    })
}

// Reusable factory for both the React component and the drag-to-place
// preview path in newCanvas.js. Returns a Two.Path with width/height
// accessors that rebuild the diamond geometry on assignment.
export function createDiamondPath(two, w = 160, h = 160, r = 6) {
    const state = { w, h, r }
    // NOTE: do NOT use `two.makePath(...)` — its signature only honors the
    // last boolean (open/closed) and discards the curved/manual flags,
    // which causes Path to default to `automatic=true` and overwrite our
    // per-vertex commands to `line` (flat chamfers). Construct Path
    // directly with closed=true, curved=false, manual=true so our anchor
    // commands and control handles are preserved verbatim.
    const path = new Two.Path(makeAnchors(), true, false, true)
    two.add(path)
    attachSizeAccessors(path, state)
    applyDiamondGeometry(path, state.w, state.h, state.r)
    return path
}

export default class DiamondFactory extends Main {
    createElement() {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { fill, width, height, stroke, linewidth, strokeType } =
            this.properties

        const diamond = createDiamondPath(two, width || 160, height || 160, 6)
        diamond.fill = fill ? fill : '#fff'
        diamond.stroke = stroke ? stroke : '#3A342C'
        diamond.linewidth =
            linewidth !== null && linewidth !== undefined ? linewidth : 1
        diamond.dashes = strokeTypeToDashes(strokeType)

        const group = two.makeGroup(diamond)
        group.translation.x = parseInt(prevX)
        group.translation.y = parseInt(prevY)

        return { group, diamond }
    }
}
