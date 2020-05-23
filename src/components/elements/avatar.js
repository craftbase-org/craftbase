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
import ObjectSelector from "components/utils/objectSelector";
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
  let groupInstance = null;
  let selectorInstance = null;

  function onBlurHandler(e) {
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

    const prevX = localStorage.getItem("avatar_coordX");
    const prevY = localStorage.getItem("avatar_coordY");

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

    const circleSvgGroup = two.makeGroup(circle, externalSVG);

    const group = two.makeGroup(circleSvgGroup);

    group.center();
    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;
    groupInstance = group;

    const selector = new ObjectSelector(two, group, 0, 0, 0, 0, 4);
    selector.create();
    selectorInstance = selector;

    group.children.unshift(circleSvgGroup);

    // console.log("Avatar", props.twoJSInstance);
    two.update();

    const getGroupElementFromDOM = document.getElementById(`${group.id}`);
    getGroupElementFromDOM.addEventListener("focus", onFocusHandler);
    getGroupElementFromDOM.addEventListener("blur", onBlurHandler);

    interact(`#${group.id}`).on("click", () => {
      console.log("on click ");
      selector.update(
        circle.getBoundingClientRect(true).left - 3,
        circle.getBoundingClientRect(true).right + 3,
        circle.getBoundingClientRect(true).top - 3,
        circle.getBoundingClientRect(true).bottom + 3
      );
      two.update();
    });

    // Captures double click event for text
    // and generates temporary textarea support for it

    interact(`#${group.id}`).resizable({
      edges: { right: true, left: true, top: true, bottom: true },

      listeners: {
        move(event) {
          const rect = event.rect;
          const rectRadii = parseInt(rect.width / 2);

          // Prevent the circle radius to be shrinked to less than 10
          if (rectRadii > 11) {
            // update the element's style
            circle.width = rect.width;
            circle.height = rect.height;
            circle.radius = parseInt(rect.width / 2);

            // console.log("circle.radius", circle.radius);
            externalSVG.scale = circle.radius / initialScaleCoefficient;
            externalSVG.center();

            selector.update(
              circle.getBoundingClientRect(true).left - 3,
              circle.getBoundingClientRect(true).right + 3,
              circle.getBoundingClientRect(true).top - 3,
              circle.getBoundingClientRect(true).bottom + 3
            );
          }

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
          localStorage.setItem("avatar_coordX", parseInt(event.pageX));
          localStorage.setItem(
            "avatar_coordY",
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
