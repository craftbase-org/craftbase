import React, { Component } from 'react'
import Canvas from './Canvas'
import Sidebar from 'components/sidebar/primary'

class Dashboard extends Component {
    constructor(props) {
        super(props)
        this.state = {
            selectPanMode: false,
        }
    }

    changeSelectMode = () => {
        console.log('on change select mode', this.state.selectPanMode)

        this.setState({ selectPanMode: !this.state.selectPanMode })
    }

    render() {
        return (
            <div>
                <Sidebar
                    selectCursorMode={this.state.selectPanMode}
                    changeSelectMode={this.changeSelectMode}
                />
                <Canvas selectPanMode={this.state.selectPanMode} />
            </div>
        )
    }
}

export default Dashboard
