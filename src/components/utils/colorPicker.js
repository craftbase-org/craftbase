import React, { Fragment, useState } from "react";
import PropTypes from "prop-types";
import styled, { css } from "styled-components";
import { allColorShades, essentialShades } from "utils/constants";
import Icon from "icons/icon";
import { motion, AnimatePresence } from "framer-motion";

const ColorPickerContainer = styled.div`
  width: 250px;
  margin: 0 auto;
  height: auto;
  background: transparent;
  text-align: left;
`;

const ColorSelector = styled(motion.button)`
  border-radius: 50%;
  ${(props) =>
    props.colorPaint &&
    css`
      background: ${props.colorPaint};
    `};
`;

const CurrentColorIndicator = styled.div`
  border-radius: 50%;
  ${(props) =>
    props.colorPaint &&
    css`
      background: ${props.colorPaint};
    `};
`;

const ColorPicker = ({ title, onChangeComplete, currentColor }) => {
  const [showAllColors, ToggleShowAllColors] = useState(false);

  const renderColorBtns = () => {
    const colorsArr = showAllColors ? allColorShades : essentialShades;
    const showColors = colorsArr.map((color, index) => {
      return (
        <Fragment key={index}>
          <AnimatePresence>
            <ColorSelector
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              title={color == "rgba(0,0,0,0.0)" ? "transparent" : color}
              data-parent="floating-toolbar"
              className={`m-1 w-5 h-5 `}
              colorPaint={color}
              onClick={() => {
                onChangeComplete(color);
              }}
            />
          </AnimatePresence>
        </Fragment>
      );
    });
    return showColors;
  };

  return (
    <Fragment>
      {title && <div className="p-1 text-left">{title}</div>}
      <ColorPickerContainer
        id="color-picker-toolbar"
        data-parent="floating-toolbar"
        className={`p-1 `}
      >
        <div className="flex justify-start items-center my-4">
          <div className="border-2 border-radius-50 border-gray-500">
            {" "}
            <CurrentColorIndicator
              title={
                currentColor == "rgba(0,0,0,0.0)" ? "transparent" : currentColor
              }
              data-parent="floating-toolbar"
              className={`m-1 w-6 h-6 `}
              colorPaint={currentColor}
              // onClick={() => {
              //   onChangeComplete(color);
              // }}
            />
          </div>
          <input
            className="shadow appearance-none border w-40 py-2 px-3 ml-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            // id="color-code-input"
            type="text"
            placeholder="Color"
            value={
              currentColor == "rgba(0,0,0,0.0)" ? "transparent" : currentColor
            }
            disabled
          />
        </div>

        <div className="mt-4 mb-1">
          {renderColorBtns()}
          <button
            className={`m-1  transition duration-300 ${
              showAllColors && `transform-rotate-45`
            }`}
            onClick={() => ToggleShowAllColors(!showAllColors)}
          >
            <Icon icon="ICON_ADD" width={22} height={22} />
          </button>
        </div>
      </ColorPickerContainer>
    </Fragment>
  );
};

ColorPicker.defaultProps = {
  leftPos: 4,
  currentColor: "#fff",
};

ColorPicker.propTypes = {
  leftPos: PropTypes.number,
  currentColor: PropTypes.string,
  onChangeComplete: PropTypes.func,
};

export default ColorPicker;
