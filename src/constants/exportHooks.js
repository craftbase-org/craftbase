import React from 'react'
import { useMediaQuery } from 'react-responsive'

export const useMediaQueryUtils = () => {
    const isDesktop = useMediaQuery({ minWidth: 1280, maxWidth: 1535 })
    const isLaptop = useMediaQuery({ minWidth: 1024, maxWidth: 1279 })
    const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 })
    const isMobile = useMediaQuery({ maxWidth: 767 })

    return {
        isDesktop,
        isTablet,
        isMobile,
        isLaptop,
    }
}
