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

function Circle(props) {
  const status = useSelector((state) => state.main.currentStatus);
  const lastAddedElement = useSelector((state) => state.main.lastAddedElement);
  const dispatch = useDispatch();
  console.log(
    "useSelector",
    useSelector((state) => state)
  );
  const two = props.twoJSInstance;

  let circleInstance = null;
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

    const prevX = localStorage.getItem("Circle_coordX");
    const prevY = localStorage.getItem("Circle_coordY");

    const circle = new Two.Ellipse(0, 0, 70, 70);
    circle.fill = "#EBECF0";
    circle.noStroke();
    circleInstance = circle;

    console.log("circle", circle.getBoundingClientRect());

    const group = two.makeGroup(circle);

    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;
    groupInstance = group;
    console.log("BUtton", props.twoJSInstance);

    const selector = new ObjectSelector(two, group, 0, 0, 0, 0, true);
    selector.create();
    selectorInstance = selector;

    // Shifting order of objects in group to reflect "z-index alias" mechanism for element
    group.children.unshift(circle);

    two.update();

    const getGroupElementFromDOM = document.getElementById(`${group.id}`);

    interact(`#${group.id}`).on("click", () => {
      console.log("on click ");
      selector.update(
        circle.getBoundingClientRect(true).left - 10,
        circle.getBoundingClientRect(true).right + 10,
        circle.getBoundingClientRect(true).top - 10,
        circle.getBoundingClientRect(true).bottom + 10
      );
      two.update();
    });

    getGroupElementFromDOM.addEventListener("focus", onFocusHandler);
    getGroupElementFromDOM.addEventListener("blur", onBlurHandler);

    interact(`#${group.id}`).resizable({
      edges: { right: true, left: true, top: true, bottom: true },

      listeners: {
        move(event) {
          const target = event.target;
          const rect = event.rect;

          // update the element's style
          //   resizeRect.width = rect.width;
          circle.width = rect.width;
          circle.height = rect.height;
          circle.radius = parseInt(rect.width / 2);

          selector.update(
            circle.getBoundingClientRect(true).left - 10,
            circle.getBoundingClientRect(true).right + 10,
            circle.getBoundingClientRect(true).top - 10,
            circle.getBoundingClientRect(true).bottom + 10
          );

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
          localStorage.setItem("Circle_coordX", parseInt(event.pageX));
          localStorage.setItem(
            "Circle_coordY",
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
      <div id="two-Circle"></div>

      {/* <button>change button in group</button> */}
    </React.Fragment>
  );
}

export default Circle;
