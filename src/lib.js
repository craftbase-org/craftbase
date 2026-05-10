// Library entry. Consumers (e.g. craftmaps) import the Board view + a few
// hooks/contexts from here. The standalone craftbase app keeps using its own
// src/index.js — this file is purely the public surface.

export { default as Board } from './views/Board'
export { BoardContext, useBoardContext } from './views/Board/board'

export { useDrawingModes } from './hooks/useDrawingModes'
export { useElementDefaults } from './hooks/useElementDefaults'
export { useMobileToolbarPanels } from './hooks/useMobileToolbarPanels'
export { useLocalDraftPersistence } from './hooks/useLocalDraftPersistence'
export { useComponentHistory } from './hooks/useComponentHistory'
export { useCanvasClipboard } from './hooks/useCanvasClipboard'

// Re-exports for consumer apps that need to set up the same Apollo wiring as
// the standalone craftbase app. Keeps craftmaps from duplicating the user-
// bootstrap mutation or username generator.
export { INSERT_USER_ONE } from './schema/mutations'
export { generateRandomUsernames } from './utils/misc'
