import React, { Fragment } from "react";
import PropTypes from "prop-types";
import styled, { css } from "styled-components";
import { allColorShades } from "utils/constants";

const ColorPickerContainer = styled.div`
  width: 220px;
  height: 210px;
  background: #fff;
  border-radius: 6px;
  top: -220px;
`;

const ColorSelector = styled.button`
  border-radius: 50%;
  ${(props) =>
    props.colorPaint &&
    css`
      background: ${props.colorPaint};
    `};
`;

const ColorPicker = ({ leftPos, onChangeComplete, currentColor }) => {
  const renderColorBtns = () => {
    const showColors = allColorShades.map((color, index) => {
      return (
        <Fragment key={index}>
          <ColorSelector
            title={color == "rgba(0,0,0,0.0)" ? "transparent" : color}
            data-parent="floating-toolbar"
            className={`m-1 w-5 h-5 ${
              currentColor == color && `border-2 border-black align-top`
            }`}
            colorPaint={color}
            onClick={() => {
              onChangeComplete(color);
            }}
          />
        </Fragment>
      );
    });
    return showColors;
  };

  return (
    <Fragment>
      <ColorPickerContainer
        id="color-picker-toolbar"
        data-parent="floating-toolbar"
        className={`absolute p-1 pos-left-${leftPos}`}
      >
        {renderColorBtns()}
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
