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
import Icon from "icons/icons";
import { ReactReduxContext } from "utils/misc";
import { getDiffForTwoValues } from "utils";
import { setPeronsalInformation } from "redux/actions/main";

// const useSelector = createSelectorHook(ReactReduxContext);
// const useDispatch = createDispatchHook(ReactReduxContext);

function Avatar(props) {
  const status = useSelector((state) => state.main.currentStatus);
  const lastAddedElement = useSelector((state) => state.main.lastAddedElement);
  const dispatch = useDispatch();

  const two = props.twoJSInstance;

  let circleInstance = null;
  let externalSVGInstance = null;
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

    const prevX = localStorage.getItem("button_coordX");
    const prevY = localStorage.getItem("button_coordY");

    const circle = two.makeCircle(0, 0, 40);
    circle.fill = "#000";
    circleInstance = circle;

    const svgImage = new DOMParser().parseFromString(
      Icon.ICON_IMAGE_1.data,
      "text/xml"
    );
    console.log("svgImage", svgImage, circle.width / 2);
    const externalSVG = two.interpret(svgImage.firstChild);
    // externalSVG.translation.x = -circle.width / 8;
    // externalSVG.translation.y = -circle.height / 8;
    externalSVG.scale = 1.5;
    externalSVG.center();
    externalSVGInstance = externalSVG;

    const initialScaleCoefficient = parseInt(circle.radius / externalSVG.scale);

    const calcResizeRectWidth = circle.getBoundingClientRect().width;
    const calcResizeRectHeight = circle.getBoundingClientRect().height;
    const resizeRect = two.makeRectangle(
      0,
      0,
      calcResizeRectWidth,
      calcResizeRectHeight
    );
    resizeRect.opacity = 0;
    resizeRectInstance = resizeRect;

    const group = two.makeGroup(resizeRect, circle, externalSVG);

    group.center();
    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;
    groupInstance = group;
    // console.log("Avatar", props.twoJSInstance);
    two.update();

    const getGroupElementFromDOM = document.getElementById(`${group.id}`);
    getGroupElementFromDOM.addEventListener("focus", onFocusHandler);
    getGroupElementFromDOM.addEventListener("blur", onBlurHandler);

    interact(`#${group.id}`).on("click", () => {
      console.log("on click ");
      resizeRect.opacity = 1;
      resizeRect.noFill();
      two.update();
    });

    // Captures double click event for text
    // and generates temporary textarea support for it

    interact(`#${group.id}`).resizable({
      edges: { right: true, left: true, top: true, bottom: true },

      listeners: {
        move(event) {
          var rect = event.rect;

          // update the element's style
          circle.width = rect.width;
          circle.height = rect.height;
          circle.radius = parseInt(rect.width / 2);

          const calcResizeRectWidth = circle.getBoundingClientRect().width;
          const calcResizeRectHeight = circle.getBoundingClientRect().height;

          console.log(" circle.width", circle.radius, initialScaleCoefficient);

          externalSVG.scale = circle.radius / initialScaleCoefficient;
          externalSVG.center();

          resizeRect.width = calcResizeRectWidth;
          resizeRect.height = calcResizeRectHeight;

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
          localStorage.setItem("button_coordX", parseInt(event.pageX));
          localStorage.setItem(
            "button_coordY",
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

      // In case if group instance is null
      if (groupInstance) {
        const groupID = document.getElementById(`${groupInstance.id}`);
        groupID.removeEventListener("blur", onBlurHandler);
        groupID.removeEventListener("focus", onFocusHandler);
      }

      isMounted = false;
    };
  }, []);

  return (
    <React.Fragment>
      <div id="two-button"></div>
      <button>change button in group</button>
    </React.Fragment>
  );
}

Avatar.propTypes = {
  x: PropTypes.string,
  y: PropTypes.string,
};

Avatar.defaultProps = {
  x: 100,
  y: 50,
};

export default Avatar;
