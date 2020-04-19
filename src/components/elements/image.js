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
import { ReactReduxContext } from "utils/misc";
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

    const rectangle = two.makeRectangle(0, 0, 210, 210);
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

    const svgImage = new DOMParser().parseFromString(
      Icon.ICON_IMAGE.data,
      "text/xml"
    );
    console.log("svgImage", externalSVG);
    var externalSVG = two.interpret(svgImage.firstChild);
    externalSVG.children[0].fill = "rgba(0,0,0,0.3)";
    // externalSVG.children[0].stroke = "#EBECF0";
    externalSVG.translation.x = -(rectangle.width / 6.5);
    externalSVG.translation.y = -(rectangle.height / 6.5);

    const group = two.makeGroup(rectangle, resizeRect, externalSVG);

    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;

    groupInstance = group;
    console.log("BUtton", props.twoJSInstance, rectangle.id);
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

    let initialRectangleWidth = parseInt(rectangle.width);
    let initialRectangleHeight = parseInt(rectangle.height);

    interact(`#${group.id}`).resizable({
      edges: { right: true, left: true, top: true, bottom: true },

      listeners: {
        move(event) {
          var target = event.target;
          var rect = event.rect;

          /* Getting transform matrix of svg to manipulate later */
          let externalSVGMatrix = document
            .getElementById(`${externalSVG.id}`)
            .getAttribute("transform");
          externalSVGMatrix = externalSVGMatrix
            ? externalSVGMatrix.split("(")[1].split(" ")
            : "matrix(4,0,0,4,0,0)";
          let widthOffset = parseFloat(externalSVGMatrix[0]);

          console.log(
            "rectangle",
            rect,
            externalSVGMatrix,
            widthOffset // externalSVG.translation
          );

          let oldRectWidth = parseInt(rectangle.width);
          let oldRectHeight = parseInt(rectangle.height);
          let newRectWidth = parseInt(rect.width);
          let newRectHeight = parseInt(rect.height);

          let externalSVGBottom = document
            .getElementById(`${externalSVG.id}`)
            .getBoundingClientRect().bottom;

          let bottomOffsetRestriction =
            rect.bottom - externalSVGBottom > newRectHeight / 7;

          console.log(
            "comparision rects",
            newRectWidth > oldRectWidth,
            newRectHeight > oldRectHeight,
            bottomOffsetRestriction
          );

          if (
            bottomOffsetRestriction &&
            (newRectWidth > oldRectWidth || newRectHeight > oldRectHeight)
          ) {
            rectangle.width = newRectWidth;
            rectangle.height = newRectHeight;

            let avgWidthHeight = parseFloat(
              (rectangle.height + rectangle.width) / 2
            );
            let avgInitialWidthHeight = parseFloat(
              (initialRectangleHeight + initialRectangleWidth) / 2
            );

            let rectWidthDiff =
              parseFloat(avgWidthHeight - avgInitialWidthHeight) * 0.019;

            console.log(
              "comparision rects 1",
              rectWidthDiff,
              avgWidthHeight,
              avgInitialWidthHeight
            );
            document.getElementById(
              `${externalSVG.id}`
            ).style.transform = `matrix(${widthOffset + rectWidthDiff},0,0,${
              widthOffset + rectWidthDiff
            },${-(rectangle.width / 6.5)},${-(rectangle.height / 6.5)})`;
            // document.getElementById(`${externalSVG.id}`).style.transform = `matrix(4,0,0,4,0,0)`;

            const calcResizeRectWidth = rectangle.getBoundingClientRect().width;
            const calcResizeRectHeight = rectangle.getBoundingClientRect()
              .height;

            resizeRect.width = calcResizeRectWidth;
            resizeRect.height = calcResizeRectHeight;
            //   target.style.width = rect.width + "px";
            //   target.style.height = rect.height + "px";

            //   target.textContent = rect.width + "×" + rect.height;
          } else if (bottomOffsetRestriction && newRectWidth < oldRectWidth) {
            rectangle.width = newRectWidth;
            rectangle.height = newRectHeight;

            let avgWidthHeight = parseFloat(
              (rectangle.height + rectangle.width) / 2
            );
            let avgInitialWidthHeight = parseFloat(
              (initialRectangleHeight + initialRectangleWidth) / 2
            );

            let rectWidthDiff =
              parseFloat(avgWidthHeight - avgInitialWidthHeight) * 0.019;

            console.log(
              "comparision rects 22",
              rectWidthDiff,
              widthOffset + rectWidthDiff
            );
            document.getElementById(
              `${externalSVG.id}`
            ).style.transform = `matrix(${widthOffset + rectWidthDiff},0,0,${
              widthOffset + rectWidthDiff
            },${-(rectangle.width / 6.5)},${-(rectangle.height / 6.5)})`;
            // document.getElementById(`${externalSVG.id}`).style.transform = `matrix(4,0,0,4,0,0)`;

            const calcResizeRectWidth = rectangle.getBoundingClientRect().width;
            const calcResizeRectHeight = rectangle.getBoundingClientRect()
              .height;

            resizeRect.width = calcResizeRectWidth;
            resizeRect.height = calcResizeRectHeight;
          } else if (bottomOffsetRestriction && newRectHeight < oldRectHeight) {
            rectangle.width = newRectWidth;
            rectangle.height = newRectHeight;

            let avgWidthHeight = parseFloat(
              (rectangle.height + rectangle.width) / 2
            );
            let avgInitialWidthHeight = parseFloat(
              (initialRectangleHeight + initialRectangleWidth) / 2
            );

            let rectHeightDiff =
              parseFloat(avgWidthHeight - avgInitialWidthHeight) * 0.019;

            console.log(
              "comparision rects 22",
              rectHeightDiff,
              widthOffset + rectHeightDiff
            );
            document.getElementById(
              `${externalSVG.id}`
            ).style.transform = `matrix(${widthOffset + rectHeightDiff},0,0,${
              widthOffset + rectHeightDiff
            },${-(rectangle.width / 6.5)},${-(rectangle.height / 6.5)})`;
            // document.getElementById(`${externalSVG.id}`).style.transform = `matrix(4,0,0,4,0,0)`;

            const calcResizeRectWidth = rectangle.getBoundingClientRect().width;
            const calcResizeRectHeight = rectangle.getBoundingClientRect()
              .height;

            resizeRect.width = calcResizeRectWidth;
            resizeRect.height = calcResizeRectHeight;
          } else {
            console.log("comparision rects 4");
            rectangle.width = newRectWidth;
            rectangle.height = newRectHeight;

            let avgWidthHeight = parseFloat(
              (rectangle.height + rectangle.width) / 2
            );
            let avgInitialWidthHeight = parseFloat(
              (initialRectangleHeight + initialRectangleWidth) / 2
            );

            let rectWidthDiff =
              parseFloat(avgWidthHeight - avgInitialWidthHeight) * 0.019;

            document.getElementById(
              `${externalSVG.id}`
            ).style.transform = `matrix(${widthOffset + rectWidthDiff},0,0,${
              widthOffset + rectWidthDiff
            },${-(rectangle.width / 6.5)},${-(rectangle.height / 6.5)})`;

            const calcResizeRectWidth = rectangle.getBoundingClientRect().width;
            const calcResizeRectHeight = rectangle.getBoundingClientRect()
              .height;

            resizeRect.width = calcResizeRectWidth;
            resizeRect.height = calcResizeRectHeight;
            //   target.style.width = rect.width + "px";
            //   target.style.height = rect.height + "px";

            //   target.textContent = rect.width + "×" + rect.height;
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
      <div id="two-rectangle"></div>

      {/* <button>change button in group</button> */}
    </React.Fragment>
  );
}

export default Image;
