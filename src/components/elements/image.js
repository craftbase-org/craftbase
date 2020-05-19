import React, { Component, useEffect } from "react";
import PropTypes from "prop-types";
import idx from "idx";
import Two from "two.js";
import interact from "interactjs";
import Icon from "icons/icons";
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

function Image(props) {
  const status = useSelector((state) => state.main.currentStatus);
  const lastAddedElement = useSelector((state) => state.main.lastAddedElement);
  const dispatch = useDispatch();
  console.log(
    "useSelector",
    useSelector((state) => state)
  );
  const two = props.twoJSInstance;

  let rectangleInstance = null;
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

    const prevX = localStorage.getItem("image_coordX");
    const prevY = localStorage.getItem("image_coordY");

    const rectangle = two.makeRectangle(0, 0, 60, 60);
    rectangle.fill = "#000";
    rectangleInstance = rectangle;

    const svgImage = new DOMParser().parseFromString(
      Icon.ICON_IMAGE_1.data,
      "text/xml"
    );
    console.log("svgImage", svgImage, rectangle.width / 2);
    const externalSVG = two.interpret(svgImage.firstChild);
    // externalSVG.translation.x = -rectangle.width / 8;
    // externalSVG.translation.y = -rectangle.height / 8;
    externalSVG.scale = 1.5;
    externalSVG.center();
    externalSVGInstance = externalSVG;

    const initialScaleCoefficient = parseInt(
      rectangle.width + rectangle.height / externalSVG.scale
    );

    const circleSvgGroup = two.makeGroup(rectangle, externalSVG);

    const group = two.makeGroup(circleSvgGroup);

    group.center();
    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;
    groupInstance = group;

    const selector = new ObjectSelector(two, group, 0, 0, 0, 0, true);
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
        rectangle.getBoundingClientRect(true).left - 3,
        rectangle.getBoundingClientRect(true).right + 3,
        rectangle.getBoundingClientRect(true).top - 3,
        rectangle.getBoundingClientRect(true).bottom + 3
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
          const minRectHeight = parseInt(rect.height / 2);
          const minRectWidth = parseInt(rect.width / 2);

          // Restrict width and height at arbitrary point difference where it would
          // be unstable for further SVG scaling calculations
          const minDiff = Math.abs(rect.width - rect.height);

          // Prevent the rectangle radius to be shrinked to less than 10
          if (minRectHeight > 20 && minRectWidth > 20 && minDiff < 100) {
            // update the element's style
            rectangle.width = rect.width - 10;
            rectangle.height = rect.height - 10;

            // console.log("rectangle.radius", rectangle.radius);
            externalSVG.scale =
              ((rectangle.width + rectangle.height / 2) /
                initialScaleCoefficient) *
              1.5;
            externalSVG.center();

            selector.update(
              rectangle.getBoundingClientRect(true).left - 3,
              rectangle.getBoundingClientRect(true).right + 3,
              rectangle.getBoundingClientRect(true).top - 3,
              rectangle.getBoundingClientRect(true).bottom + 3
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
          localStorage.setItem("image_coordX", parseInt(event.pageX));
          localStorage.setItem(
            "image_coordY",
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
      // const groupID = document.getElementById(`${groupInstance.id}`);
      // groupID.removeEventListener("blur", onBlurHandler);
      // groupID.removeEventListener("focus", onFocusHandler);
      isMounted = false;
    };
  }, []);

  return (
    <React.Fragment>
      <div id="two-rectangle"></div>

      {/* <button>change button in group</button> */}
    </React.Fragment>
  );
}

export default Image;
