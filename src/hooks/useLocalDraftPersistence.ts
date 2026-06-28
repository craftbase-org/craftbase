import { useState, useEffect, useRef } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import {
    DRAFT_STORAGE_KEY,
    DRAFT_EXPIRY_MS,
    BACKGROUND_BOARD_STORAGE_KEY,
    STORAGE_QUOTA_ERROR_NAME,
    GROUP_COMPONENT,
    WELCOME_DISMISSED_KEY,
} from '../constants/misc'
import type { ComponentStore } from '../types/board'
import {
    buildWelcomeSketch,
    isWelcomeComponent,
} from '../utils/welcomeSketch'

export interface LocalDraftPersistenceOptions {
    isPersisted: boolean
    localBoardId: string
    componentStore: ComponentStore
    setComponentStore: Dispatch<SetStateAction<ComponentStore>>
    backgroundBoardIdRef: MutableRefObject<string | null>
    setBackgroundBoardId: Dispatch<SetStateAction<string | null>>
    onStorageLimitRef?: MutableRefObject<(() => void) | null>
    /** Opt-in onboarding seed; see BoardProps.welcomeSketch. */
    welcomeSketch?: boolean
    /**
     * Forwarded to `buildWelcomeSketch` to pick the mobile vs. large-screen
     * layout. The mobile layout points "Pick a shape" at the bottom-left
     * toolbar instead of the top-center one and drops the zoom arrow.
     */
    isMobile?: boolean
}

export interface LocalDraftPersistenceApi {
    showStorageLimitModal: boolean
    setShowStorageLimitModal: Dispatch<SetStateAction<boolean>>
    storageLimitBoardUrl: string | null
    setStorageLimitBoardUrl: Dispatch<SetStateAction<string | null>>
    handleStartNewCanvas: () => void
    handleContinueOnSavedBoard: () => void
}

interface PersistedDraft {
    boardId?: string
    components?: ComponentStore
    timestamp?: number
}

export function useLocalDraftPersistence({
    isPersisted,
    localBoardId,
    componentStore,
    setComponentStore,
    backgroundBoardIdRef,
    setBackgroundBoardId,
    onStorageLimitRef,
    welcomeSketch,
    isMobile,
}: LocalDraftPersistenceOptions): LocalDraftPersistenceApi {
    const [showStorageLimitModal, setShowStorageLimitModal] = useState(false)
    const [storageLimitBoardUrl, setStorageLimitBoardUrl] = useState<
        string | null
    >(null)
    const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Restore draft and background board ID from localStorage on mount (local mode only)
    useEffect(() => {
        if (isPersisted) return

        const savedBgBoardId = localStorage.getItem(BACKGROUND_BOARD_STORAGE_KEY)
        if (savedBgBoardId) {
            backgroundBoardIdRef.current = savedBgBoardId
            setBackgroundBoardId(savedBgBoardId)
        }

        let restoredDraft = false
        try {
            const draft = localStorage.getItem(DRAFT_STORAGE_KEY)
            if (draft) {
                const parsed = JSON.parse(draft) as PersistedDraft
                const age = Date.now() - (parsed.timestamp ?? 0)
                if (age < DRAFT_EXPIRY_MS && parsed.components) {
                    const safeComponents = Object.fromEntries(
                        Object.entries(parsed.components).filter(
                            ([, v]) => v?.componentType !== GROUP_COMPONENT
                        )
                    ) as ComponentStore
                    if (Object.keys(safeComponents).length > 0) {
                        setComponentStore(safeComponents)
                        restoredDraft = true
                    }
                } else {
                    localStorage.removeItem(DRAFT_STORAGE_KEY)
                    localStorage.removeItem(BACKGROUND_BOARD_STORAGE_KEY)
                }
            }
        } catch {
            localStorage.removeItem(DRAFT_STORAGE_KEY)
            localStorage.removeItem(BACKGROUND_BOARD_STORAGE_KEY)
        }

        // First-visit welcome seed: only when opt-in flag is set, no draft was
        // restored, and the user has not previously dismissed the sketch on
        // this browser profile.
        if (
            welcomeSketch &&
            !restoredDraft &&
            !localStorage.getItem(WELCOME_DISMISSED_KEY)
        ) {
            setComponentStore(
                buildWelcomeSketch(localBoardId, {
                    width: window.innerWidth,
                    height: window.innerHeight,
                    isMobile,
                })
            )
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Save draft to localStorage on changes (debounced, local mode only)
    useEffect(() => {
        if (isPersisted) return
        if (Object.keys(componentStore).length === 0) return

        const writeDraft = (): void => {
            try {
                // Skip groupobject (transient) AND welcome-sketch seeds — the
                // sketch is onboarding scaffolding that must never persist
                // into the user's draft.
                const componentsToSave = Object.fromEntries(
                    Object.entries(componentStore).filter(
                        ([, v]) =>
                            v?.componentType !== GROUP_COMPONENT &&
                            !isWelcomeComponent(v)
                    )
                ) as ComponentStore
                if (Object.keys(componentsToSave).length === 0) return
                localStorage.setItem(
                    DRAFT_STORAGE_KEY,
                    JSON.stringify({
                        boardId: localBoardId,
                        components: componentsToSave,
                        timestamp: Date.now(),
                    })
                )
            } catch (e) {
                if (
                    e instanceof DOMException &&
                    e.name === STORAGE_QUOTA_ERROR_NAME
                ) {
                    onStorageLimitRef?.current?.()
                }
            }
        }

        if (draftSaveTimerRef.current) {
            clearTimeout(draftSaveTimerRef.current)
        }
        draftSaveTimerRef.current = setTimeout(writeDraft, 500)

        // Flush the pending save synchronously if the page is being hidden
        // (reload / navigation). Without this, a reload fired inside the 500ms
        // debounce window drops the latest change — most visibly a theme-toggle
        // recolor — so the next load restores the stale pre-change colors (e.g.
        // dark shapes after switching to light then quickly reloading).
        const flushDraftSave = (): void => {
            if (draftSaveTimerRef.current) {
                clearTimeout(draftSaveTimerRef.current)
                draftSaveTimerRef.current = null
            }
            writeDraft()
        }
        window.addEventListener('pagehide', flushDraftSave)

        return (): void => {
            if (draftSaveTimerRef.current) {
                clearTimeout(draftSaveTimerRef.current)
            }
            window.removeEventListener('pagehide', flushDraftSave)
        }
    }, [componentStore, isPersisted])

    const handleStartNewCanvas = (): void => {
        localStorage.removeItem(DRAFT_STORAGE_KEY)
        setShowStorageLimitModal(false)
        setStorageLimitBoardUrl(null)
        window.location.href = '/'
    }

    const handleContinueOnSavedBoard = (): void => {
        setShowStorageLimitModal(false)
        if (storageLimitBoardUrl) {
            window.location.href = storageLimitBoardUrl
        }
    }

    return {
        showStorageLimitModal,
        setShowStorageLimitModal,
        storageLimitBoardUrl,
        setStorageLimitBoardUrl,
        handleStartNewCanvas,
        handleContinueOnSavedBoard,
    }
}
