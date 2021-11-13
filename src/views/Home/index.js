import React, { Suspense } from 'react'
import ErrorBoundary from './errorBoundary'
import Spinner from 'components/common/spinner'

const HomePage = React.lazy(() => import('./home'))

const HomePageViewContainer = (props) => (
    <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
            <HomePage {...props} />
        </ErrorBoundary>
    </Suspense>
)

export default HomePageViewContainer
