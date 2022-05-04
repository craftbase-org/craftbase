import React, { Fragment } from 'react'
import './index.css'

const SpinnerWithSize = (props) => {
    const { loaderSize, color, customStyles } = props
    const renderLoader = () => {
        switch (loaderSize) {
            case 'lg':
                return (
                    <span
                        style={{
                            ...customStyles,
                        }}
                        className="lg-loader loader-3"
                    />
                )
            case 'md':
                return (
                    <span
                        style={{
                            ...customStyles,
                        }}
                        className="md-loader loader-3"
                    />
                )
            case 'sm':
                return (
                    <span
                        style={{
                            ...customStyles,
                        }}
                        className="sm-loader loader-3"
                    />
                )
            case 'xs':
                return (
                    <span
                        style={{
                            ...customStyles,
                        }}
                        className="xs-loader loader-3"
                    />
                )
            default:
                return <span className="loader loader-3" />
        }
    }
    return <Fragment>{renderLoader()}</Fragment>
}

SpinnerWithSize.defaultProps = {
    loaderSize: 'lg',
    color: '#2F98D0',
    customStyles: {},
}

export default SpinnerWithSize
