import React, { Component } from "react";
import PropTypes from "prop-types";
import idx from "idx";
import Two from "two.js";
import interact from "interactjs";
import {
  createSelectorHook,
  createDispatchHook,
  useDispatch,
  useSelector,
} from "react-redux";
import { ReactReduxContext } from "utils/misc";
import { setPeronsalInformation } from "redux/actions/main";

// const useSelector = createSelectorHook(ReactReduxContext);
// const useDispatch = createDispatchHook(ReactReduxContext);

function Toggle(props) {
  const status = useSelector((state) => state.main.currentStatus);
  const lastAddedElement = useSelector((state) => state.main.lastAddedElement);
  const dispatch = useDispatch();
  console.log(
    "useSelector",
    useSelector((state) => state)
  );
  const two = props.twoJSInstance;
  console.log(
    "CONDITION",
    props.id,
    props.twoJSInstance &&
      (status === "construct" || lastAddedElement.id === props.id)
  );
  if (
    props.twoJSInstance &&
    (status === "construct" || lastAddedElement.id === props.id)
  ) {
    // Calculate x and y through dividing width and height by 2 or vice versa
    // if x and y are given then multiply width and height into 2
    const offsetHeight = 0;

    const prevX = localStorage.getItem("toggle_coordX");
    const prevY = localStorage.getItem("toggle_coordY");

    const rect = two.makeRoundedRectangle(0, 0, 65, 45, 25);
    rect.fill = "#0747A6";
    rect.noStroke();

    const calcCirclePointX = parseInt(rect.width / 4);

    const circle = two.makeCircle(calcCirclePointX, 0, 10);

    const group = two.makeGroup(rect, circle);

    // const calcX = parseInt(prevX) + (parseInt(rect.width / 2) - 10);
    // const calcY = parseInt(prevY) - (parseInt(46) - parseInt(rect.height / 2));
    // group.center();
    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;
    console.log("BUtton", props.twoJSInstance);
    two.update();

    interact(`#${group.id}`).draggable({
      // enable inertial throwing
      inertia: false,

      listeners: {
        start(event) {
          // console.log(event.type, event.target);
        },
        move(event) {
          event.target.style.transform = `translate(${event.pageX}px, ${
            event.pageY - offsetHeight
          }px)`;
        },
        end(event) {
          console.log(
            "event x",
            event.target.getBoundingClientRect(),
            event.rect.left,
            event.pageX,
            event.clientX
          );
          // alternate -> take event.rect.left for x
          localStorage.setItem("toggle_coordX", parseInt(event.pageX));
          localStorage.setItem(
            "toggle_coordY",
            parseInt(event.pageY - offsetHeight)
          );
          dispatch(setPeronsalInformation("COMPLETE", { data: {} }));
        },
      },
    });
  }

  return (
    <React.Fragment>
      <div id="two-toggle"></div>
      {/* <button>change button in group</button> */}
    </React.Fragment>
  );
}

export default Toggle;
