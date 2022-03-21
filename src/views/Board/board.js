import React, { useState, useEffect } from 'react'
import { useSubscription, useMutation } from '@apollo/client'

import { GET_BOARD_DATA } from 'schema/subscriptions'
import { INSERT_USER_ONE } from 'schema/mutations'
import Canvas from '../../newCanvas'
import Sidebar from 'components/sidebar/primary'
import Spinner from 'components/common/spinner'
import { generateRandomUsernames } from 'utils/misc'

const BoardViewPage = (props) => {
    const boardId = props.match.params.boardId
    const {
        loading: getBoardDataLoading,
        error: getBoardDataError,
        data: getBoardData,
    } = useSubscription(GET_BOARD_DATA, {
        variables: { boardId: boardId },
        fetchPolicy: 'network-only',
    })
    const [
        insertUser,
        {
            loading: insertUserLoading,
            data: insertUserData,
            error: insertUserError,
            reset: resetInsertUserMutation,
        },
    ] = useMutation(INSERT_USER_ONE)
    const [lastAddedElement, setLastAddedElement] = useState(null)

    useEffect(() => {
        const userId = localStorage.getItem('userId')
        if (userId === null) {
            const { nickname, firstName, lastName } = generateRandomUsernames()
            insertUser({
                variables: {
                    object: {
                        nickname,
                        firstName,
                        lastName,
                    },
                },
            })
        }
    }, [])

    if (getBoardDataLoading) {
        return (
            <>
                <Spinner displayText={'Loading data'} />
            </>
        )
    }

    if (insertUserData) {
        const userId = insertUserData.user.id

        localStorage.setItem('userId', userId)
        console.log('insertUserData', insertUserData)
        window.location.reload()
    }

    // if (getBoardDataError) {
    //     return (
    //         <>
    //             <div>Something went wrong while rendering board</div>
    //         </>
    //     )
    // }

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

    console.log(
        'getBoardData.components',
        getBoardData?.components
        // getBoardData.boardData.components
    )

    const updateLastAddedElement = (obj) => {
        setLastAddedElement(obj)
        document.getElementById('main-two-root').style.cursor = 'grabbing'
    }

    return (
        <>
            <div>
                <Sidebar
                    selectCursorMode={false}
                    {...props}
                    updateLastAddedElement={updateLastAddedElement}
                    boardData={getBoardData?.components}
                />
                {/* <div className="w-full relative flex items-center justify-center">
                    <div
                        className=" fixed top-4  w-64 h-10 bg-neutrals-n900 text-white 
                px-2 py-2
                rounded-md text-base
                "
                    >
                        Click anywhere to insert element{' '}
                    </div>
                </div> */}
                <Canvas
                    selectPanMode={false}
                    boardId={boardId}
                    lastAddedElement={lastAddedElement}
                    componentData={getBoardData?.components}
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
