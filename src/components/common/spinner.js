import React from 'react'

const Spinner = ({ displayText }) => {
    return (
        <>
            <div>{displayText ? displayText : 'Loading components ...'}</div>
        </>
    )
}

export default Spinner
