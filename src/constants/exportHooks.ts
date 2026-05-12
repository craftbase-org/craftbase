import { useMediaQuery } from 'react-responsive'

export interface MediaQueryFlags {
    isDesktop: boolean
    isTablet: boolean
    isMobile: boolean
    isLaptop: boolean
}

export const useMediaQueryUtils = (): MediaQueryFlags => {
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
