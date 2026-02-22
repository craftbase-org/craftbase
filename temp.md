Plan: Velocity-Based Variable Stroke Width for Pencil Tool

Context

The pencil tool currently draws strokes as a single Two.Path with uniform linewidth, resulting in flat, polygon-like lines. The goal is to make strokes feel natural and sketchy
by varying the stroke width based on drawing velocity: slow = thick, fast = thin.

Since Two.js does not support per-vertex linewidth on a single path, we'll use multiple short path segments, each with its own linewidth derived from velocity. Consecutive
segments with similar widths are merged to keep path count low.

Files to Modify

File: src/utils/pencilHelper.js
Change: Add velocity-to-linewidth mapping, smoothing, and linewidth-aware simplification/merging utilities
────────────────────────────────────────
File: src/newCanvas.js
Change: Rewrite pencil mousedown/mousemove/mouseup to track velocity and create per-segment paths; preserve lw in group selector metadata remapping
────────────────────────────────────────
File: src/factory/pencil.js
Change: Reconstruct strokes as merged multi-path groups; backward-compatible with old {x,y} metadata
────────────────────────────────────────
File: src/components/elements/pencil.js
Change: Adapt to factory returning {group} without a single path
────────────────────────────────────────
File: src/components/elements/groupobject.js
Change: Preserve lw property during metadata remapping (~line 120-144)

Implementation Details

1.  src/utils/pencilHelper.js — New utilities

Add alongside existing simplifyPath and perpendicularDistance:

- velocityToLinewidth(velocity, baseWidth) — Maps px/ms velocity to linewidth using linear interpolation between MAX_WIDTH (baseWidth _ 2.5) at slow speeds and MIN_WIDTH
  (baseWidth _ 0.25) at fast speeds
- smoothLinewidth(prevWidth, targetWidth, factor=0.3) — Exponential moving average to prevent jarring width jumps between consecutive segments
- simplifyWithLinewidth(points, epsilon) — Modified RDP that preserves {x, y, lw} tuples
- mergeSegmentsByLinewidth(points, lwTolerance=0.3) — Groups consecutive points with similar linewidths into longer path segments for performance. Adjacent groups share an
  overlap point to prevent visual gaps

2.  src/newCanvas.js — Drawing flow changes

New variables (in addZUI, near line 88):

- pencilSegments, pencilRawPoints, lastPencilPoint, lastPencilLinewidth, pencilGroup

mousedown (~line 309):

- Create a two.makeGroup() instead of a single path
- Record first point with timestamp via performance.now()

mousemove (~line 685):

- Keep 3px distance throttle
- Compute velocity = distance / time-delta between consecutive points
- Map velocity to linewidth via velocityToLinewidth(), smooth via smoothLinewidth()
- Create a 2-point two.makePath() segment with cap='round', join='round', closed=false
- Add segment to pencilGroup, record point as {x, y, lw} in pencilRawPoints

mouseup (~line 1085):

- Remove live pencilGroup from canvas (React component will re-render from metadata)
- Run simplifyWithLinewidth(pencilRawPoints, 1.5) to reduce point count while keeping lw
- Save component with metadata: [{x, y, lw}, ...]
- Reset all pencil state variables

Group selector (~line 1573-1591):

- Spread lw property through during metadata coordinate remapping: ...(vert.lw !== undefined ? { lw: vert.lw } : {})

3.  src/factory/pencil.js — Reconstruction

- Detect format: if metadata[0].lw !== undefined, use new multi-path rendering
- New format: Call mergeSegmentsByLinewidth() to group points, create one Two.Path per group with averaged linewidth, cap='round', join='round'
- Legacy format: Keep existing single-path behavior unchanged (backward compatible)
- Return { group } (no single path reference)

4.  src/components/elements/pencil.js — Minor adaptation

- Change const { group, path } = elementFactory.createElement() to const { group } = elementFactory.createElement()
- Use group.children[0] as the shape reference for internal state

5.  src/components/elements/groupobject.js — Preserve lw

- In metadata remapping (~line 120-144), spread lw property: ...(vert.lw !== undefined ? { lw: vert.lw } : {})

Performance

- Typical stroke: ~60-80 raw points after distance throttle -> ~20-30 after simplification -> ~8-15 merged path groups
- During live drawing, ~60-80 temporary 2-point segments (removed on mouseup)
- No database schema changes needed (metadata is JSONB)

Verification

1.  Run npm start and open a board
2.  Activate pencil mode and draw strokes at varying speeds
3.  Verify: slow strokes are thick, fast strokes are thin, transitions are smooth
4.  Reload the page — verify strokes reconstruct correctly from saved metadata
5.  Test backward compatibility: existing pencil drawings should render unchanged
6.  Test group selection: select area containing pencil strokes, verify they group/ungroup correctly
    ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
