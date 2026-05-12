// Single source of truth for craftbase's public surface types.
//
// During the JS → TS migration these are intentionally loose where they need
// to be: many fields carry internal handlers whose precise signatures live in
// still-JS hook/board files. Later stages will tighten function signatures
// in-place when those source files convert (hooks: Stage 4, board: Stage 10).
//
// Consumers (e.g. craftmaps) should rely on:
//   - BoardProps  — props accepted by the exported <Board /> component
//   - BoardContextValue — shape returned by useBoardContext()
//   - ComponentRecord — shape of a single component in the persisted store

import type { ReactNode, MutableRefObject } from 'react'
import type Two from 'two.js'

// --- DB shape (mirrors CLAUDE.md "Component schema (from DB)") ----------

export interface ComponentMetadata {
    [key: string]: unknown
}

export interface ComponentRecord {
    id: string
    componentType: string
    x: number
    y: number
    x1: number
    x2: number
    y1: number
    y2: number
    width: number
    height: number
    fill: string
    stroke: string | null
    linewidth: number | null
    strokeType: string | null
    radius: number | null
    iconStroke: string | null
    textColor: string | null
    boardId: string | null
    boardName: string | null
    metadata: ComponentMetadata | null
    children: unknown | null
    isDummy: boolean | null
    updatedBy: string | null
    createdAt: number | null
}

export type ComponentStore = Record<string, ComponentRecord>

// --- Consumer-facing props on <Board /> --------------------------------

export interface CameraChangeEvent {
    scale: number
    tx: number
    ty: number
}

export interface BoardProps {
    /** Fired on ZUI camera updates. See CLAUDE.md "Extension points over forks". */
    onCameraChange?: (event: CameraChangeEvent) => void
    /** Render slot mounted between #selector-rect and #main-two-root. */
    renderBackground?: () => ReactNode
    /** Overrides the zoom-readout shown in ZoomControls. */
    scaleToDisplay?: (scale: number) => string
}

// --- Context value ------------------------------------------------------

// Selected component is a complex Two.js-bound shape produced by the canvas.
// It carries `group.data.elementData` (a ComponentRecord) plus Two.js handles.
// Kept opaque here until canvas/selection internals convert (Stages 7–9).
export type SelectedComponent = unknown
export type SelectedGroup = unknown
export type CurrentElement = unknown

// History entry shape lives in useComponentHistory; tightened in Stage 4.
export type HistoryEntry = unknown

export interface BoardContextValue {
    // Identity / persistence
    boardId: string
    isPersisted: boolean
    persistBoard: () => void
    backgroundBoardId: string | null
    onCreateBoard: () => void
    createBoardLoading: boolean
    clearBoard: () => void

    // Two.js handles
    twoJSInstance: Two | null
    setTwoJSInstanceInBoard: (instance: Two | null) => void
    zuiInBoard: unknown
    setZuiInstanceInBoard: (zui: unknown) => void

    // Drawing modes
    isPencilMode: boolean
    isArrowDrawMode: boolean
    isTextDrawMode: boolean
    isArrowSelected: boolean
    isRubberMode: boolean
    isPanMode: boolean
    togglePencilMode: (...args: unknown[]) => void
    togglePointer: (...args: unknown[]) => void
    togglePanMode: (...args: unknown[]) => void
    setArrowDrawModeInBoard: (value: boolean) => void
    setTextDrawModeInBoard: (value: boolean) => void
    setRubberModeInBoard: (value: boolean) => void
    cancelPendingElement: () => void
    enableTextDrawMode: () => void
    createTextAtSurface: (...args: unknown[]) => void
    updateLastAddedElement: (element: unknown) => void

    // Selection
    selectedComponent: SelectedComponent | null
    setSelectedComponentInBoard: (component: SelectedComponent | null) => void
    selectedGroup: SelectedGroup | null
    currentElement: CurrentElement | null
    setCurrentElementInBoard: (element: CurrentElement | null) => void

    // Local component store mutations
    addToLocalComponentStore: (records: ComponentRecord | ComponentRecord[]) => void
    updateComponentVerticesInLocalStore: (
        id: string,
        update: Partial<ComponentRecord>
    ) => void
    updateComponentBulkPropertiesInLocalStore: (
        id: string,
        update: Partial<ComponentRecord>
    ) => void
    deleteComponentFromLocalStore: (id: string) => void
    deleteBulkComponentsFromLocalStore: (ids: string[]) => void
    stateRefForComponentStore: MutableRefObject<ComponentStore>

    // Property application
    applyProperty: (name: string, value: unknown) => void
    applyGroupProperty: (name: string, value: unknown) => void

    // Element defaults (read sites: ElementPropertiesToolbar, primary sidebar, factories)
    defaultFill: string
    defaultStrokeColor: string
    defaultLinewidth: number
    defaultStrokeType: string | null
    defaultOpacity: number
    defaultTextColor: string
    defaultTextSize: string
    defaultTextFontFamily: string
    setDefaultLinewidthInBoard: (value: number) => void
    setDefaultStrokeTypeInBoard: (value: string | null) => void

    // Mobile toolbar panel
    showMobileToolbarPanel: boolean
    setShowMobileToolbarPanel: (value: boolean | ((prev: boolean) => boolean)) => void

    // Undo history
    historyLog: HistoryEntry[]
    historyLogRef: MutableRefObject<HistoryEntry[]>
    bucketLog: HistoryEntry[]
    bucketLogRef: MutableRefObject<HistoryEntry[]>
    recordBatchToHistoryLog: (entries: HistoryEntry[]) => void
    undoLastAction: () => void
    redoLastAction: () => void

    // Consumer extension points (forwarded from BoardProps)
    scaleToDisplay?: BoardProps['scaleToDisplay']
}

// --- Utility exports ---------------------------------------------------

export interface RandomUsername {
    nickname: string
    firstName: string
    lastName: string
}
