import React, { useState } from 'react'

import Canvas from './newCanvas'
import Sidebar from 'components/sidebar/primary'

const Dashboard = (props) => {
    const [selectPanMode, setSelectPanMode] = useState(false)

    const changeSelectMode = () => {
        let prevSelectPanMode = selectPanMode
        setSelectPanMode(!prevSelectPanMode)
    }

    return (
        <>
            <div>
                <Sidebar
                    selectCursorMode={selectPanMode}
                    changeSelectMode={changeSelectMode}
                />
                <Canvas selectPanMode={selectPanMode} componentData={[]} />
            </div>
        </>
    )
}

// class Dashboard extends Component {
//     constructor(props) {
//         super(props)
//         this.state = {
//             selectPanMode: false,
//         }
//     }

//     changeSelectMode = () => {
//         console.log('on change select mode', this.state.selectPanMode)

//         this.setState({ selectPanMode: !this.state.selectPanMode })
//     }

//     render() {
//         return (
//             <div>
//                 <Sidebar
//                     selectCursorMode={this.state.selectPanMode}
//                     changeSelectMode={this.changeSelectMode}
//                 />
//                 <Canvas selectPanMode={this.state.selectPanMode} />
//             </div>
//         )
//     }
// }

export default Dashboard
