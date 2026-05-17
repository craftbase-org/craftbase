import { Fragment } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import './index.css'

export type LoaderSize = 'xs' | 'sm' | 'md' | 'lg'

export interface SpinnerWithSizeProps {
    loaderSize?: LoaderSize
    color?: string
    customStyles?: CSSProperties
}

const SpinnerWithSize = (props: SpinnerWithSizeProps): ReactElement => {
    const { loaderSize, customStyles } = props
    const renderLoader = (): ReactElement => {
        switch (loaderSize) {
            case 'lg':
                return (
                    <span
                        style={{ ...customStyles }}
                        className="lg-loader loader-3"
                    />
                )
            case 'md':
                return (
                    <span
                        style={{ ...customStyles }}
                        className="md-loader loader-3"
                    />
                )
            case 'sm':
                return (
                    <span
                        style={{ ...customStyles }}
                        className="sm-loader loader-3"
                    />
                )
            case 'xs':
                return (
                    <span
                        style={{ ...customStyles }}
                        className="xs-loader loader-3"
                    />
                )
            default:
                return <span className="loader loader-3" />
        }
    }
    return <Fragment>{renderLoader()}</Fragment>
}

export default SpinnerWithSize
