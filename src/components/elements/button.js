import React, { Component } from "react";
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
  if (
    props.twoJSInstance &&
    (status === "construct" || lastAddedElement.id === props.id)
  ) {
    // Calculate x and y through dividing width and height by 2 or vice versa
    // if x and y are given then multiply width and height into 2
    const offsetHeight = 0;

    const prevX = localStorage.getItem("button_coordX");
    const prevY = localStorage.getItem("button_coordY");

    const rect = two.makeRoundedRectangle(0, 0, 110, 55);
    rect.fill = "#0747A6";
    rect.noStroke();

    const text = new Two.Text("Button", 0, 0);
    text.size = "16";
    text.fill = "#fff";
    text.weight = "600";
    text.family = "Ubuntu";

    const group = two.makeGroup(rect, text);

    // const calcX = parseInt(prevX) + (parseInt(rect.width / 2) - 10);
    // const calcY = parseInt(prevY) - (parseInt(46) - parseInt(rect.height / 2));
    group.center();
    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;
    console.log("BUtton", props.twoJSInstance);
    two.update();

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

      console.log("widthOfBox", rect.width);
      const widthLimit = parseInt(rect.width / 2) + parseInt(rect.width / 6);
      twoTextInstance.style.display = "none";

      input.style.position = "absolute";
      input.style.top = `${getCoordOfBtnText.top}px`;
      input.style.left = `${getCoordOfBtnText.left}px`;
      input.style.width = `${widthLimit}px`;
      input.className = "temp-textarea";

      document.getElementById("main-two-root").append(input);
      input.focus();

      input.addEventListener("input", () => {
        inputCharCounter = inputCharCounter + 1;
        if (inputCharCounter > 0 && inputCharCounter < 5) {
          rect.width = rect.width += 5;
          input.style.width = `${
            parseInt(rect.width / 2) + parseInt(rect.width / 6)
          }px`;
          input.style.left = `${parseInt(input.style.left) - 3}px`;
          two.update();
        } else if (inputCharCounter > 5 && inputCharCounter < 9) {
          rect.width = rect.width += 8;
          input.style.width = `${
            parseInt(rect.width / 2) + parseInt(rect.width / 6)
          }px`;
          input.style.left = `${parseInt(input.style.left) - 6}px`;
          two.update();
        } else if (inputCharCounter > 8) {
          rect.width = rect.width += 10;
          input.style.width = `${
            parseInt(rect.width / 2) + parseInt(rect.width / 6)
          }px`;
          input.style.left = `${parseInt(input.style.left) - 9}px`;
          two.update();
        }
      });

      input.addEventListener("blur", () => {
        console.log("on blur", input.value);
        twoTextInstance.style.display = "block";
        input.remove();
        text.value = input.value;
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
