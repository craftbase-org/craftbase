import React, { Fragment, useState } from "react";
import ColorPicker from "components/utils/colorPicker";
import BorderStyleBox from "components/utils/borderStyleBox";
import OpacitySlider from "components/utils/opacitySlider";
import styled, { css } from "styled-components";
import { properties } from "utils/constants";
import idx from "idx";
import { motion } from "framer-motion";

const ToolbarContainer = styled(motion.div)`
  position: absolute;
  width: 340px;
  height: 40px;
  background: #091e42;
  border-radius: 10px;
  z-index: 99999;
  cursor: pointer;
  outline: none;

  ${(props) =>
    props.left &&
    css`
      left: ${props.left}px;
    `};

  ${(props) =>
    props.top &&
    css`
      top: ${props.top - 40}px;
    `};
`;

const BgColorBtn = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 50%;

  ${(props) =>
    props.bgColor &&
    css`
      background: ${props.bgColor};
    `}
`;

const TextColorBtn = styled.button`
  font-size: "18px";
  width: 30px;
  height: 30px;
  background: #000;

  ${(props) =>
    props.textColor &&
    css`
      color: ${props.textColor};
    `};
`;

const FontSizeInput = styled.input`
  width: 40px;
  font-size: "18px";
`;

const FontWeightBtn = styled.button`
  font-size: "18px";
  width: 30px;
  height: 30px;

  ${(props) =>
    props.fontWeight === 600
      ? css`
          font-weight: ${props.fontWeight};
          background: #fff;
          color: #000;
        `
      : css`
          font-weight: ${props.fontWeight};
          background: transparent;
          color: #fff;
        `};
`;

const TextUnderlineBtn = styled.button`
  font-size: "18px";
  width: 30px;
  height: 30px;
  text-decoration: underline;

  ${(props) =>
    props.hasUnderline === true
      ? css`
          background: #fff;
          color: #000;
        `
      : css`
          background: transparent;
          color: #fff;
        `};
`;

const BorderColorBtn = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 50%;

  ${(props) =>
    props.borderColor &&
    css`
      background: ${props.borderColor};
    `}
`;

