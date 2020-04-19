import React, { Component, useEffect } from "react";
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

function TextIcon(props) {
  const status = useSelector((state) => state.main.currentStatus);
  const lastAddedElement = useSelector((state) => state.main.lastAddedElement);
  const dispatch = useDispatch();
  console.log(
    "useSelector",
    useSelector((state) => state)
  );
  const two = props.twoJSInstance;

  let rectangleInstance = null;
  let resizeRectInstance = null;
  let groupInstance = null;

  function onBlurHandler(e) {
    resizeRectInstance.opacity = 0;
    two.update();
  }

  function onFocusHandler(e) {
    document.getElementById(`${groupInstance.id}`).style.outline = 0;
  }

  if (status === "construct" || lastAddedElement.id === props.id) {
    // Calculate x and y through dividing width and height by 2 or vice versa
    // if x and y are given then multiply width and height into 2
    const offsetHeight = 0;

    const prevX = localStorage.getItem("rectangle_coordX");
    const prevY = localStorage.getItem("rectangle_coordY");

    const rectangle = two.makeRectangle(0, 0, 210, 110);
    rectangle.fill = "#EBECF0";
    rectangle.noStroke();
    rectangleInstance = rectangle;

    console.log("rectangle", rectangle.getBoundingClientRect());
    const calcResizeRectWidth = rectangle.getBoundingClientRect().width;
    const calcResizeRectHeight = rectangle.getBoundingClientRect().height;
    const resizeRect = two.makeRectangle(
      0,
      0,
      calcResizeRectWidth,
      calcResizeRectHeight
    );
    resizeRect.opacity = 0;
    resizeRectInstance = resizeRect;

    const group = two.makeGroup(rectangle, resizeRect);

    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;
    groupInstance = group;
    console.log("BUtton", props.twoJSInstance, resizeRectInstance.width);
    two.update();

    const getGroupElementFromDOM = document.getElementById(`${group.id}`);

    interact(`#${group.id}`).on("click", () => {
      console.log("on click ");
      resizeRect.opacity = 1;
      resizeRect.noFill();
      two.update();
    });

    getGroupElementFromDOM.addEventListener("focus", onFocusHandler);
    getGroupElementFromDOM.addEventListener("blur", onBlurHandler);

    interact(`#${group.id}`).resizable({
      edges: { right: true, left: true, top: true, bottom: true },

      listeners: {
        move(event) {
          var target = event.target;
          var rect = event.rect;

          // update the element's style
          //   resizeRect.width = rect.width;
          rectangle.width = rect.width;
          rectangle.height = rect.height;
          rectangle.radius = parseInt(rect.width / 2);

          const calcResizeRectWidth = rectangle.getBoundingClientRect().width;
          const calcResizeRectHeight = rectangle.getBoundingClientRect().height;

          resizeRect.width = calcResizeRectWidth;
          resizeRect.height = calcResizeRectHeight;
          //   target.style.width = rect.width + "px";
          //   target.style.height = rect.height + "px";

          //   target.textContent = rect.width + "×" + rect.height;
          two.update();
        },
        end(event) {
          console.log("the end");
        },
      },
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
          localStorage.setItem("rectangle_coordX", parseInt(event.pageX));
          localStorage.setItem(
            "rectangle_coordY",
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
      const groupID = document.getElementById(`${groupInstance.id}`);
      groupID.removeEventListener("blur", onBlurHandler);
      groupID.removeEventListener("focus", onFocusHandler);
      isMounted = false;
    };
  }, []);

  return (
    <React.Fragment>
      <div id="two-texticon"></div>

      {/* <button>change button in group</button> */}
    </React.Fragment>
  );
}

export default TextIcon;
