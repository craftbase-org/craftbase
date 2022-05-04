import React from 'react'
import styled from 'styled-components'
// import "wicg-inert";

import Portal from './portal'

const Backdrop = styled.div`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: rgba(51, 51, 51, 0.3);
    backdrop-filter: blur(1px);
    opacity: 0;
    transition: all 100ms cubic-bezier(0.4, 0, 0.2, 1);
    transition-delay: 200ms;
    display: flex;
    align-items: center;
    justify-content: center;

    & .modal-content {
        transform: translateY(100px);
        transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
        opacity: 0;
    }

    &.active {
        transition-duration: 250ms;
        transition-delay: 0ms;
        opacity: 1;

        & .modal-content {
            transform: translateY(0);
            opacity: 1;
            transition-delay: 150ms;
            transition-duration: 350ms;
        }
    }
`

const Content = styled.div`
    position: relative;
    padding: 20px;
    box-sizing: border-box;
    min-height: 50px;
    min-width: 50px;
    max-height: 80%;
    max-width: 80%;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);
    background-color: white;
    border-radius: 2px;
`

export default function Modal(props) {
    const [active, setActive] = React.useState(false)
    const { open, onClose, locked } = props
    const backdrop = React.useRef(null)

    React.useEffect(() => {
        const { current } = backdrop

        const transitionEnd = () => setActive(open)

        const keyHandler = (e) =>
            !locked && [27].indexOf(e.which) >= 0 && onClose()

        const clickHandler = (e) => !locked && e.target === current && onClose()

        if (current) {
            current.addEventListener('transitionend', transitionEnd)
            current.addEventListener('click', clickHandler)
            window.addEventListener('keyup', keyHandler)
        }

        if (open) {
            window.setTimeout(() => {
                document.activeElement.blur()
                setActive(open)
                // document.querySelector("#root").setAttribute("inert", "true");
            }, 10)
        }

        return () => {
            if (current) {
                current.removeEventListener('transitionend', transitionEnd)
                current.removeEventListener('click', clickHandler)
            }

            // document.querySelector("#root").removeAttribute("inert");
            window.removeEventListener('keyup', keyHandler)
        }
    }, [open, locked, onClose])

    return (
        <React.Fragment>
            {(open || active) && (
                <Portal className="modal-portal">
                    <Backdrop
                        ref={backdrop}
                        className={active && open && 'active'}
                    >
                        <Content className="modal-content">
                            {props.children}
                        </Content>
                    </Backdrop>
                </Portal>
            )}
        </React.Fragment>
    )
}
