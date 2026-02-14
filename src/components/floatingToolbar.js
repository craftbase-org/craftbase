import React, { Fragment, useEffect } from 'react'
import { useMutation } from '@apollo/client'
import styled, { css } from 'styled-components'
import idx from 'idx'
import { motion, AnimatePresence } from 'framer-motion'
import { useImmer } from 'use-immer'

import ColorPicker from 'components/utils/colorPicker'
import BorderStyleBox from 'components/utils/borderStyleBox'
import OpacitySlider from 'components/utils/opacitySlider'
import { UPDATE_COMPONENT_INFO } from 'schema/mutations'
import { properties } from 'utils/constants'
import Icon from 'icons/icon'

const ToolbarContainer = styled(motion.div)`
    height: 79vh;
    z-index: 1;
    position: fixed;
    overflow: auto;
    right: 16px;
    outline: none;
    top: 65px;
    background: rgba(255, 255, 255, 1);

    display: flex;
    flex-direction: column;
    align-items: center;
    transition: transform 0.3s;
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
    hideColorText,
    hideColorIcon,
    hideColorBackground,
    isLastIndex,
    showButton,
}) => {
    // By using `AnimatePresence` to mount and unmount the contents, we can animate
    // them in and out while also only rendering the contents of open accordions
    return (
        <Fragment>
            {showButton && (
                <button
                    className={`flex transition duration-200 flex-row justify-start items-center
          py-2 w-11/12 shadow my-2  ${
              accordion ? `bg-gray-300` : `bg-transparent`
          }  hover:bg-gray-300`}
                    // animate={{ backgroundColor: isOpen ? "#FF0088" : "#0055FF" }}
                    onClick={() => {
                        toggleAccordion(!accordion)
                    }}
                >
                    <Fragment>
                        <div className="flex w-full px-2">
                            {/* <div className="flex-none w-1/3 ">{renderSvg()}</div> */}
                            <div className="flex-grow w-10/12 text-left text-sm">
                                <span className=" text-black  ">{header}</span>
                            </div>
                            <div className="flex-none w-1/12 text-left ">
                                {renderSvg()}
                            </div>
                        </div>
                    </Fragment>
                </button>
            )}
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
                        style={
                            isLastIndex === true
                                ? { paddingBottom: '30px' }
                                : {}
                        }
                    >
                        <div className="py-2">
                            {content(
                                hideColorText,
                                hideColorIcon,
                                hideColorBackground
                            )}
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>
        </Fragment>
    )
}

const Toolbar = (props) => {
    const {
        toggle,
        componentState,
        closeToolbar,
        componentId,
        postToolbarUpdate,
        hideColorSection,
        enableClassNameStyling,
        classNameLabel,
    } = props
    console.log('Toolbar props', props)
    const [updateComponentInfo] = useMutation(UPDATE_COMPONENT_INFO, {
        ignoreResults: true,
    })

    const [state, setState] = useImmer({
        colorsAccordion: true,
        fontAccordion: false,
        borderAccordion: true,
        opacityAccordion: true,
        iconAccordion: false,
        colorBg: '#000',
        colorIcon: '#fff',
        colorText: '#fff',
        fontSize: 18,
        fontWeight: 400,
        borderColor: '#000',
        linewidth: 0,
        hasUnderline: false,
        opacity: 1,
        hideColorSection: hideColorSection,
    })

    useEffect(() => {
        setState((draft) => {
            draft.colorBg = componentState?.shape?.data?.fill
            draft.borderColor = componentState?.shape?.data?.stroke
            draft.linewidth = componentState?.shape?.data?.linewidth
            draft.opacity =
                componentState?.group?.data?.elementData?.metadata?.opacity ?? 1
        })
    }, [componentState])

    const updateComponent = (propertyToUpdate, propertyValue) => {
        const userId = localStorage.getItem('userId')
        // updateComponentInfo({
        //     variables: {
        //         id: componentId,
        //         updateObj: {
        //             [propertyToUpdate]: propertyValue,
        //             updatedBy: userId,
        //         },
        //     },
        // })
        postToolbarUpdate && postToolbarUpdate()
    }

    const allowedProperties = [
        {
            key: properties.colorBg,
            // hide: state.hideColorSection,
            title: 'Color',
            // accordion: state.colorsAccordion,
            // toggleAccordion: () =>
            //     setState((draft) => {
            //         draft.colorsAccordion = !state.colorsAccordion
            //     }),
            content: (hideColorText, hideColorIcon, hideColorBackground) => (
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

                            // check if to apply style via class names
                            if (enableClassNameStyling) {
                                let getClassNamesFromDOM =
                                    document.getElementsByClassName(
                                        classNameLabel
                                    )

                                if (getClassNamesFromDOM.length > 0) {
                                    getClassNamesFromDOM[0].style.background =
                                        color
                                }
                            }
                            // componentState.icon.data.stroke = state.colorIcon

                            // if (componentState?.icon?.data?.stroke)
                            //     componentState.icon.data.stroke = color
                            // componentState.icon.data.stroke = state.colorIcon

                            // if (componentState?.text?.data?.fill)
                            //     componentState.text.data.fill = state.colorText

                            updateComponent && updateComponent('fill', color)
                        }}
                    />

                    {/** Icon color picker */}
                    {hideColorIcon ? null : (
                        <>
                            <hr className="my-2" />
                            <ColorPicker
                                title="Icon"
                                currentColor={state.colorIcon}
                                onChangeComplete={(color) => {
                                    setState((draft) => {
                                        draft.colorIcon = color
                                    })

                                    if (componentState?.icon?.data?.stroke)
                                        componentState.icon.data.stroke = color

                                    updateComponent &&
                                        updateComponent('iconStroke', color)
                                }}
                            />
                        </>
                    )}

                    {hideColorText ? null : (
                        <>
                            <hr className="my-2" />
                            <ColorPicker
                                title="Text"
                                currentColor={state.colorText}
                                onChangeComplete={(color) => {
                                    setState((draft) => {
                                        draft.colorText = color
                                    })

                                    if (componentState?.text?.data?.fill)
                                        componentState.text.data.fill = color

                                    if (enableClassNameStyling) {
                                        let getClassNamesFromDOM =
                                            document.getElementsByClassName(
                                                classNameLabel
                                            )

                                        if (getClassNamesFromDOM.length > 0) {
                                            getClassNamesFromDOM[0].style.color =
                                                color
                                        }
                                    }
                                    updateComponent &&
                                        updateComponent('textColor', color)
                                }}
                            />
                        </>
                    )}
                </Fragment>
            ),
            renderSvg: () => <Icon icon="ICON_CARET" width={20} height={20} />,
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
                    onChangeColor={(color) => {
                        setState((draft) => {
                            draft.borderColor = color
                        })
                        if (componentState.shape?.data?.stroke) {
                            componentState.shape.data.stroke = color
                            // componentState.shape.data.linewidth = 2
                        }

                        // check if to apply style via class names
                        if (enableClassNameStyling) {
                            let getClassNamesFromDOM =
                                document.getElementsByClassName(classNameLabel)

                            if (getClassNamesFromDOM.length > 0) {
                                getClassNamesFromDOM[0].style.border = `${state.linewidth}px solid ${color} `
                            }
                        }

                        updateComponent && updateComponent('stroke', color)
                        // updateComponent && updateComponent('linewidth', 2)
                    }}
                    onChangeBorderWidth={(width) => {
                        setState((draft) => {
                            draft.linewidth = width
                        })
                        if (componentState.shape?.data?.stroke) {
                            componentState.shape.data.stroke = state.borderColor
                            componentState.shape.data.linewidth = width
                        }

                        if (enableClassNameStyling) {
                            let getClassNamesFromDOM =
                                document.getElementsByClassName(classNameLabel)

                            if (getClassNamesFromDOM.length > 0) {
                                console.log(
                                    'get class name from dom',
                                    width,
                                    state.borderColor
                                )
                                getClassNamesFromDOM[0].style.border = `${width}px solid ${state.borderColor} `
                            }
                        }

                        // updateComponent && updateComponent('stroke', color)
                        updateComponent && updateComponent('linewidth', width)
                    }}
                />
            ),
            renderSvg: () => <Icon icon="ICON_CARET" width={20} height={20} />,
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
                    handleOnDrag={(arr) => {
                        setState((draft) => {
                            draft.opacity = arr[0]
                        })
                        componentState.group.data.opacity = arr[0]
                        postToolbarUpdate && postToolbarUpdate()
                    }}
                    handleOnChange={(arr) => {
                        setState((draft) => {
                            draft.opacity = arr[0]
                        })
                        componentState.group.data.opacity = arr[0]

                        const componentId =
                            componentState?.group?.data?.elementData?.id
                        const existingMetadata =
                            componentState?.group?.data?.elementData
                                ?.metadata ?? {}
                        const userId = localStorage.getItem('userId')
                        const updatedMetadata = {
                            ...existingMetadata,
                            opacity: arr[0],
                        }
                        // Keep elementData in sync so subsequent saves include latest opacity
                        if (componentState?.group?.data?.elementData) {
                            componentState.group.data.elementData.metadata =
                                updatedMetadata
                        }
                        updateComponentInfo({
                            variables: {
                                id: componentId,
                                updateObj: {
                                    metadata: updatedMetadata,
                                    updatedBy: userId,
                                },
                            },
                        })
                    }}
                />
            ),
            renderSvg: () => <Icon icon="ICON_CARET" width={20} height={20} />,
        },
    ]

    const variants = {
        open: { x: '100%' },
        closed: { x: '0%' },
    }

    const globalMouseUpEventHanlder = (e) => {
        const nativeMouseClientX = e.clientX
        const nativeMouseClientY = e.clientY
        console.log('componentState', componentState)
        const elementIds = Object.keys(idx(componentState, (_) => _.element))
        const toolbarCoordinate = document
            .getElementById('floating-toolbar')
            .getBoundingClientRect()

        // Checks for blur event by comparing x coords of toolbar and user mouse click event
        // if (nativeMouseClientX < toolbarCoordinate.x) {
        //     if (!elementIds.includes(e.target.id)) {
        //         closeToolbar()
        //     }
        //     // console.log(e.target.id, elementIds, elementIds.includes(e.target.id));
        // } else if (nativeMouseClientY < toolbarCoordinate.y) {
        //     if (!elementIds.includes(e.target.id)) {
        //         closeToolbar()
        //     }
        // }
    }

    useEffect(() => {
        window.addEventListener('mouseup', globalMouseUpEventHanlder)
        return () => {
            window.removeEventListener('mouseup', globalMouseUpEventHanlder)
        }
    }, [])

    return (
        <>
            {toggle ? (
                <AnimatePresence>
                    <ToolbarContainer
                        key="flo-toolbar"
                        className=" shadow-lg px-2 rounded-md"
                        data-parent="floating-toolbar"
                        initial="open"
                        animate="closed"
                        transition={{ duration: 0.01 }}
                        variants={variants}
                        // toggleToolbar={toggle}
                        id="floating-toolbar"
                        // tabIndex="1"
                    >
                        {allowedProperties.map((i, index) =>
                            i.hide === true ? null : (
                                <Accordion
                                    key={index}
                                    showButton={false}
                                    isLastIndex={
                                        index === allowedProperties.length - 1
                                    }
                                    accordion={true}
                                    toggleAccordion={i.toggleAccordion}
                                    header={i.title}
                                    content={i.content}
                                    renderSvg={i.renderSvg}
                                    hideColorText={props.hideColorText}
                                    hideColorBackground={
                                        props.hideColorBackground
                                    }
                                    hideColorIcon={props.hideColorIcon}
                                />
                            )
                        )}
                    </ToolbarContainer>
                </AnimatePresence>
            ) : (
                <></>
            )}
        </>
    )
}

export default Toolbar
