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
import { setPeronsalInformation } from "redux/actions/main";

// const useSelector = createSelectorHook(ReactReduxContext);
// const useDispatch = createDispatchHook(ReactReduxContext);

function Divider(props) {
  const status = useSelector((state) => state.main.currentStatus);
  const lastAddedElement = useSelector((state) => state.main.lastAddedElement);
  const dispatch = useDispatch();

  const two = props.twoJSInstance;

  let rectangleInstance = null;
  let resizeLineInstance = null;
  let groupInstance = null;

  function onBlurHandler(e) {
    resizeLineInstance.opacity = 0;
    two.update();
  }

  function onFocusHandler(e) {
    document.getElementById(`${groupInstance.id}`).style.outline = 0;
  }

  if (status === "construct" || lastAddedElement.id === props.id) {
    // Calculate x and y through dividing width and height by 2 or vice versa
    // if x and y are given then multiply width and height into 2
    const offsetHeight = 0;

    const prevX = localStorage.getItem("line_coordX");
    const prevY = localStorage.getItem("line_coordY");

    let line = two.makeLine(100, 100, 400, 100);
    line.linewidth = 2;

    const pointCircle1 = two.makeEllipse(0, 0, 5, 5);
    pointCircle1.fill = "#0052CC";
    pointCircle1.noStroke();

    const pointCircle2 = two.makeEllipse(10, 0, 5, 5);
    pointCircle2.fill = "#0052CC";
    pointCircle2.noStroke();

    const resizeLine = two.makeGroup(pointCircle1, pointCircle2);
    resizeLine.translation.y = -line.linewidth + 1;
    resizeLine.opacity = 1;
    resizeLineInstance = resizeLine;

    let group = two.makeGroup(line, resizeLine);
    console.log("main group", group.getBoundingClientRect());

    // Overriding the circle point group's coordinate and
    // manipulating it with line's coordinate
    pointCircle1.translation.x = line.getBoundingClientRect().left;
    pointCircle1.translation.y = line.getBoundingClientRect().bottom;
    pointCircle2.translation.x = line.getBoundingClientRect().right;
    pointCircle2.translation.y = line.getBoundingClientRect().bottom;

    // const calcX = parseInt(prevX) + (parseInt(rectangle.width / 2) - 10);
    // const calcY = parseInt(prevY) - (parseInt(46) - parseInt(rectangle.height / 2));
    group.center();
    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;
    groupInstance = group;
    console.log("BUtton", props.twoJSInstance);
    two.update();

    const getGroupElementFromDOM = document.getElementById(`${group.id}`);
    getGroupElementFromDOM.addEventListener("focus", onFocusHandler);
    getGroupElementFromDOM.addEventListener("blur", onBlurHandler);

    interact(`#${group.id}`).on("click", () => {
      console.log("on click ");
      resizeLine.opacity = 1;

      two.update();
    });

    // Captures double click event for text
    // and generates temporary textarea support for it

    interact(`#${group.id}`).resizable({
      edges: { right: true, left: true },

      listeners: {
        start() {
          resizeLine.opacity = 1;
        },
        move(event) {
          var target = event.target;
          var rect = event.rect;
          console.log("on resize event", event);

          // update the element's style
          //   resizeLine.width = rect.width;
          line.vertices[0].x -= event.dx;
          line.vertices[1].x += event.dx;
          pointCircle1.translation.x = line.vertices[0].x;
          pointCircle2.translation.x = line.vertices[1].x;

          // rectangle.radius = parseInt(rect.width / 2);

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
          localStorage.setItem("line_coordX", parseInt(event.pageX));
          localStorage.setItem(
            "line_coordY",
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

Divider.propTypes = {
  x: PropTypes.string,
  y: PropTypes.string,
};

Divider.defaultProps = {
  x: 100,
  y: 50,
};

export default Divider;
