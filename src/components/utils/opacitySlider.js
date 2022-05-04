import React, { Fragment, useEffect } from "react";
import PropTypes from "prop-types";
import styled, { css } from "styled-components";
import { useRanger } from "react-ranger";
import { motion } from "framer-motion";

const SliderContainer = styled.div`
  width: 250px;
  height: 44px;
  border-radius: 6px;
`;

const Track = styled("div")`
  display: inline-block;
  height: 4px;
  width: 90%;
  margin: 0;
`;

const Tick = styled("div")`
  :before {
    content: "";
    position: absolute;
    left: 0px;
    background: #0052cc;
    height: 6px;
    width: 5px;
    border-radius: 50%;
    top: -2px;
  }
`;

const TickLabel = styled("div")`
  position: absolute;
  font-size: 0.6rem;
  color: rgba(0, 0, 0, 0.5);
  top: 100%;
  transform: translate(-50%, 1.2rem);
  white-space: nowrap;
`;

const Segment = styled("div")`
  background: ${(props) =>
    props.index === 0
      ? "#0052CC"
      : props.index === 1
      ? "#0052CC"
      : props.index === 2
      ? "#f5c200"
      : "#ff6050"};
  height: 50%;
`;

const Handle = styled("div")`
  position: absolute;
  top: -7px;
  background: #0052cc;
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 100%;
  left: -2px;
  cursor: pointer;
`;

const OpacitySlider = ({ title, onChangeComplete, currentOpacity }) => {
  const [values, setValues] = React.useState([1]);

  const { getTrackProps, ticks, segments, handles } = useRanger({
    values,
    onChange: (e) => {
      setValues(e);
      onChangeComplete(e);
    },
    min: 0,
    max: 1,
    steps: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    ticks: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
  });

  useEffect(() => {
    let arr = currentOpacity ? [currentOpacity] : [0];
    setValues(arr);
  }, []);

  return (
    <Fragment>
      <SliderContainer data-parent="floating-toolbar" className={` pr-4 py-1 `}>
        {title && <div className="p-1 text-left">{title}</div>}
        <Track
          className=" relative"
          data-parent="floating-toolbar"
          {...getTrackProps()}
        >
          {ticks.map(({ value, getTickProps }) => (
            <Tick data-parent="floating-toolbar" {...getTickProps()}>
              {/* <TickLabel data-parent="floating-toolbar">{value}</TickLabel> */}
            </Tick>
          ))}
          {segments.map(({ getSegmentProps }, i) => (
            <Segment
              data-parent="floating-toolbar"
              {...getSegmentProps()}
              index={i}
            />
          ))}
          {handles.map(({ value, active, getHandleProps }) => (
            <div data-parent="floating-toolbar" {...getHandleProps()}>
              <Handle data-parent="floating-toolbar" active={active}></Handle>
            </div>
          ))}
        </Track>
      </SliderContainer>
    </Fragment>
  );
};

OpacitySlider.defaultProps = {
  currentOpacity: 1,
};

OpacitySlider.propTypes = {
  currentOpacity: PropTypes.number,
  onChangeComplete: PropTypes.func,
};

export default OpacitySlider;
