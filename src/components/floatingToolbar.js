import React, { Fragment, useEffect } from 'react'
import { useMutation } from '@apollo/client'
import styled, { css } from 'styled-components'
import idx from 'idx'
import { motion, AnimatePresence } from 'framer-motion'
import { useImmer } from 'use-immer'

import ColorPicker from './utils/colorPicker'
import BorderStyleBox from './utils/borderStyleBox'
import OpacitySlider from './utils/opacitySlider'
import { UPDATE_COMPONENT_INFO } from '../schema/mutations'
import { properties, TEXT_SIZES_ARRAY } from '../utils/constants'
import { strokeTypeToDashes, clearDashesOnTwoJSShape } from '../utils/misc'
import Icon from '../icons/icon'

const ToolbarContainer = styled(motion.div)`
    height: 50vh;
    z-index: 1;
    position: fixed;
    overflow: auto;
    right: 16px;
    outline: none;
    top: 65px;
    background: #EDE8DC;
    border: 1px solid #D4C9B4;

    display: flex;
    flex-direction: column;
    transition: transform 0.3s;
`

const FontWeightBtn = styled.button`
    font-size: 18px;
    width: 30px;
    height: 30px;
    border: 1px solid #C4901A;

    ${(props) =>
        props.fontWeight === 600
            ? css`
                  font-weight: ${props.fontWeight};
                  background: #E8C87A;
                  color: #1A1612;
              `
            : css`
                  font-weight: ${props.fontWeight};
                  background: transparent;
                  color: #8C7E6A;
              `};
`

