import type { ReactElement } from 'react'
import './craftbaseLoader.css'

interface CraftbaseLoaderProps {
    caption?: string
}

/**
 * Full-screen startup loader using the Craftbase favicon brackets, sketched
 * on (Variant A). Used for the `AppInit` startup gate and the board's Suspense
 * fallback. A pure-CSS copy is also inlined into `#root` in index.html so the
 * loader paints before the JS bundle arrives — keep the two in sync.
 */
const CraftbaseLoader = ({
    caption = 'setting up your canvas',
}: CraftbaseLoaderProps): ReactElement => {
    return (
        <div className="cb-loader" role="status" aria-label="Loading Craftbase">
            <svg className="cb-mark" viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="4,9 4,4 9,4" />
                <polyline points="15,4 20,4 20,9" />
                <polyline points="4,15 4,20 9,20" />
            </svg>
            <div className="cb-wordmark">Craftbase</div>
            {caption ? <div className="cb-caption">{caption}</div> : null}
        </div>
    )
}

export default CraftbaseLoader
