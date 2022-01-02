import React from 'react'

const Button = (props) => {
    let baseClassNames = ' focus:outline-none rounded-sm '

    switch (props.intent) {
        case 'primary': // red
            baseClassNames += ' bg-primary-blue text-white '
            break
        case 'info': // white
            baseClassNames += ' bg-white text-black '
            break
        case 'secondary': // white
            baseClassNames +=
                ' bg-transparent text-primary-blue border border-primary-blue'
            break
        default:
            baseClassNames +=
                ' bg-transparent text-white border border-neutral-gray-400'
            break
    }

    switch (props.size) {
        case 'large': // red
            baseClassNames +=
                ' px-4 py-2 2xl:px-6 2xl:py-2 text-sm 2xl:text-base  '
            break
        case 'small': // white
            baseClassNames += '  px-2 py-2  text-xs  '
            break
        default:
            baseClassNames +=
                '  px-3 py-2 2xl:px-4 2xl:py-2 text-xs 2xl:text-sm '
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
        <>
            <button
                className={baseClassNames}
                onClick={props.onClick}
                disabled={props.disabled}
            >
                {props.children || props.label}
            </button>
        </>
    )
}

Button.defaultProps = {
    disabled: false,
    onClick: () => {},
    intent: '',
    size: '',
    label: '',
    customClass: null,
    extendClass: null,
}

export default Button
