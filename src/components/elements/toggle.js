import React, { Component, useEffect, useState } from "react";
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
import ObjectSelector from "components/utils/objectSelector";
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

  let rectangleInstance = null;
  let circleInstance = null;
  let groupInstance = null;
  let selectorInstance = null;

  function onBlurHandler(e) {
    console.log("on blur handler called");
    selectorInstance.hide();
    two.update();
  }

  function onFocusHandler(e) {
    document.getElementById(`${groupInstance.id}`).style.outline = 0;
  }

  if (status === "construct" || lastAddedElement.id === props.id) {
    // Calculate x and y through dividing width and height by 2 or vice versa
    // if x and y are given then multiply width and height into 2
    const offsetHeight = 0;

    const prevX = localStorage.getItem("toggle_coordX");
    const prevY = localStorage.getItem("toggle_coordY");

    const rect = two.makeRoundedRectangle(0, 0, 55, 30, 16);
    rect.fill = "#0747A6";
    rect.noStroke();
    rectangleInstance = rect;

    const calcCirclePointX = parseInt(rect.width / 4);

    const circle = two.makeCircle(calcCirclePointX, 0, 10);
    circle.noStroke();
    circleInstance = circle;

    const rectCircleGroup = two.makeGroup(rect, circle);

    const group = two.makeGroup(rectCircleGroup);

    // const calcX = parseInt(prevX) + (parseInt(rect.width / 2) - 10);
    // const calcY = parseInt(prevY) - (parseInt(46) - parseInt(rect.height / 2));
    // group.center();
    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;
    groupInstance = group;

    const selector = new ObjectSelector(two, group, 0, 0, 0, 0);
    selector.create();
    selectorInstance = selector;

    group.children.unshift(rectCircleGroup);

    console.log("BUtton", props.twoJSInstance);
    two.update();

    const getGroupElementFromDOM = document.getElementById(`${group.id}`);
    getGroupElementFromDOM.addEventListener("focus", onFocusHandler);
    getGroupElementFromDOM.addEventListener("blur", onBlurHandler);

    // Does capture event of toggle me button rendered prior to this element rendering
    document.getElementById("add-1-2").addEventListener("click", () => {
      console.log("on click captured");
      let toggleCircle = circleInstance;
      let toggleRect = rectangleInstance;
      const calcCirclePointX = parseInt(toggleRect.width / 4);
      toggleCircle.translation.x = parseInt(-calcCirclePointX);
      toggleRect.fill = "#ccc";
      two.update();
    });

    interact(`#${group.id}`).on("click", () => {
      selector.update(
        rectCircleGroup.getBoundingClientRect(true).left - 4,
        rectCircleGroup.getBoundingClientRect(true).right + 4,
        rectCircleGroup.getBoundingClientRect(true).top - 4,
        rectCircleGroup.getBoundingClientRect(true).bottom + 4
      );
      two.update();
    });

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

  // Using unmount phase to remove event listeners
  useEffect(() => {
    let isMounted = true;
    return () => {
      console.log("UNMOUNTING", groupInstance);

      // // In case if group instance is null
      // if (groupInstance) {
      //   const groupID = document.getElementById(`${groupInstance.id}`);
      //   groupID.removeEventListener("blur", onBlurHandler);
      //   groupID.removeEventListener("focus", onFocusHandler);
      // }

      isMounted = false;
    };
  }, []);

  return (
    <React.Fragment>
      <div id="two-toggle"></div>

      <button id="btn-toggle-1">Toggle btn</button>
      {/* <button>change button in group</button> */}
    </React.Fragment>
  );
}

export default Toggle;
