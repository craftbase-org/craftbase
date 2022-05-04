import React from 'react'
import SpinnerWithSize from './spinnerWithSize'
const Spinner = ({ displayText }) => {
    return (
        <>
            <div>
                {displayText ? (
                    displayText
                ) : (
                    <SpinnerWithSize
                        loaderSize="sm"
                        // customStyles={{
                        //     margin: 0,
                        //     marginLeft: '4px',
                        //     borderBottomColor: '#ABF5D1',
                        // }}
                    />
                )}
            </div>
        </>
    )
}

export default Spinner
