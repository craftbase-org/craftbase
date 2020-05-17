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

function Link(props) {
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
  let externalSVGInstance = null;

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

    const prevX = localStorage.getItem("line_coordX");
    const prevY = localStorage.getItem("line_coordY");

    const text = two.makeText("Link", 10, 0);
    text.size = "16";
    text.weight = "600";
    text.family = "Ubuntu";
    text.decoration = "underline";
    text.size = 18;
    // text.baseline = "sub";
    text.alignment = "left";

    const svgImage = new DOMParser().parseFromString(
      Icon.ICON_IMAGE_1.data,
      "text/xml"
    );
    console.log("svgImage", svgImage);
    const externalSVG = two.interpret(svgImage.firstChild);
    externalSVG.translation.x = -3;
    externalSVG.translation.y = -1;
    externalSVG.scale = 1.2;
    externalSVG.center();
    externalSVGInstance = externalSVG;

    let textGroup = two.makeGroup(externalSVG, text);
    textGroup.fill = "#0052CC";
    console.log("textGroup", textGroup, textGroup.id);

    const group = two.makeGroup(textGroup);

    // group.center();
    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;
    groupInstance = group;
    console.log("text bounding initial", text.getBoundingClientRect(true));

    const selector = new ObjectSelector(two, group, 0, 0, 0, 0, true);
    selector.create();
    selectorInstance = selector;

    // Shifting order of objects in group to reflect "z-index alias" mechanism for text box
    group.children.shift(textGroup);
    group.children.unshift(textGroup);

    two.update();

    const getGroupElementFromDOM = document.getElementById(`${group.id}`);
    getGroupElementFromDOM.addEventListener("focus", onFocusHandler);
    getGroupElementFromDOM.addEventListener("blur", onBlurHandler);

    interact(`#${group.id}`).on("click", () => {
      console.log("on click ", text.getBoundingClientRect(true));
      selector.update(
        textGroup.getBoundingClientRect(true).left - 30,
        textGroup.getBoundingClientRect(true).right,
        textGroup.getBoundingClientRect(true).top - 10,
        textGroup.getBoundingClientRect(true).bottom + 10
      );
      two.update();
    });

    // Captures double click event for text
    // and generates temporary textarea support for it
    text._renderer.elem.addEventListener("dblclick", () => {
      console.log("on click for texy", text.id);

      // Hide actual text and replace it with input box
      const twoTextInstance = document.getElementById(`${text.id}`);
      const getCoordOfBtnText = twoTextInstance.getBoundingClientRect();
      twoTextInstance.style.display = "none";

      const input = document.createElement("input");
      const topBuffer = 2;
      input.type = "text";
      input.value = text.value;
      input.style.fontSize = "18px";
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
          textGroup.getBoundingClientRect(true).left - 30,
          textGroup.getBoundingClientRect(true).right + 30,
          textGroup.getBoundingClientRect(true).top - 10,
          textGroup.getBoundingClientRect(true).bottom + 10
        );
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
          textGroup.getBoundingClientRect(true).left - 30,
          textGroup.getBoundingClientRect(true).right,
          textGroup.getBoundingClientRect(true).top - 10,
          textGroup.getBoundingClientRect(true).bottom + 10
        );
        selector.hide();
        two.update();
      });
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

  function changeSVG() {
    document.getElementById(`${externalSVGInstance.id}`).innerHTML =
      Icon.SIDEBAR_ICON_RECTANGLE.data;

    two.update();
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
      <button onClick={() => changeSVG()}>change button in text</button>
    </React.Fragment>
  );
}

Link.propTypes = {
  x: PropTypes.string,
  y: PropTypes.string,
};

Link.defaultProps = {
  x: 100,
  y: 50,
};

export default Link;
