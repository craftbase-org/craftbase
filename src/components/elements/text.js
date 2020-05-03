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

    const prevX = localStorage.getItem("text_coordX");
    const prevY = localStorage.getItem("text_coordY");

    const text = two.makeText("Text", 10, 0);
    text.size = "16";
    text.fill = "#fff";
    text.weight = "600";
    text.family = "Ubuntu";

    const svgImage = new DOMParser().parseFromString(
      Icon.ICON_IMAGE_1.data,
      "text/xml"
    );
    console.log("svgImage", svgImage);
    var externalSVG = two.interpret(svgImage.firstChild);
    externalSVG.translation.x = text.getBoundingClientRect().left - 20;
    externalSVG.translation.y = text.getBoundingClientRect().top - 2;
    externalSVG.scale = 1.2;

    let textGroup = two.makeGroup(externalSVG, text);
    textGroup.fill = "#000";

    const calcResizeRectWidth = textGroup.getBoundingClientRect().width + 5;
    const calcResizeRectHeight = textGroup.getBoundingClientRect().height + 5;
    const resizeRect = two.makeRoundedRectangle(
      -1,
      -1,
      calcResizeRectWidth,
      calcResizeRectHeight
    );
    resizeRect.opacity = 0;
    resizeRectInstance = resizeRect;

    const group = two.makeGroup(resizeRect, textGroup);

    // const calcX = parseInt(prevX) + (parseInt(rectangle.width / 2) - 10);
    // const calcY = parseInt(prevY) - (parseInt(46) - parseInt(rectangle.height / 2));
    group.center();
    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;
    groupInstance = group;
    console.log("text bounding initial", text.getBoundingClientRect(true));
    two.update();

    const getGroupElementFromDOM = document.getElementById(`${group.id}`);
    getGroupElementFromDOM.addEventListener("focus", onFocusHandler);
    getGroupElementFromDOM.addEventListener("blur", onBlurHandler);

    interact(`#${group.id}`).on("click", () => {
      console.log("on click ");
      resizeRect.width = textGroup.getBoundingClientRect().width + 5;
      resizeRect.height = textGroup.getBoundingClientRect().height + 5;
      resizeRect.opacity = 1;
      resizeRect.noFill();
      two.update();
    });

    // Captures double click event for text
    // and generates temporary textarea support for it
    text._renderer.elem.addEventListener("dblclick", () => {
      let inputCharCounter = 0;

      console.log("on click for texy", text.id);
      const input = document.createElement("input");
      input.type = "text";
      input.value = text.value;
      const twoTextInstance = document.getElementById(`${text.id}`);
      const getCoordOfBtnText = twoTextInstance.getBoundingClientRect();

      twoTextInstance.style.display = "none";

      input.style.position = "absolute";
      input.style.top = `${getCoordOfBtnText.top}px`;
      input.style.left = `${getCoordOfBtnText.left}px`;
      input.style.width = `${getCoordOfBtnText.width}px`;
      input.className = "temp-textarea";

      document.getElementById("main-two-root").append(input);
      input.focus();

      let prevTextValue = input.value;
      let prevSvgBounding = externalSVG.getBoundingClientRect(true).right;
      input.addEventListener("input", () => {
        console.log(
          "prevTextValue",
          document.getElementById(`${externalSVG.id}`).getBoundingClientRect(),
          input.getBoundingClientRect()
        );
        prevTextValue = input.value;
        inputCharCounter = inputCharCounter + 1;

        input.style.width = `${input.value.length * 10}px`;
        // input.style.left = `${
        //   parseInt(externalSVG.getBoundingClientRect().right) - -30
        // }px`;
        // two.update();
      });

      input.addEventListener("blur", () => {
        console.log("on blur", input.value);
        twoTextInstance.style.display = "block";

        text.value = input.value;
        input.remove();
        // externalSVG.translation.y = -parseInt(rectangle.height / 4);

        externalSVG.translation.x = -(text.value.length * 4) - 20;

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
          localStorage.setItem("text_coordX", parseInt(event.pageX));
          localStorage.setItem(
            "text_coordY",
            parseInt(event.pageY - offsetHeight)
          );
          dispatch(setPeronsalInformation("COMPLETE", { data: {} }));
        },
      },
    });
  }

  function changeSVG() {
    document.getElementById(`${externalSVG.id}`).innerHTML =
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

Button.propTypes = {
  x: PropTypes.string,
  y: PropTypes.string,
};

Button.defaultProps = {
  x: 100,
  y: 50,
};

export default Button;

// class Button extends Component {
//   constructor(props) {
//     super(props);
//     this.state = {
//       groupInstance: null
//     };
//   }
//   componentDidMount() {
//     // this.canvas = new fabric.Canvas("main-canvas", {});

//     if (this.props.twoJSInstance) {
//       const two = this.props.twoJSInstance;
//       // Calculate x and y through dividing width and height by 2 or vice versa
//       // if x and y are given then multiply width and height into 2
//       const rect = two.makeRectangle(55, 20, 110, 55);
//       const text = new Two.Text("Button", 55, 20);
//       const group = two.makeGroup(rect, text);

//       rect.fill = "red";
//       // rect.noStroke();
//       console.log("rect", rect);
//       two.update();
//       this.setState({
//         rectInstance: rect,
//         textInstance: text,
//         groupInstance: group
//       });
//     }
//   }

//   componentDidUpdate(prevProps, prevState) {
//     console.log("CDU");
//     if (prevState.groupInstance !== this.state.groupInstance) {
//       const { groupInstance, rectInstance, textInstance } = this.state;
//       const two = this.props.twoJSInstance;
//       let thisRef = this;
//       interact(`#${this.state.groupInstance.id}`).draggable({
//         // enable inertial throwing
//         inertia: true,
//         // keep the element within the area of it's parent
//         restrict: {
//           restriction: "parent",
//           endOnly: true
//           // elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
//         },
//         // enable autoScroll
//         autoScroll: true,

//         onstart: function(event) {
//           console.log("onstart");
//         },

//         // call this function on every dragmove event
//         onmove: dragMoveListener,
//         // call this function on every dragend event
//         onend: function(event) {
//           console.log("onend", event);
//           console.log("groupInstance", groupInstance.translation);
//           var textEl = event.target.querySelector("p");
//           // textInstance.translation.x = 500;

//           groupInstance.translation.set(event.dx, event.dy);
//           groupInstance.noStroke();
//           // groupInstance.translation.y = event.dy;
//           two.update();
//           two.play();
//           thisRef.setState({ groupInstance });
//         }
//       });
//     }
//   }

//   render() {
//     return (
//       <React.Fragment>
//         <div id="two-button"></div>
//         <button>change button in group</button>
//       </React.Fragment>
//     );
//   }
// }
