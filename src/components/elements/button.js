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
import { setPeronsalInformation } from "redux/actions/main";

// const useSelector = createSelectorHook(ReactReduxContext);
// const useDispatch = createDispatchHook(ReactReduxContext);

function Button(props) {
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

    const prevX = localStorage.getItem("button_coordX");
    const prevY = localStorage.getItem("button_coordY");

    const rectangle = two.makeRoundedRectangle(0, 0, 140, 45, 5);
    rectangle.fill = "#0052CC";
    rectangle.noStroke();
    rectangleInstance = rectangle;

    const text = two.makeText("Button", 10, 0);
    text.size = "16";
    text.fill = "#fff";
    text.weight = "500";

    const textGroup = two.makeGroup(text);
    textGroup.center();

    const rectGroup = two.makeGroup(rectangle);

    const rectTextGroup = two.makeGroup(rectGroup, textGroup);

    const group = two.makeGroup(rectTextGroup);

    // const calcX = parseInt(prevX) + (parseInt(rectangle.width / 2) - 10);
    // const calcY = parseInt(prevY) - (parseInt(46) - parseInt(rectangle.height / 2));

    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;
    groupInstance = group;

    const selector = new ObjectSelector(two, group, 0, 0, 0, 0);
    selector.create();
    selectorInstance = selector;

    group.children.unshift(rectTextGroup);
    // rectTextGroup.center();
    console.log("BUtton", props.twoJSInstance);
    two.update();

    const getGroupElementFromDOM = document.getElementById(`${group.id}`);
    getGroupElementFromDOM.addEventListener("focus", onFocusHandler);
    getGroupElementFromDOM.addEventListener("blur", onBlurHandler);

    interact(`#${group.id}`).on("click", () => {
      console.log("on click ", text.getBoundingClientRect(true));
      selector.update(
        rectTextGroup.getBoundingClientRect(true).left - 5,
        rectTextGroup.getBoundingClientRect(true).right + 5,
        rectTextGroup.getBoundingClientRect(true).top - 5,
        rectTextGroup.getBoundingClientRect(true).bottom + 5
      );
      two.update();
    });

    // Captures double click event for text
    // and generates temporary textarea support for it
    text._renderer.elem.addEventListener("click", () => {
      console.log("on click for texy", text.id);

      // Hide actual text and replace it with input box
      const twoTextInstance = document.getElementById(`${text.id}`);
      const getCoordOfBtnText = twoTextInstance.getBoundingClientRect();
      twoTextInstance.style.display = "none";

      const input = document.createElement("input");
      const topBuffer = 2;
      input.type = "text";
      input.value = text.value;
      input.style.color = "#fff";
      input.style.fontSize = "16px";
      input.style.position = "absolute";
      input.style.top = `${getCoordOfBtnText.top - topBuffer}px`;
      input.style.left = `${getCoordOfBtnText.left}px`;
      input.style.width = `${
        rectTextGroup.getBoundingClientRect(true).width
      }px`;
      input.className = "temp-input-area";

      document.getElementById("main-two-root").append(input);

      input.onfocus = function (e) {
        console.log("on input focus");
        selector.show();
        two.update();
      };
      input.focus();

      input.addEventListener("input", () => {
        let prevTextValue = text.value;
        input.style.width = `${
          rectTextGroup.getBoundingClientRect(true).width + 4
        }px`;

        // Synchronously update selector tool's coordinates
        text.value = input.value;

        // calculate difference to add to vertex's coordinates
        const diff = text.value.length - prevTextValue.length;

        if (diff < -2) {
          rectangle.width = rectangle.width + diff * 8 + 20;
        } else {
          rectangle.width =
            diff < 0 ? rectangle.width + diff * 8 : rectangle.width + diff * 14;
        }

        selector.update(
          rectTextGroup.getBoundingClientRect(true).left - 5,
          rectTextGroup.getBoundingClientRect(true).right + 5,
          rectTextGroup.getBoundingClientRect(true).top - 5,
          rectTextGroup.getBoundingClientRect(true).bottom + 5
        );
        two.update();
        input.style.left = `${
          document.getElementById(rectangle.id).getBoundingClientRect().left +
          20
        }px`;
      });

      input.addEventListener("blur", () => {
        twoTextInstance.style.display = "block";
        text.value = input.value;
        input.remove();

        // USE 4 LINES 4 CIRCLES

        selector.update(
          rectTextGroup.getBoundingClientRect(true).left - 5,
          rectTextGroup.getBoundingClientRect(true).right + 5,
          rectTextGroup.getBoundingClientRect(true).top - 5,
          rectTextGroup.getBoundingClientRect(true).bottom + 5
        );
        selector.hide();
        two.update();
      });
    });

    interact(`#${group.id}`).resizable({
      edges: { right: true, left: true },

      listeners: {
        move(event) {
          var target = event.target;
          var rect = event.rect;

          // Restrict width to shrink if it has reached point
          //  where it's width should be less than or equal to text's
          if (rect.width > text.getBoundingClientRect().width) {
            rectangle.width = rect.width;
            selector.update(
              rectTextGroup.getBoundingClientRect(true).left - 5,
              rectTextGroup.getBoundingClientRect(true).right + 5,
              rectTextGroup.getBoundingClientRect(true).top - 5,
              rectTextGroup.getBoundingClientRect(true).bottom + 5
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
          two.update();
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

Button.propTypes = {
  x: PropTypes.string,
  y: PropTypes.string,
};

Button.defaultProps = {
  x: 100,
  y: 50,
};

export default Button;
