import React, { Suspense } from 'react'

import ErrorBoundary from './errorBoundary'
import Spinner from '../../components/common/spinner'
import './index.css'
import type { BoardProps } from '../../types/board'

const BoardViewPage = React.lazy(() => import('./board'))

const BoardViewContainer: React.FC<BoardProps> = (props) => (
    <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
            <BoardViewPage {...props} />
        </ErrorBoundary>
    </Suspense>
)

export default BoardViewContainer
