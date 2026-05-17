import React, { type ReactNode } from 'react'

interface Props {
    children?: ReactNode
}

interface State {
    hasError: boolean
}

class ErrorBoundaryHomePageView extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(_error: unknown): State {
        return { hasError: true }
    }

    override componentDidCatch(
        _error: Error,
        _errorInfo: React.ErrorInfo
    ): void {
        // sentry.post()
    }

    override render(): ReactNode {
        if (this.state.hasError) {
            return <h1>Couldn't load home page view. Something went wrong</h1>
        }

        return this.props.children
    }
}

export default ErrorBoundaryHomePageView
