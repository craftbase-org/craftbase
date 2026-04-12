import React from 'react'

class ErrorBoundarySupportView extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {}

    render() {
        if (this.state.hasError) {
            return <h1>Couldn't load support page. Something went wrong</h1>
        }
        return this.props.children
    }
}

export default ErrorBoundarySupportView
