import type { ReactElement, ReactNode } from 'react'
import SpinnerWithSize from './spinnerWithSize'

interface SpinnerProps {
    displayText?: ReactNode
}

const Spinner = ({ displayText }: SpinnerProps): ReactElement => {
    return (
        <div>{displayText ? displayText : <SpinnerWithSize loaderSize="sm" />}</div>
    )
}

export default Spinner
