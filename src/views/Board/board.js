import React, { useState } from 'react'
import { useSubscription, useQuery } from '@apollo/client'

import { GET_BOARD_DATA } from 'schema/subscriptions'
import Canvas from '../../newCanvas'
import Sidebar from 'components/sidebar/primary'
import Spinner from 'components/common/spinner'

const BoardViewPage = (props) => {
    const boardId = props.match.params.boardId
    const {
        loading: getBoardDataLoading,
        error: getBoardDataError,
        data: getBoardDataSuccess,
    } = useSubscription(GET_BOARD_DATA, { variables: { id: boardId } })
    const [selectPanMode, setSelectPanMode] = useState(false)

    const changeSelectMode = () => {
        let prevSelectPanMode = selectPanMode
        setSelectPanMode(!prevSelectPanMode)
    }

    // if (getBoardDataLoading) {
    //     return (
    //         <>
    //             <Spinner displayText={'Loading data'} />
    //         </>
    //     )
    // }

    if (getBoardDataError) {
        return (
            <>
                <div>Something went wrong while rendering board</div>
            </>
        )
    }

    let dummyComponentData = [
        {
            id: '2d599d5e-dc89-4d92-83e8-5ad6dc06bd4d',
            componentType: 'circle',
        },
        // {
        //     id: '9021dad1-cc07-4462-9c7d-04599427c088',
        //     componentType: 'rectangle',
        // },
        {
            id: 'ab357112-d505-4512-8550-e24888217221',
            componentType: 'arrowLine',
        },
    ]

    // console.log('getBoardDataSuccess', getBoardDataSuccess)
    return (
        <>
            <div>
                <Sidebar
                    selectCursorMode={selectPanMode}
                    changeSelectMode={changeSelectMode}
                />
                <Canvas
                    selectPanMode={selectPanMode}
                    componentData={dummyComponentData}
                />
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

export default BoardViewPage
