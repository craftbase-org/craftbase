import React, { Fragment, useState } from "react";
import ColorPicker from "components/utils/colorPicker";
import BorderStyleBox from "components/utils/borderStyleBox";
import OpacitySlider from "components/utils/opacitySlider";
import FontSizeSlider from "components/utils/fontSizeSlider";
import styled, { css } from "styled-components";
import { properties } from "utils/constants";
import idx from "idx";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "icons/icon";
import { useImmer } from "use-immer";
import { useEffect } from "react";

const ToolbarContainer = styled(motion.div)`
  height: 100vh;
  width: 300px;
  z-index: 1;
  position: fixed;
  overflow: auto;
  right: 0;
  outline: none;
  top: 0;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(3px);
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.3s;
  box-shadow: 2px 68px 10px rgba(194, 206, 219, 0.68);

  ${(props) =>
    props.toggleToolbar
      ? css`
          transform: translateX(0%);
        `
      : css`
          transform: translateX(100%);
        `}
`;

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
`;

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
`;

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
          toggleAccordion(!accordion);
        }}
      >
        <Fragment>
          <div className="flex w-full  ">
            {/* <div className="flex-none w-1/3 ">{renderSvg()}</div> */}
            <div className="flex-grow w-8/12 text-left ">
              <span className=" text-black  pl-4">{header}</span>
            </div>
            <div className="flex-none w-2/12 text-left ">{renderSvg()}</div>
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
              open: { opacity: 1, height: "auto" },
              collapsed: { opacity: 0, height: 0 },
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            {content()}
          </motion.section>
        )}
      </AnimatePresence>
    </Fragment>
  );
};

const Toolbar = (props) => {
  const { toggle, componentState, closeToolbar } = props;
  console.log("Toolbar props", props);

  const [colorsAccordion, toggleColorsAccordion] = useState(false);
  const [fontAccordion, toggleFontAccordion] = useState(false);
  const [borderAccordion, toggleBorderAccordion] = useState(false);
  const [opacityAccordion, toggleOpacityAccordion] = useState(false);
  const [iconAccordion, setIconAccordion] = useState(false);

  const [colorBg, setColorBg] = useState("#000");
  const [colorText, setColorText] = useState("#fff");
  const [fontSize, setFontSize] = useState(18);
  const [fontWeight, setFontWeight] = useState(400);
  const [borderColor, setBorderColor] = useState("#000");
  const [hasUnderline, setUnderline] = useState(false);
  const [opacity, setOpacity] = useState(0.4);

  const allowedProperties = [
    {
      key: properties.colorBg,
      title: "Color",
      accordion: colorsAccordion,
      toggleAccordion: toggleColorsAccordion,
      content: () => (
        <Fragment>
          <ColorPicker
            title="Background"
            currentColor={colorBg}
            onChangeComplete={(color) => {
              setColorBg(color);
            }}
          />
          <hr className="my-4" />
          <ColorPicker
            title="Text"
            currentColor={colorText}
            onChangeComplete={(color) => {
              setColorText(color);
            }}
          />
        </Fragment>
      ),
      renderSvg: () => <Icon icon="ICON_CARET" width={25} height={25} />,
    },
    {
      key: properties.fontSize,
      title: "Font ",
      accordion: fontAccordion,
      toggleAccordion: toggleFontAccordion,
      content: () => (
        <Fragment>
          <FontSizeSlider
            title="Size"
            currentFontSize={fontSize}
            onChangeComplete={(arr) => {
              setFontSize(arr[0]);
            }}
          />
          <hr className="my-4 mt-12" />
          <div className="transition duration-300 mb-2">
            <div className="p-1 text-left">Style</div>
            <div className="py-3 px-1 text-left">
              <FontWeightBtn
                className="hover:bg-blues-b50 hover:text-blues-b400 transition duration-100"
                fontWeight={fontWeight}
                onClick={() => {
                  if (fontWeight !== 600) setFontWeight(600);
                  else setFontWeight(400);
                }}
              >
                B
              </FontWeightBtn>
              <TextUnderlineBtn
                className="ml-2 hover:bg-blues-b50 hover:text-blues-b400 transition duration-100"
                hasUnderline={hasUnderline}
                onClick={() => {
                  setUnderline(!hasUnderline);
                }}
              >
                U
              </TextUnderlineBtn>
            </div>
          </div>
        </Fragment>
      ),
      renderSvg: () => <Icon icon="ICON_CARET" width={25} height={25} />,
    },
    {
      key: properties.borderColor,
      title: "Border",
      accordion: borderAccordion,
      toggleAccordion: toggleBorderAccordion,
      content: () => (
        <BorderStyleBox
          currentColor={borderColor}
          onChangeComplete={(color) => {
            setBorderColor(color);
          }}
        />
      ),
      renderSvg: () => <Icon icon="ICON_CARET" width={25} height={25} />,
    },

    {
      key: properties.opacity,
      title: "Opacity",
      accordion: opacityAccordion,
      toggleAccordion: toggleOpacityAccordion,
      content: () => (
        <OpacitySlider
          title="Opacity"
          currentOpacity={opacity}
          onChangeComplete={(arr) => {
            setOpacity(arr[0]);
          }}
        />
      ),
      renderSvg: () => <Icon icon="ICON_CARET" width={25} height={25} />,
    },
  ];

  const variants = {
    open: { x: "0%" },
    closed: { x: "100%" },
  };

  const globalMouseUpEventHanlder = (e) => {
    const nativeMouseClientX = e.clientX;
    const elementIds = Object.keys(idx(componentState, (_) => _.element));
    const toolbarCoordinate = document
      .getElementById("floating-toolbar")
      .getBoundingClientRect();
    console.log(
      "mouse up event listener in TOOLBAR",
      e,
      elementIds.includes(e.target.id),
      nativeMouseClientX >= toolbarCoordinate.x
    );

    if (nativeMouseClientX < toolbarCoordinate.x) {
      if (!elementIds.includes(e.target.id)) {
        closeToolbar();
      }
      // console.log(e.target.id, elementIds, elementIds.includes(e.target.id));
    }
  };

  useEffect(() => {
    window.addEventListener("mouseup", globalMouseUpEventHanlder);
    return () => {
      window.removeEventListener("mouseup", globalMouseUpEventHanlder);
    };
  }, []);

  return (
    <AnimatePresence>
      <ToolbarContainer
        key="flo-toolbar"
        data-parent="floating-toolbar"
        initial="closed"
        animate={"open"}
        transition={{ duration: 0.01 }}
        variants={variants}
        exit={{ translateX: "100%" }}
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
  );
};

export default Toolbar;
