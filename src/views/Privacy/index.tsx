import React, { Suspense } from 'react'
import ErrorBoundary from './errorBoundary'
import Spinner from '../../components/common/spinner'

const PrivacyPage = React.lazy(() => import('./privacy'))

const PrivacyViewContainer: React.FC = (props) => (
    <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
            <PrivacyPage {...props} />
        </ErrorBoundary>
    </Suspense>
)

export default PrivacyViewContainer
