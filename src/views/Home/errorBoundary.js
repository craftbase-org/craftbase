import React from 'react'

class ErrorBoundaryHomePageView extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        // sentry.post()
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return <h1>Couldn't load home page view. Something went wrong</h1>
        }

        return this.props.children
    }
}

export default ErrorBoundaryHomePageView
