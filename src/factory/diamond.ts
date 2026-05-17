import Two from 'two.js'
import Main from './main'
import { strokeTypeToDashes } from '../utils/misc'

// Two.js commands (move/curve/line) live on the Two namespace at runtime but
// aren't typed in @types/two.js as cleanly as we need. Cast through unknown so
// the per-anchor command assignments below stay type-safe-ish without churn.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const C: any = (Two as any).Commands

export interface DiamondProperties {
    fill?: string
    width?: number
    height?: number
    stroke?: string
    linewidth?: number | null
    strokeType?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnchorLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PathLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any

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
function makeAnchors(): AnchorLike[] {
    const anchors: AnchorLike[] = []
    for (let i = 0; i < 9; i++) {
        anchors.push(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new (Two as any).Anchor(0, 0, 0, 0, 0, 0, i === 0 ? C.move : C.curve)
        )
    }
    anchors[8].command = C.line
    return anchors
}

function setAnchor(
    a: AnchorLike,
    x: number,
    y: number,
    lx: number,
    ly: number,
    rx: number,
    ry: number
): void {
    a.x = x
    a.y = y
    a.controls.left.set(lx, ly)
    a.controls.right.set(rx, ry)
}

function applyDiamondGeometry(
    path: PathLike,
    w: number,
    h: number,
    r: number
): void {
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

interface SizeState {
    w: number
    h: number
    r: number
}

function attachSizeAccessors(path: PathLike, state: SizeState): void {
    Object.defineProperty(path, 'width', {
        configurable: true,
        enumerable: true,
        get(): number {
            return state.w
        },
        set(v: number): void {
            state.w = v
            applyDiamondGeometry(path, state.w, state.h, state.r)
        },
    })
    Object.defineProperty(path, 'height', {
        configurable: true,
        enumerable: true,
        get(): number {
            return state.h
        },
        set(v: number): void {
            state.h = v
            applyDiamondGeometry(path, state.w, state.h, state.r)
        },
    })
}

// Reusable factory for both the React component and the drag-to-place
// preview path in newCanvas.js. Returns a Two.Path with width/height
// accessors that rebuild the diamond geometry on assignment.
export function createDiamondPath(
    two: TwoLike,
    w = 160,
    h = 160,
    r = 6
): PathLike {
    const state: SizeState = { w, h, r }
    // NOTE: do NOT use `two.makePath(...)` — its signature only honors the
    // last boolean (open/closed) and discards the curved/manual flags,
    // which causes Path to default to `automatic=true` and overwrite our
    // per-vertex commands to `line` (flat chamfers). Construct Path
    // directly with closed=true, curved=false, manual=true so our anchor
    // commands and control handles are preserved verbatim.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const path = new (Two as any).Path(makeAnchors(), true, false, true)
    two.add(path)
    attachSizeAccessors(path, state)
    applyDiamondGeometry(path, state.w, state.h, state.r)
    return path
}

export default class DiamondFactory extends Main<DiamondProperties> {
    createElement(): { group: PathLike; diamond: PathLike } {
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
        group.translation.x = parseInt(String(prevX))
        group.translation.y = parseInt(String(prevY))

        return { group, diamond }
    }
}
