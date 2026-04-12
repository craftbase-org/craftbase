import React, { Suspense } from 'react'
import ErrorBoundary from './errorBoundary'
import Spinner from 'components/common/spinner'

const SupportPage = React.lazy(() => import('./support'))

const SupportViewContainer = (props) => (
    <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
            <SupportPage {...props} />
        </ErrorBoundary>
    </Suspense>
)

export default SupportViewContainer
