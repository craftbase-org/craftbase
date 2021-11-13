import React from 'react'
import { Redirect } from 'react-router-dom'

const HomePage = (props) => {
    return (
        <>
            <Redirect to={`/board/03a3706e-fe79-4df5-80f6-2f4040ade05f`} />
        </>
    )
}

export default HomePage
