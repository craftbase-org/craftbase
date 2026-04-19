import React from 'react'
import * as Sentry from '@sentry/react'

class ErrorBoundaryBoardView extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        Sentry.captureException(error, {
            user: { id: localStorage.getItem('userId') },
            contexts: {
                board: { boardId: localStorage.getItem('craftbase_background_board_id') },
            },
            extra: errorInfo,
        })
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return <h1>Couldn't load board view. Something went wrong</h1>
        }

        return this.props.children
    }
}

export default ErrorBoundaryBoardView
