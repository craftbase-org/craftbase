import type { MouseEventHandler, ReactElement, ReactNode } from 'react'
import Spinner from './spinnerWithSize'

export type ButtonIntent = 'primary' | 'info' | 'secondary' | ''
export type ButtonSize = 'large' | 'small' | 'medium' | ''

export interface ButtonProps {
    name?: string
    intent?: ButtonIntent
    size?: ButtonSize
    label?: string
    children?: ReactNode
    customClass?: string
    extendClass?: string
    disabled?: boolean
    loading?: boolean
    onClick?: MouseEventHandler<HTMLButtonElement>
}

const Button = (props: ButtonProps): ReactElement => {
    let baseClassNames =
        ' focus:outline-none rounded-md hover:shadow-lg flex items-center '

    switch (props.intent) {
        case 'primary':
            baseClassNames += ' bg-accent text-ink '
            break
        case 'info':
            baseClassNames += ' bg-neutrals-n500 text-neutrals-n40 '
            break
        case 'secondary':
            baseClassNames +=
                ' bg-card-bg text-ink border border-accent-dark'
            break
        default:
            baseClassNames +=
                ' bg-transparent text-white border border-neutral-gray-400'
            break
    }

    switch (props.size) {
        case 'large':
            baseClassNames +=
                ' px-4 py-2 2xl:px-6 2xl:py-3 text-sm xl:text-base 2xl:text-lg'
            break
        case 'small':
            baseClassNames += '  px-2 py-1  text-xs  '
            break
        default:
            baseClassNames +=
                '  px-3 py-2 2xl:px-4 2xl:py-2 text-sm 2xl:text-base '
            break
    }

    if (props?.customClass) {
        baseClassNames = props.customClass
    }

    if (props?.disabled) {
        baseClassNames += ' cursor-not-allowed opacity-05 '
    }

    if (props?.extendClass) {
        baseClassNames = props.extendClass + ' ' + baseClassNames
    }

    return (
        <button
            name={props?.name || 'btn'}
            className={baseClassNames}
            onClick={props.onClick}
            disabled={props.disabled}
        >
            {props.children || props.label}
            {props.loading && (
                <div>
                    <Spinner
                        loaderSize="md"
                        customStyles={{
                            margin: 0,
                            marginLeft: '8px',
                            borderBottomColor:
                                props.intent === 'secondary'
                                    ? '#C4901A'
                                    : '#1A1612',
                        }}
                    />
                </div>
            )}
        </button>
    )
}

export default Button