const TextUnderlineBtn = styled.button`
    font-size: 18px;
    width: 30px;
    height: 30px;
    text-decoration: underline;
    border: 1px solid #C4901A;

    ${(props) =>
        props.hasUnderline === true
            ? css`
                  background: #E8C87A;
                  color: #1A1612;
              `
            : css`
                  background: transparent;
                  color: #8C7E6A;
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
                        <div className="">
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
        updateComponentBulkProperties,
        hideColorSection,
        enableClassNameStyling,
        classNameLabel,
        hideBorderSection,
        showTextSizeSection,
        currentFontSize,
        onTextSizeChange,
        showFontFamilySection,
        currentFontFamily,
        onFontFamilyChange,
        refreshKey,
        isMobile,
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
        strokeType: null,
        hasUnderline: false,
        opacity: 1,
        hideColorSection: hideColorSection,
        selectedTextSize:
            TEXT_SIZES_ARRAY.find((s) =>
                isMobile
                    ? s.mobileValue === currentFontSize
                    : s.value === currentFontSize
            )?.label || null,
    })

    useEffect(() => {
        setState((draft) => {
            draft.colorBg = componentState?.shape?.data?.fill
            draft.borderColor = componentState?.shape?.data?.stroke
            draft.linewidth = componentState?.shape?.data?.linewidth
            draft.strokeType =
                componentState?.group?.data?.elementData?.strokeType ?? null
            draft.opacity =
                componentState?.group?.data?.elementData?.metadata?.opacity ?? 1
            if (componentState?.text?.data?.fill) {
                draft.colorText = componentState.text.data.fill
            }
        })
    }, [componentState, refreshKey])

    const updateComponent = (propertyToUpdate, propertyValue) => {
        const userId = localStorage.getItem('userId')
        const id = componentState?.group?.data?.elementData?.id

        if (updateComponentBulkProperties) {
            // Route through board's store update so undo history is recorded
            updateComponentBulkProperties(id, {
                [propertyToUpdate]: propertyValue,
            })
        } else {
            updateComponentInfo({
                variables: {
                    id,
                    updateObj: {
                        [propertyToUpdate]: propertyValue,
                        updatedBy: userId,
                    },
                },
            })
        }
        // Keep live elementData in sync. Element components set this once on
        // mount, so without this write, consumers reading from the live group
        // (copy/paste, future toolbar reads) see stale fill/stroke/textColor.
        if (componentState?.group?.data?.elementData) {
            componentState.group.data.elementData[propertyToUpdate] =
                propertyValue
        }
        postToolbarUpdate && postToolbarUpdate()
    }

    const allowedProperties = [
        {
            key: 'textSize',
            hide: !showTextSizeSection,
            content: () => (
                <div className="w-full">
                    <p className="text-xs text-ink-muted mb-2 text-left">
                        Text Size
                    </p>
                    <div className="flex flex-row gap-2">
                        {TEXT_SIZES_ARRAY.map(
                            ({ label, value, mobileValue }) => (
                                <button
                                    key={label}
                                    onClick={() => {
                                        setState((draft) => {
                                            draft.selectedTextSize = label
                                        })
                                        if (
                                            enableClassNameStyling &&
                                            classNameLabel
                                        ) {
                                            const els =
                                                document.getElementsByClassName(
                                                    classNameLabel
                                                )
                                            if (els.length > 0) {
                                                const px = isMobile
                                                    ? mobileValue
                                                    : value
                                                els[0].style.fontSize = `${px}px`
                                            }
                                        }
                                        // updateComponent('fontSize', value)
                                        onTextSizeChange &&
                                            onTextSizeChange(label)
                                    }}
                                    className={`w-9 h-8 text-xs font-semibold border rounded transition-colors ${
                                        state.selectedTextSize === label
                                            ? 'bg-accent/20 text-accent-dark border-accent-dark border-2'
                                            : 'bg-card-bg text-ink-mid border-border-card hover:bg-accent/20'
                                    }`}
                                >
                                    {label}
                                </button>
                            )
                        )}
                    </div>
                </div>
            ),
            renderSvg: () => null,
        },
        {
            key: 'fontFamily',
            hide: !showFontFamilySection,
            content: () => (
                <Fragment>
                    <div className="py-1 w-full">
                        <p className="text-xs text-ink-muted mb-2 text-left">
                            Font
                        </p>
                        <div className="flex flex-row gap-2">
                            {[
                                { label: 'Caveat', family: 'Caveat' },
                                { label: 'Geist', family: 'Geist' },
                            ].map(({ label, family }) => (
                                <button
                                    key={family}
                                    onClick={() =>
                                        onFontFamilyChange &&
                                        onFontFamilyChange(family)
                                    }
                                    style={{ fontFamily: family }}
                                    className={`w-12 h-8 text-sm border rounded transition-colors ${
                                        currentFontFamily === family
                                            ? 'bg-accent/20 text-accent-dark border-accent-dark border-2'
                                            : 'bg-card-bg text-ink-mid border-border-card hover:bg-accent/20'
                                    }`}
                                >
                                    Aa
                                </button>
                            ))}
                        </div>
                    </div>
                    <hr className="my-2" />
                </Fragment>
            ),
            renderSvg: () => null,
        },
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
                    {hideColorBackground ? null : (
                        <ColorPicker
                            title="Background"
                            currentColor={state.colorBg}
                            onChangeComplete={(color) => {
                                setState((draft) => {
                                    draft.colorBg = color
                                })

                                if (componentState.shape?.data?.fill)
                                    componentState.shape.data.fill = color

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

                                updateComponent &&
                                    updateComponent('fill', color)
                            }}
                        />
                    )}

                    {/** Icon color picker */}
                    {hideColorIcon ? null : (
                        <>
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
                    <hr className="my-2" />
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
            hide: hideBorderSection,
            accordion: state.borderAccordion,
            toggleAccordion: () =>
                setState((draft) => {
                    draft.borderAccordion = !state.borderAccordion
                }),
            content: () => (
                <BorderStyleBox
                    currentColor={state.borderColor}
                    currentWidth={state.linewidth}
                    currentType={state.strokeType ?? 'solid'}
                    onChangeStrokeType={(type) => {
                        setState((draft) => {
                            draft.strokeType = type === 'solid' ? null : type
                        })
                        if (componentState.shape?.data) {
                            componentState.shape.data.dashes =
                                strokeTypeToDashes(type)
                            if (type === 'solid') {
                                clearDashesOnTwoJSShape(
                                    componentState.shape.data
                                )
                            }
                        }
                        if (componentState?.group?.data?.elementData) {
                            componentState.group.data.elementData.strokeType =
                                type === 'solid' ? 'solid' : type
                        }
                        updateComponent &&
                            updateComponent(
                                'strokeType',
                                type === 'solid' ? 'solid' : type
                            )
                    }}
                    onChangeColor={(color) => {
                        setState((draft) => {
                            draft.borderColor = color
                        })

                        if (componentState.shape?.data?.stroke) {
                            componentState.shape.data.stroke = color
                        }

                        if (enableClassNameStyling) {
                            let getClassNamesFromDOM =
                                document.getElementsByClassName(classNameLabel)

                            if (getClassNamesFromDOM.length > 0) {
                                getClassNamesFromDOM[0].style.border = `${state.linewidth}px solid ${color} `
                            }
                        }

                        updateComponent && updateComponent('stroke', color)
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
                                getClassNamesFromDOM[0].style.border = `${width}px solid ${state.borderColor} `
                            }
                        }

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
                        componentState.shape.data.opacity = arr[0]
                        postToolbarUpdate && postToolbarUpdate()
                    }}
                    handleOnChange={(arr) => {
                        setState((draft) => {
                            draft.opacity = arr[0]
                        })
                        componentState.shape.data.opacity = arr[0]

                        const existingMetadata =
                            componentState?.group?.data?.elementData
                                ?.metadata ?? {}
                        const updatedMetadata = {
                            ...existingMetadata,
                            opacity: arr[0],
                        }
                        // Keep elementData in sync so subsequent reads include latest opacity
                        if (componentState?.group?.data?.elementData) {
                            componentState.group.data.elementData.metadata =
                                updatedMetadata
                        }
                        // Route through updateComponent so the local store (and therefore
                        // localStorage draft) is updated alongside the cloud mutation.
                        updateComponent('metadata', updatedMetadata)
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

    return (
        <>
            {toggle ? (
                <AnimatePresence>
                    <ToolbarContainer
                        key="flo-toolbar"
                        className=" shadow-lg px-2 rounded-md py-2"
                        data-parent="floating-toolbar"
                        initial="open"
                        animate="closed"
                        transition={{ duration: 0.01 }}
                        variants={variants}
                        id="floating-toolbar"
                        style={
                            isMobile
                                ? {
                                      bottom: '60px',
                                      left: 'auto',
                                      top: 'auto',
                                      right: '10px',
                                      height: 'auto',
                                      maxHeight: '60vh',
                                      overflowY: 'auto',
                                      zIndex: 20,
                                  }
                                : {}
                        }
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