const Toolbar = (props) => {
  const { left, top } = props;
  console.log("Toolbar props", props);
  const [toggledProperty, setToggledProperty] = useState("");
  const [colorBg, setColorBg] = useState("#000");
  const [colorText, setColorText] = useState("#fff");
  const [fontSize, setFontSize] = useState(18);
  const [fontWeight, setFontWeight] = useState(400);
  const [borderColor, setBorderColor] = useState("#000");
  const [hasUnderline, setUnderline] = useState(false);
  const [opacity, setOpacity] = useState(0.4);

  const borderWidthLists = () => {
    return (
      <Fragment>
        <div class="flex flex-row bg-gray-200">
          <div class="text-gray-700 text-center bg-gray-400 px-4 py-2 m-2">
            S
          </div>
          <div class="text-gray-700 text-center bg-gray-400 px-4 py-2 m-2">
            M
          </div>
          <div class="text-gray-700 text-center bg-gray-400 px-4 py-2 m-2">
            L
          </div>
        </div>
      </Fragment>
    );
  };

  return (
    <ToolbarContainer left={left} top={top} id="floating-toolbar" tabIndex="1">
      <div data-parent="floating-toolbar" className="inline-block relative">
        <Fragment>
          <BgColorBtn
            title="Fill"
            className="inline"
            data-parent="floating-toolbar"
            bgColor={colorBg}
            onClick={() => {
              setToggledProperty(properties.colorBg);
            }}
            onBlur={(e) => {
              // Check if new target element is being focused and if it's out
              // of scope of this toolbar
              if (
                idx(e, (_) => _.relatedTarget.id) === "floating-toolbar" ||
                idx(e, (_) => _.relatedTarget.dataset.parent) ===
                  "floating-toolbar"
              ) {
                // temporararily here there are no functions to be executed
              } else {
                document.getElementById("floating-toolbar").hidden = true;

                setToggledProperty("");
              }
            }}
          />

          {toggledProperty === properties.colorBg && (
            <ColorPicker
              currentColor={colorBg}
              leftPos={4}
              onChangeComplete={(color) => {
                setColorBg(color);
                setToggledProperty("");
                document.getElementById("floating-toolbar").focus();
              }}
            />
          )}
        </Fragment>

        <Fragment>
          <TextColorBtn
            title="Color"
            className="inline"
            data-parent="floating-toolbar"
            textColor={colorText}
            onClick={() => {
              setToggledProperty(properties.colorText);
            }}
            onBlur={(e) => {
              // Check if new target element is being focused and if it's out
              // of scope of this toolbar
              if (
                idx(e, (_) => _.relatedTarget.id) === "floating-toolbar" ||
                idx(e, (_) => _.relatedTarget.dataset.parent) ===
                  "floating-toolbar"
              ) {
                // temporararily here there are no functions to be executed
              } else {
                document.getElementById("floating-toolbar").hidden = true;
                setToggledProperty("");
              }
            }}
          >
            A
          </TextColorBtn>
          {toggledProperty === properties.colorText && (
            <ColorPicker
              currentColor={colorText}
              leftPos={25}
              onChangeComplete={(color) => {
                setColorText(color);
                setToggledProperty("");
                document.getElementById("floating-toolbar").focus();
              }}
            />
          )}
        </Fragment>

        {/* Font size input */}
        <Fragment>
          <FontSizeInput
            data-parent="floating-toolbar"
            type="number"
            disabled={toggledProperty === properties.fontSize}
            placeholder="Size"
            value={fontSize}
            onChange={(e) => {
              setFontSize(e.target.value);
              // document.getElementById("floating-toolbar").focus();
            }}
            onBlur={() => {
              setToggledProperty("");
              document.getElementById("floating-toolbar").focus();
            }}
          />
        </Fragment>

        <Fragment>
          <FontWeightBtn
            className="inline"
            data-parent="floating-toolbar"
            fontWeight={fontWeight}
            onClick={() => {
              setToggledProperty(properties.fontWeight);
              if (fontWeight !== 600) setFontWeight(600);
              else setFontWeight(400);
              document.getElementById("floating-toolbar").focus();
            }}
          >
            B
          </FontWeightBtn>
        </Fragment>

        <Fragment>
          <BorderColorBtn
            title="Fill"
            className="inline"
            data-parent="floating-toolbar"
            borderColor={borderColor}
            onClick={() => {
              setToggledProperty(properties.borderColor);
            }}
            onBlur={(e) => {
              // Check if new target element is being focused and if it's out
              // of scope of this toolbar
              if (
                idx(e, (_) => _.relatedTarget.id) === "floating-toolbar" ||
                idx(e, (_) => _.relatedTarget.dataset.parent) ===
                  "floating-toolbar"
              ) {
                // temporararily here there are no functions to be executed
              } else {
                document.getElementById("floating-toolbar").hidden = true;
                setToggledProperty("");
              }
            }}
          />
          {toggledProperty === properties.borderColor && (
            <BorderStyleBox
              currentColor={borderColor}
              leftPos={25}
              onChangeComplete={(color) => {
                setBorderColor(color);
                // setToggledProperty("");
                document.getElementById("floating-toolbar").focus();
              }}
            />
          )}
        </Fragment>

        <Fragment>
          <TextUnderlineBtn
            className="inline"
            data-parent="floating-toolbar"
            hasUnderline={hasUnderline}
            onClick={() => {
              setToggledProperty(properties.underline);
              setUnderline(!hasUnderline);
              document.getElementById("floating-toolbar").focus();
            }}
          >
            U
          </TextUnderlineBtn>
        </Fragment>

        <Fragment>
          <button
            title="Opacity"
            className="inline"
            data-parent="floating-toolbar"
            onClick={() => {
              setToggledProperty("opacity");
            }}
            onBlur={(e) => {
              // Check if new target element is being focused and if it's out
              // of scope of this toolbar
              if (
                idx(e, (_) => _.relatedTarget.id) === "floating-toolbar" ||
                idx(e, (_) => _.relatedTarget.dataset.parent) ===
                  "floating-toolbar"
              ) {
                // temporararily here there are no functions to be executed
              } else {
                document.getElementById("floating-toolbar").hidden = true;
                setToggledProperty("");
              }
            }}
          >
            Opacity
          </button>
          {toggledProperty === "opacity" && (
            <OpacitySlider
              currentOpacity={opacity}
              leftPos={100}
              onChangeComplete={(arr) => {
                setUnderline(arr[0]);
                // setToggledProperty("");
                document.getElementById("floating-toolbar").focus();
              }}
            />
          )}
        </Fragment>

        <Fragment>
          <button>G/U</button>
        </Fragment>
      </div>
    </ToolbarContainer>
  );
};

export default Toolbar;
