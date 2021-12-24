import React, { Fragment } from 'react'
import './index.css'

const SpinnerWithSize = (props) => {
    const { loaderSize, color } = props
    const renderLoader = () => {
        switch (loaderSize) {
            case 'lg':
                return (
                    <span
                        style={
                            color && {
                                borderBottomColor: color,
                            }
                        }
                        className="lg-loader loader-3"
                    />
                )
            case 'sm':
                return (
                    <span
                        style={
                            color && {
                                borderBottomColor: color,
                            }
                        }
                        className="sm-loader loader-3"
                    />
                )
            case 'xs':
                return (
                    <span
                        style={
                            color && {
                                borderBottomColor: color,
                            }
                        }
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
}

export default SpinnerWithSize
