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

function TextInput(props) {
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

    const prevX = localStorage.getItem("textinput_coordX");
    const prevY = localStorage.getItem("textinput_coordY");

    const text = two.makeText("Text input", -30, 0);
    text.size = "14";
    text.weight = "400";
    text.family = "Ubuntu";
    text.fill = "#B3BAC5";
    // text.baseline = "sub";
    text.alignment = "left";

    let textGroup = two.makeGroup(text);
    textGroup.center();
    console.log("textGroup", textGroup, textGroup.id);

    const group = two.makeGroup(textGroup);

    // group.center();
    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;
    groupInstance = group;
    console.log("text bounding initial", text.getBoundingClientRect(true));

    const selector = new ObjectSelector(two, group, 0, 0, 0, 0, 2);
    selector.create();
    selectorInstance = selector;

    // Shifting order of objects in group to reflect "z-index alias" mechanism for text box

    const rectangle = two.makePath(
      group.getBoundingClientRect(true).left - 10,
      group.getBoundingClientRect(true).top - 10,

      group.getBoundingClientRect(true).right + 80,
      group.getBoundingClientRect(true).top - 10,

      group.getBoundingClientRect(true).right + 80,
      group.getBoundingClientRect(true).bottom + 10,

      group.getBoundingClientRect(true).left - 10,
      group.getBoundingClientRect(true).bottom + 10
    );

    rectangle.fill = "#fff";
    rectangle.stroke = "#B3BAC5";
    rectangle.linewidth = 1;
    rectangle.join = "round";

    // rectangle.noStroke();

    group.add(rectangle);
    group.children.unshift(textGroup);
    two.update();

    const getGroupElementFromDOM = document.getElementById(`${group.id}`);
    getGroupElementFromDOM.addEventListener("focus", onFocusHandler);
    getGroupElementFromDOM.addEventListener("blur", onBlurHandler);

    interact(`#${group.id}`).on("click", () => {
      console.log("on click ", text.getBoundingClientRect(true));
      selector.update(
        rectangle.getBoundingClientRect(true).left - 7,
        rectangle.getBoundingClientRect(true).right + 7,
        rectangle.getBoundingClientRect(true).top - 7,
        rectangle.getBoundingClientRect(true).bottom + 7
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
      input.style.color = text.fill;
      input.style.fontSize = `${text.size}px`;
      input.style.position = "absolute";
      input.style.top = `${getCoordOfBtnText.top - topBuffer}px`;
      input.style.left = `${getCoordOfBtnText.left}px`;
      input.style.width = `${textGroup.getBoundingClientRect(true).width}px`;
      input.className = "temp-textarea";

      document.getElementById("main-two-root").append(input);

      input.onfocus = function (e) {
        console.log("on input focus");
        selector.show();
        two.update();
      };
      input.focus();

      input.addEventListener("input", () => {
        input.style.width = `${
          textGroup.getBoundingClientRect(true).width + 4
        }px`;

        // Synchronously update selector tool's coordinates
        text.value = input.value;
        selector.update(
          textGroup.getBoundingClientRect(true).left - 20,
          textGroup.getBoundingClientRect(true).right + 90,
          textGroup.getBoundingClientRect(true).top - 20,
          textGroup.getBoundingClientRect(true).bottom + 20
        );

        rectangle.vertices[1].x =
          textGroup.getBoundingClientRect(true).right + 42;
        rectangle.vertices[2].x =
          textGroup.getBoundingClientRect(true).right + 42;

        two.update();
      });

      input.addEventListener("blur", () => {
        twoTextInstance.style.display = "block";
        text.value = input.value;
        input.remove();
        console.log(
          "input blur event",
          textGroup.id,
          textGroup.getBoundingClientRect()
        );
        // USE 4 LINES 4 CIRCLES

        selector.update(
          textGroup.getBoundingClientRect(true).left - 20,
          textGroup.getBoundingClientRect(true).right + 80,
          textGroup.getBoundingClientRect(true).top - 20,
          textGroup.getBoundingClientRect(true).bottom + 20
        );
        selector.hide();
        two.update();
      });
    });

    interact(`#${group.id}`).resizable({
      edges: { right: true, left: true },

      listeners: {
        move(event) {
          const target = event.target;
          const rect = event.rect;
          console.log("rect", rect, rectangle.getBoundingClientRect());
          const prevXCoordInSpace = rectangle.getBoundingClientRect().right;
          const diff = rect.right - prevXCoordInSpace;

          // update the element's style
          if (rect.right > text.getBoundingClientRect().right) {
            rectangle.vertices[1].x = rectangle.vertices[1].x + diff;
            rectangle.vertices[2].x = rectangle.vertices[2].x + diff;

            selector.update(
              rectangle.getBoundingClientRect(true).left - 7,
              rectangle.getBoundingClientRect(true).right + 7,
              rectangle.getBoundingClientRect(true).top - 7,
              rectangle.getBoundingClientRect(true).bottom + 7
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
          localStorage.setItem("textinput_coordX", parseInt(event.pageX));
          localStorage.setItem(
            "textinput_coordY",
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
    console.log("MOUNTING");
    return () => {
      console.log("UNMOUNTING", groupInstance);

      isMounted = false;
    };
  }, []);

  return (
    <React.Fragment>
      <div id="two-button"></div>
    </React.Fragment>
  );
}

TextInput.propTypes = {
  x: PropTypes.string,
  y: PropTypes.string,
};

TextInput.defaultProps = {
  x: 100,
  y: 50,
};

export default TextInput;
