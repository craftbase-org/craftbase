import React, { Fragment, useState } from "react";
import ColorPicker from "components/utils/colorPicker";
import styled, { css } from "styled-components";
import { properties } from "utils/constants";
import idx from "idx";

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
  const [toggledProperty, setToggledProperty] = useState("");
  const [colorBg, setColorBg] = useState("#000");
  const [colorText, setColorText] = useState("#fff");
  const [fontSize, setFontSize] = useState(18);
  const [fontWeight, setFontWeight] = useState(400);
  const [borderColor, setBorderColor] = useState("#000");

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
    <div id="floating-toolbar" tabIndex="1">
      <div className="inline-block relative">
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
              if (
                idx(e, (_) => _.relatedTarget.id) === "floating-toolbar" ||
                idx(e, (_) => _.relatedTarget.dataset.parent) ===
                  "floating-toolbar"
              ) {
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
              if (
                idx(e, (_) => _.relatedTarget.id) === "floating-toolbar" ||
                idx(e, (_) => _.relatedTarget.dataset.parent) ===
                  "floating-toolbar"
              ) {
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
              if (
                idx(e, (_) => _.relatedTarget.id) === "floating-toolbar" ||
                idx(e, (_) => _.relatedTarget.dataset.parent) ===
                  "floating-toolbar"
              ) {
              } else {
                document.getElementById("floating-toolbar").hidden = true;
                setToggledProperty("");
              }
            }}
          />
          {toggledProperty === properties.borderColor && (
            <ColorPicker
              leftPos={100}
              currentColor={borderColor}
              onChangeComplete={(color) => {
                setBorderColor(color);
                setToggledProperty("");
                document.getElementById("floating-toolbar").focus();
              }}
            />
          )}
        </Fragment>
      </div>
    </div>
  );
};

export default Toolbar;
