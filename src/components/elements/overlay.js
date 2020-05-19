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
import ObjectSelector from "components/utils/objectSelector";
import { setPeronsalInformation } from "redux/actions/main";

// const useSelector = createSelectorHook(ReactReduxContext);
// const useDispatch = createDispatchHook(ReactReduxContext);

function Overlay(props) {
  const status = useSelector((state) => state.main.currentStatus);
  const lastAddedElement = useSelector((state) => state.main.lastAddedElement);
  const dispatch = useDispatch();
  console.log(
    "useSelector",
    useSelector((state) => state)
  );
  const two = props.twoJSInstance;

  let rectangleInstance = null;
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

    const prevX = localStorage.getItem("overlay_coordX");
    const prevY = localStorage.getItem("overlay_coordY");

    const rectangle = two.makeRectangle(0, 0, 210, 110);
    rectangle.fill = "#6d6d6d";
    rectangle.opacity = 0.5;
    rectangle.noStroke();
    rectangleInstance = rectangle;

    console.log("rectangle", rectangle.getBoundingClientRect());

    const group = two.makeGroup(rectangle);

    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;
    groupInstance = group;
    console.log("BUtton", props.twoJSInstance);

    const selector = new ObjectSelector(two, group, 0, 0, 0, 0, true);
    selector.create();
    selectorInstance = selector;

    group.children.unshift(rectangle);

    two.update();

    const getGroupElementFromDOM = document.getElementById(`${group.id}`);
    getGroupElementFromDOM.addEventListener("focus", onFocusHandler);
    getGroupElementFromDOM.addEventListener("blur", onBlurHandler);

    interact(`#${group.id}`).on("click", () => {
      console.log("on click ");
      selector.update(
        rectangle.getBoundingClientRect(true).left - 10,
        rectangle.getBoundingClientRect(true).right + 10,
        rectangle.getBoundingClientRect(true).top - 10,
        rectangle.getBoundingClientRect(true).bottom + 10
      );
      two.update();
    });

    interact(`#${group.id}`).resizable({
      edges: { right: true, left: true, top: true, bottom: true },

      listeners: {
        move(event) {
          const target = event.target;
          const rect = event.rect;

          const minRectHeight = parseInt(rect.height / 2);
          const minRectWidth = parseInt(rect.width / 2);

          if (minRectHeight > 20 && minRectWidth > 20) {
            rectangle.width = rect.width;
            rectangle.height = rect.height;

            selector.update(
              rectangle.getBoundingClientRect(true).left - 10,
              rectangle.getBoundingClientRect(true).right + 10,
              rectangle.getBoundingClientRect(true).top - 10,
              rectangle.getBoundingClientRect(true).bottom + 10
            );
          }

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
          localStorage.setItem("overlay_coordX", parseInt(event.pageX));
          localStorage.setItem(
            "overlay_coordY",
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
      <div id="two-overlay"></div>

      {/* <button>change button in group</button> */}
    </React.Fragment>
  );
}

export default Overlay;
