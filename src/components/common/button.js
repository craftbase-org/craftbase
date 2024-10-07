import React from 'react'
import Spinner from 'components/common/spinnerWithSize'

const Button = (props) => {
    let baseClassNames =
        ' focus:outline-none rounded-md hover:shadow-lg flex items-center '

    switch (props.intent) {
        case 'primary': // red
            baseClassNames += ' bg-primary-blue text-white '
            break
        case 'info': // white
            baseClassNames += ' bg-neutrals-n500 text-neutrals-n40 '
            break
        case 'secondary': // white
            baseClassNames +=
                ' bg-white text-primary-blue border border-primary-blue'
            break
        default:
            baseClassNames +=
                ' bg-transparent text-white border border-neutral-gray-400'
            break
    }

    switch (props.size) {
        case 'large': // red
            baseClassNames +=
                ' px-4 py-2 2xl:px-6 2xl:py-3 text-sm xl:text-base 2xl:text-lg'
            break
        case 'small': // white
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
        <>
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
                                        ? '#0052CC'
                                        : '#fff',
                            }}
                        />
                    </div>
                )}
            </button>
        </>
    )
}

// Button.defaultProps = {
//     disabled: false,
//     loading: false,
//     onClick: () => {},
//     intent: '',
//     size: '',
//     label: '',
//     customClass: null,
//     extendClass: null,
// }

export default Button
