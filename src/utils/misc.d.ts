import type { RandomUsername } from '../types/board'

export declare const generateRandomUsernames: () => RandomUsername

// Remaining exports in misc.js stay JS-inferred until Stage 2 converts this
// file. Declaring them here would shadow the JS exports and force a redo.
