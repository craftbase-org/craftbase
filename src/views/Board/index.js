import React, { Suspense } from 'react'
import ErrorBoundary from './errorBoundary'
import Spinner from 'components/common/spinner'

const BoardViewPage = React.lazy(() => import('./board'))

const BoardViewContainer = (props) => (
    <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
            <BoardViewPage {...props} />
        </ErrorBoundary>
    </Suspense>
)

export default BoardViewContainer
