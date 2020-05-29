import React, { useEffect, useState } from "react";
import interact from "interactjs";
import { useDispatch } from "react-redux";
import ObjectSelector from "components/utils/objectSelector";
import { setPeronsalInformation } from "redux/actions/main";
import ElementFactory from "factory/textinput";

function TextInput(props) {
  const [isRendered, setIsRendered] = useState(false);
  const [groupInstance, setGroupInstance] = useState(null);
  const dispatch = useDispatch();
  const two = props.twoJSInstance;
  let selectorInstance = null;
  let groupObject = null;

  function onBlurHandler(e) {
    console.log("on blur handler called");
    selectorInstance.hide();
    two.update();
  }

  function onFocusHandler(e) {
    document.getElementById(`${groupObject.id}`).style.outline = 0;
  }

  if (isRendered === false) {
    // Calculate x and y through dividing width and height by 2 or vice versa
    // if x and y are given then multiply width and height into 2
    const offsetHeight = 0;

    const prevX = localStorage.getItem("textinput_coordX");
    const prevY = localStorage.getItem("textinput_coordY");

    // Instantiate factory
    const elementFactory = new ElementFactory(two, prevX, prevY, {});
    // Get all instances of every sub child element
    const {
      group,
      textGroup,
      rectTextGroup,
      rectangle,
      text,
    } = elementFactory.createElement();

    if (props.parentGroup) {
      /** This element will be rendered and scoped in its parent group */
      const parentGroup = props.parentGroup;
      parentGroup.add([rectangle, textGroup]);
      two.update();
    } else {
      /** This element will render by creating it's own group wrapper */
      groupObject = group;
      if (groupInstance === null) setGroupInstance(group);

      const selector = new ObjectSelector(two, group, 0, 0, 0, 0, 2);
      selector.create();
      selectorInstance = selector;

      // Shifting order of objects in group to reflect "z-index alias" mechanism for text box
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
        input.className = "temp-input-area";

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
          console.log(
            "text input",
            text.getBoundingClientRect(true).width,
            rectangle.getBoundingClientRect(true).width
          );

          if (
            text.getBoundingClientRect(true).width >
            rectangle.getBoundingClientRect(true).width
          ) {
            rectangle.vertices[1].x =
              textGroup.getBoundingClientRect(true).right - 30;
            rectangle.vertices[2].x =
              textGroup.getBoundingClientRect(true).right - 30;
            selector.update(
              textGroup.getBoundingClientRect(true).left - 20,
              textGroup.getBoundingClientRect(true).right + 20,
              textGroup.getBoundingClientRect(true).top - 20,
              textGroup.getBoundingClientRect(true).bottom + 20
            );
          }

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
    if (isRendered === false) setIsRendered(true);
  }

  // Using unmount phase to remove event listeners
  useEffect(() => {
    return () => {
      console.log("UNMOUNTING in Text input", groupInstance);
      // clean garbage by removing instance
      two.remove(groupInstance);
    };
  }, []);

  return (
    <React.Fragment>
      <div id="two-text-input"></div>
    </React.Fragment>
  );
}

// TextInput.propTypes = {
//   x: PropTypes.string,
//   y: PropTypes.string,
// };

// TextInput.defaultProps = {
//   x: 100,
//   y: 50,
// };

export default TextInput;
