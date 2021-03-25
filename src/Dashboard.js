import React, { Component } from 'react'
import Canvas from './Canvas'
import Sidebar from 'components/sidebar/primary'

class Dashboard extends Component {
    constructor(props) {
        super(props)
        this.state = {
            selectCursorMode: true,
        }
    }

    changeSelectMode = () => {
        console.log('on change select mode', this.state.selectCursorMode)
        this.setState({ selectCursorMode: !this.state.selectCursorMode })
    }

    render() {
        return (
            <div>
                <Sidebar
                    selectCursorMode={this.state.selectCursorMode}
                    changeSelectMode={this.changeSelectMode}
                />
                <Canvas selectCursorMode={this.state.selectCursorMode} />
            </div>
        )
    }
}

export default Dashboard
