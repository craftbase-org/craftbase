import type { Context } from 'react'
import type { BoardContextValue } from '../../types/board'

// `BoardContext` is created with `createContext()` (no default), so consumers
// will see `undefined` outside a Provider. `useBoardContext` documents this by
// returning the value typed as `BoardContextValue` — callers must mount under
// <Board /> for it to be defined. Stage 10 will move this into a typed source
// file where we may switch to a strict null-throwing variant.
export declare const BoardContext: Context<BoardContextValue | undefined>

export declare const useBoardContext: () => BoardContextValue

declare const BoardViewPage: import('react').ComponentType<
    import('../../types/board').BoardProps
>
export default BoardViewPage
