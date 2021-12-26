import React, { Fragment, useEffect } from 'react'
import ColorPicker from 'components/utils/colorPicker'
import BorderStyleBox from 'components/utils/borderStyleBox'
import OpacitySlider from 'components/utils/opacitySlider'
import FontSizeSlider from 'components/utils/fontSizeSlider'
import styled, { css } from 'styled-components'
import { properties } from 'utils/constants'
import idx from 'idx'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from 'icons/icon'
import { useImmer } from 'use-immer'

const ToolbarContainer = styled(motion.div)`
    height: 100vh;
    width: 300px;
    z-index: 1;
    position: fixed;
    overflow: auto;
    left: 0;
    outline: none;
    top: 0;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(3px);
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: transform 0.3s;
    box-shadow: 2px 68px 10px rgba(194, 206, 219, 0.68);
`

const FontWeightBtn = styled.button`
    font-size: 18px;
    width: 30px;
    height: 30px;
    border: 1px solid #0052cc;

    ${(props) =>
        props.fontWeight === 600
            ? css`
                  font-weight: ${props.fontWeight};
                  background: #0052cc;
                  color: #fff;
              `
            : css`
                  font-weight: ${props.fontWeight};
                  background: transparent;
                  color: #0052cc;
              `};
`

const TextUnderlineBtn = styled.button`
    font-size: 18px;
    width: 30px;
    height: 30px;
    text-decoration: underline;
    border: 1px solid #0052cc;

    ${(props) =>
        props.hasUnderline === true
            ? css`
                  background: #0052cc;
                  color: #fff;
              `
            : css`
                  background: transparent;
                  color: #0052cc;
              `};
`

const Accordion = ({
    accordion,
    toggleAccordion,
    content,
    header,
    renderSvg,
}) => {
    // By using `AnimatePresence` to mount and unmount the contents, we can animate
    // them in and out while also only rendering the contents of open accordions
    return (
        <Fragment>
            <button
                className={`flex transition duration-200 flex-row justify-start items-center
          py-4 w-11/12 shadow my-2  ${
              accordion ? `bg-gray-300` : `bg-transparent`
          }  hover:bg-gray-300`}
                // animate={{ backgroundColor: isOpen ? "#FF0088" : "#0055FF" }}
                onClick={() => {
                    toggleAccordion(!accordion)
                }}
            >
                <Fragment>
                    <div className="flex w-full  ">
                        {/* <div className="flex-none w-1/3 ">{renderSvg()}</div> */}
                        <div className="flex-grow w-8/12 text-left ">
                            <span className=" text-black  pl-4">{header}</span>
                        </div>
                        <div className="flex-none w-2/12 text-left ">
                            {renderSvg()}
                        </div>
                    </div>
                </Fragment>
            </button>
            <AnimatePresence initial={false}>
                {accordion && (
                    <motion.section
                        key="content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                            open: { opacity: 1, height: 'auto' },
                            collapsed: { opacity: 0, height: 0 },
                        }}
                        transition={{
                            duration: 0.3,
                            ease: [0.04, 0.62, 0.23, 0.98],
                        }}
                    >
                        {content()}
                    </motion.section>
                )}
            </AnimatePresence>
        </Fragment>
    )
}

