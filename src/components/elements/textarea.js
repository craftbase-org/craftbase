import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import interact from "interactjs";
import { useDispatch, useSelector } from "react-redux";
import ObjectSelector from "components/utils/objectSelector";
import { setPeronsalInformation } from "redux/actions/main";
import ElementFactory from "factory/textarea";

function Textarea(props) {
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
    const prevX = localStorage.getItem("textarea_coordX");
    const prevY = localStorage.getItem("textarea_coordY");

    // Instantiate factory
    const elementFactory = new ElementFactory(two, prevX, prevY, {});
    // Get all instances of every sub child element
    const {
      group,
      rectangle,
      textGroup,
      text,
    } = elementFactory.createElement();

    if (props.parentGroup) {
      /** This element will be rendered and scoped in its parent group */
      const parentGroup = props.parentGroup;
      parentGroup.add([textGroup, rectangle]);
      two.update();
    } else {
      /** This element will render by creating it's own group wrapper */
      groupObject = group;
      if (groupInstance === null) setGroupInstance(group);

      const selector = new ObjectSelector(two, group, 0, 0, 0, 0, 2);
      selector.create();
      selectorInstance = selector;

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

      // Set specifically to be used later for arranging texts in multiline manner
      let initialRectWidth = rectangle.getBoundingClientRect().width;
      let initialCharValueLimit = 35;
      let initialScrollHeight = 0;
      const breakPointIndices = [];

      const prevText = text;

      const addTextLine = () => {
        const newText = text.clone();
        newText.text = "d";
        prevText = newText;
      };

      // Captures double click event for text
      // and generates temporary textarea support for it
      text._renderer.elem.addEventListener("click", () => {
        console.log("on click for texy", text.id);

        // Hide actual text and replace it with input box
        const twoTextInstance = document.getElementById(`${text.id}`);
        const getCoordOfBtnText = twoTextInstance.getBoundingClientRect();
        twoTextInstance.style.display = "none";

        const input = document.createElement("textarea");
        const topBuffer = 2;

        input.value = text.value;
        input.style.color = text.fill;
        input.style.fontSize = `${text.size}px`;
        input.style.position = "absolute";
        input.style.top = `${getCoordOfBtnText.top - topBuffer}px`;
        input.style.left = `${getCoordOfBtnText.left}px`;
        input.style.width = `${rectangle.getBoundingClientRect(true).width}px`;
        input.style.height = "3vh";
        input.className = "temp-textarea";

        document.getElementById("main-two-root").append(input);

        input.onfocus = function (e) {
          console.log("on input focus");
          initialScrollHeight = input.scrollHeight;
          selector.show();
          two.update();
        };
        input.focus();

        input.addEventListener("input", () => {
          console.log(
            "char length ",
            input.getBoundingClientRect().width,
            rectangle.getBoundingClientRect().width,
            input.scrollHeight,
            initialScrollHeight
          );
          // input.style.width = `${
          //   textGroup.getBoundingClientRect(true).width + 4
          // }px`;

          if (initialScrollHeight !== input.scrollHeight) {
            if (initialScrollHeight < input.scrollHeight) {
              breakPointIndices.push(input.value.length - 1);
              initialScrollHeight = input.scrollHeight;
              // input.style.height = `${3 * breakPointIndices.length}vh`;
              console.log(
                "Trigger New Line",
                input.scrollHeight,
                breakPointIndices,
                input.style.height
              );

              rectangle.vertices[2].y = 40 * breakPointIndices.length;
              rectangle.vertices[3].y = 40 * breakPointIndices.length;
              selector.update(
                rectangle.getBoundingClientRect(true).left - 7,
                rectangle.getBoundingClientRect(true).right + 7,
                rectangle.getBoundingClientRect(true).top - 7,
                rectangle.getBoundingClientRect(true).bottom + 7
              );
              twoTextInstance.style.display = "block";
            }
          }

          // Synchronously update selector tool's coordinates
          text.value = input.value;

          // selector.update(
          //   textGroup.getBoundingClientRect(true).left - 20,
          //   textGroup.getBoundingClientRect(true).right + 90,
          //   textGroup.getBoundingClientRect(true).top - 20,
          //   textGroup.getBoundingClientRect(true).bottom + 20
          // );

          // rectangle.vertices[1].x =
          //   textGroup.getBoundingClientRect(true).right + 42;
          // rectangle.vertices[2].x =
          //   textGroup.getBoundingClientRect(true).right + 42;

          two.update();
        });

        // input.addEventListener("blur", () => {
        //   twoTextInstance.style.display = "block";
        //   text.value = input.value;

        //   // Calculate new text lines if needed
        //   breakPointIndices.forEach((point, index) => {});

        //   input.remove();
        //   console.log(
        //     "input blur event",
        //     textGroup.id,
        //     textGroup.getBoundingClientRect()
        //   );
        //   // USE 4 LINES 4 CIRCLES

        //   // selector.update(
        //   //   textGroup.getBoundingClientRect(true).left - 20,
        //   //   textGroup.getBoundingClientRect(true).right + 80,
        //   //   textGroup.getBoundingClientRect(true).top - 20,
        //   //   textGroup.getBoundingClientRect(true).bottom + 20
        //   // );
        //   selector.hide();
        //   two.update();
        // });
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
            localStorage.setItem("textarea_coordX", parseInt(event.pageX));
            localStorage.setItem(
              "textarea_coordY",
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
      console.log("UNMOUNTING in Circle", groupInstance);
      // clean garbage by removing instance
      two.remove(groupInstance);
    };
  }, []);

  return (
    <React.Fragment>
      <div id="two-textarea"></div>
    </React.Fragment>
  );
}

Textarea.propTypes = {
  x: PropTypes.string,
  y: PropTypes.string,
};

Textarea.defaultProps = {
  x: 100,
  y: 50,
};

export default Textarea;
