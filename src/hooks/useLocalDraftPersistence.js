import { useState, useEffect, useRef } from 'react'
import {
    DRAFT_STORAGE_KEY,
    DRAFT_EXPIRY_MS,
    BACKGROUND_BOARD_STORAGE_KEY,
    STORAGE_QUOTA_ERROR_NAME,
    GROUP_COMPONENT,
} from '../constants/misc'

export function useLocalDraftPersistence({
    isPersisted,
    localBoardId,
    componentStore,
    setComponentStore,
    backgroundBoardIdRef,
    setBackgroundBoardId,
    onStorageLimitRef,
} = {}) {
    const [showStorageLimitModal, setShowStorageLimitModal] = useState(false)
    const [storageLimitBoardUrl, setStorageLimitBoardUrl] = useState(null)
    const draftSaveTimerRef = useRef(null)

    // Restore draft and background board ID from localStorage on mount (local mode only)
    useEffect(() => {
        if (isPersisted) return

        const savedBgBoardId = localStorage.getItem(BACKGROUND_BOARD_STORAGE_KEY)
        if (savedBgBoardId) {
            backgroundBoardIdRef.current = savedBgBoardId
            setBackgroundBoardId(savedBgBoardId)
        }

        try {
            const draft = localStorage.getItem(DRAFT_STORAGE_KEY)
            if (draft) {
                const parsed = JSON.parse(draft)
                const age = Date.now() - (parsed.timestamp || 0)
                if (age < DRAFT_EXPIRY_MS && parsed.components) {
                    const safeComponents = Object.fromEntries(
                        Object.entries(parsed.components).filter(
                            ([, v]) => v?.componentType !== GROUP_COMPONENT
                        )
                    )
                    setComponentStore(safeComponents)
                } else {
                    localStorage.removeItem(DRAFT_STORAGE_KEY)
                    localStorage.removeItem(BACKGROUND_BOARD_STORAGE_KEY)
                }
            }
        } catch (e) {
            localStorage.removeItem(DRAFT_STORAGE_KEY)
            localStorage.removeItem(BACKGROUND_BOARD_STORAGE_KEY)
        }
    }, [])

    // Save draft to localStorage on changes (debounced, local mode only)
    useEffect(() => {
        if (isPersisted) return
        if (Object.keys(componentStore).length === 0) return

        if (draftSaveTimerRef.current) {
            clearTimeout(draftSaveTimerRef.current)
        }
        draftSaveTimerRef.current = setTimeout(() => {
            try {
                const componentsToSave = Object.fromEntries(
                    Object.entries(componentStore).filter(
                        ([, v]) => v?.componentType !== GROUP_COMPONENT
                    )
                )
                localStorage.setItem(
                    DRAFT_STORAGE_KEY,
                    JSON.stringify({
                        boardId: localBoardId,
                        components: componentsToSave,
                        timestamp: Date.now(),
                    })
                )
            } catch (e) {
                if (e instanceof DOMException && e.name === STORAGE_QUOTA_ERROR_NAME) {
                    onStorageLimitRef?.current?.()
                }
            }
        }, 500)

        return () => {
            if (draftSaveTimerRef.current) {
                clearTimeout(draftSaveTimerRef.current)
            }
        }
    }, [componentStore, isPersisted])

    const handleStartNewCanvas = () => {
        localStorage.removeItem(DRAFT_STORAGE_KEY)
        setShowStorageLimitModal(false)
        setStorageLimitBoardUrl(null)
        window.location.href = '/'
    }

    const handleContinueOnSavedBoard = () => {
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