const Toolbar = (props) => {
    const { toggle, componentState, closeToolbar, updateComponent } = props
    console.log('Toolbar props', props)

    const [state, setState] = useImmer({
        colorsAccordion: false,
        fontAccordion: false,
        borderAccordion: false,
        opacityAccordion: false,
        iconAccordion: false,
        colorBg: '#000',
        colorIcon: '#fff',
        colorText: '#fff',
        fontSize: 18,
        fontWeight: 400,
        borderColor: '#000',
        hasUnderline: false,
        opacity: 0.4,
    })

    useEffect(() => {
        setState((draft) => {
            draft.colorBg = componentState?.shape?.data?.fill
        })
    }, [])

    const allowedProperties = [
        {
            key: properties.colorBg,
            title: 'Color',
            accordion: state.colorsAccordion,
            toggleAccordion: () =>
                setState((draft) => {
                    draft.colorsAccordion = !state.colorsAccordion
                }),
            content: () => (
                <Fragment>
                    <ColorPicker
                        title="Background"
                        currentColor={state.colorBg}
                        onChangeComplete={(color) => {
                            setState((draft) => {
                                draft.colorBg = color
                            })

                            // Shape's color overlaps all property so update necessary
                            // secondary element's fill property from the existing state
                            if (componentState.shape?.data?.fill)
                                componentState.shape.data.fill = color

                            if (componentState?.icon?.data?.fill)
                                componentState.icon.data.fill = state.colorIcon

                            if (componentState?.text?.data?.fill)
                                componentState.text.data.fill = state.colorText

                            updateComponent && updateComponent('fill', color)
                        }}
                    />
                    <hr className="my-4" />
                    {/** Icon color picker */}
                    <ColorPicker
                        title="Icon"
                        currentColor={state.colorIcon}
                        onChangeComplete={(color) => {
                            setState((draft) => {
                                draft.colorIcon = color
                            })

                            if (componentState?.icon?.data?.fill)
                                componentState.icon.data.fill = color

                            updateComponent &&
                                updateComponent('iconColor', color)
                        }}
                    />
                    <hr className="my-4" />
                    <ColorPicker
                        title="Text"
                        currentColor={state.colorText}
                        onChangeComplete={(color) => {
                            setState((draft) => {
                                draft.colorText = color
                            })

                            if (componentState?.text?.data?.fill)
                                componentState.text.data.fill = color

                            updateComponent && updateComponent('color', color)
                        }}
                    />
                </Fragment>
            ),
            renderSvg: () => <Icon icon="ICON_CARET" width={25} height={25} />,
        },
        // {
        //     key: properties.fontSize,
        //     title: 'Font ',
        //     accordion: state.fontAccordion,
        //     toggleAccordion: () =>
        //         setState((draft) => {
        //             draft.fontAccordion = !state.fontAccordion
        //         }),
        //     content: () => (
        //         <Fragment>
        //             <FontSizeSlider
        //                 title="Size"
        //                 currentFontSize={state.fontSize}
        //                 onChangeComplete={(arr) => {
        //                     setState((draft) => {
        //                         draft.fontSize = arr[0]
        //                     })
        //                 }}
        //             />
        //             <hr className="my-4 mt-12" />
        //             <div className="transition duration-300 mb-2">
        //                 <div className="p-1 text-left">Style</div>
        //                 <div className="py-3 px-1 text-left">
        //                     <FontWeightBtn
        //                         className="hover:bg-blues-b400 hover:text-white transition duration-100"
        //                         fontWeight={state.fontWeight}
        //                         onClick={() => {
        //                             if (state.fontWeight !== 600)
        //                                 setState((draft) => {
        //                                     draft.fontWeight = 600
        //                                 })
        //                             else
        //                                 setState((draft) => {
        //                                     draft.fontWeight = 400
        //                                 })
        //                         }}
        //                     >
        //                         B
        //                     </FontWeightBtn>
        //                     <TextUnderlineBtn
        //                         className="ml-2 hover:bg-blues-b50 hover:text-blues-b400 transition duration-100"
        //                         hasUnderline={state.hasUnderline}
        //                         onClick={() => {
        //                             setState((draft) => {
        //                                 draft.hasUnderline = !state.hasUnderline
        //                             })
        //                         }}
        //                     >
        //                         U
        //                     </TextUnderlineBtn>
        //                 </div>
        //             </div>
        //         </Fragment>
        //     ),
        //     renderSvg: () => <Icon icon="ICON_CARET" width={25} height={25} />,
        // },
        {
            key: properties.borderColor,
            title: 'Border',
            accordion: state.borderAccordion,
            toggleAccordion: () =>
                setState((draft) => {
                    draft.borderAccordion = !state.borderAccordion
                }),
            content: () => (
                <BorderStyleBox
                    currentColor={state.borderColor}
                    onChangeComplete={(color) => {
                        setState((draft) => {
                            state.borderColor = color
                        })
                    }}
                />
            ),
            renderSvg: () => <Icon icon="ICON_CARET" width={25} height={25} />,
        },

        {
            key: properties.opacity,
            title: 'Opacity',
            accordion: state.opacityAccordion,
            toggleAccordion: () =>
                setState((draft) => {
                    draft.opacityAccordion = !state.opacityAccordion
                }),
            content: () => (
                <OpacitySlider
                    title="Opacity"
                    currentOpacity={state.opacity}
                    onChangeComplete={(arr) => {
                        setState((draft) => {
                            draft.opacity = arr[0]
                        })
                    }}
                />
            ),
            renderSvg: () => <Icon icon="ICON_CARET" width={25} height={25} />,
        },
    ]

    const variants = {
        open: { x: '-100%' },
        closed: { x: '0%' },
    }

    const globalMouseUpEventHanlder = (e) => {
        const nativeMouseClientX = e.clientX
        const elementIds = Object.keys(idx(componentState, (_) => _.element))
        const toolbarCoordinate = document
            .getElementById('floating-toolbar')
            .getBoundingClientRect()

        // Checks for blur event by comparing x coords of toolbar and user mouse click event
        if (
            nativeMouseClientX >
            toolbarCoordinate.x + toolbarCoordinate.width
        ) {
            if (!elementIds.includes(e.target.id)) {
                closeToolbar()
            }
            // console.log(e.target.id, elementIds, elementIds.includes(e.target.id));
        }
    }

    useEffect(() => {
        window.addEventListener('mouseup', globalMouseUpEventHanlder)
        return () => {
            window.removeEventListener('mouseup', globalMouseUpEventHanlder)
        }
    }, [])

    return (
        <AnimatePresence>
            <ToolbarContainer
                key="flo-toolbar"
                data-parent="floating-toolbar"
                initial="open"
                animate="closed"
                transition={{ duration: 0.01 }}
                variants={variants}
                toggleToolbar={toggle}
                id="floating-toolbar"
                // tabIndex="1"
            >
                {allowedProperties.map((i, index) => (
                    <Accordion
                        key={index}
                        accordion={i.accordion}
                        toggleAccordion={i.toggleAccordion}
                        header={i.title}
                        content={i.content}
                        renderSvg={i.renderSvg}
                    />
                ))}
            </ToolbarContainer>
        </AnimatePresence>
    )
}

export default Toolbar
