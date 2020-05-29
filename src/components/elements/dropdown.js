import React, { useEffect, useState } from "react";
import interact from "interactjs";
import { useDispatch, useSelector } from "react-redux";
import Icon from "icons/icons";
import ObjectSelector from "components/utils/objectSelector";
import { setPeronsalInformation } from "redux/actions/main";
import ElementFactory from "factory/dropdown";

function Dropdown(props) {
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
    const prevX = localStorage.getItem("dropdown_coordX");
    const prevY = localStorage.getItem("dropdown_coordY");

    const text = two.makeText("Select dropdown", -30, 0);
    text.size = "14";
    text.weight = "400";
    // text.fill = "#B3BAC5";
    // text.baseline = "sub";
    text.alignment = "left";

    const svgImage = new DOMParser().parseFromString(
      Icon.ICON_DROPDOWN_CARET.data,
      "text/xml"
    );
    console.log("svgImage", svgImage);
    const externalSVG = two.interpret(svgImage.firstChild.firstChild);

    // externalSVG.translation.y = -1;
    externalSVG.scale = 0.6;
    externalSVG.center();
    // externalSVGInstance = externalSVG;

    let textGroup = two.makeGroup(text, externalSVG);
    textGroup.center();
    console.log("textGroup", textGroup, textGroup.id);

    const group = two.makeGroup(textGroup);

    // group.center();
    group.translation.x = prevX || 500;
    group.translation.y = prevY || 200;
    groupObject = group;
    console.log("text bounding initial", text.getBoundingClientRect(true));

    const selector = new ObjectSelector(two, group, 0, 0, 0, 0);
    selector.create();
    selectorInstance = selector;

    // Shifting order of objects in group to reflect "z-index alias" mechanism for text box

    const rectangle = two.makePath(
      group.getBoundingClientRect(true).left - 10,
      group.getBoundingClientRect(true).top + 5,

      group.getBoundingClientRect(true).right + 80,
      group.getBoundingClientRect(true).top + 5,

      group.getBoundingClientRect(true).right + 80,
      group.getBoundingClientRect(true).bottom - 5,

      group.getBoundingClientRect(true).left - 10,
      group.getBoundingClientRect(true).bottom - 5
    );

    rectangle.fill = "#fff";
    rectangle.stroke = "#B3BAC5";
    rectangle.linewidth = 1;
    rectangle.join = "round";

    // Structure for add option element
    const addOptionRect = two.makeRectangle(
      rectangle.getBoundingClientRect(true).left + 100,
      50,
      80,
      30
    );
    addOptionRect.fill = "#42526E";
    addOptionRect.noStroke();
    const addOptionText = two.makeText(
      "Add option",
      rectangle.getBoundingClientRect(true).left + 100,
      50
    );
    addOptionText.fill = "#fff";
    addOptionText.weight = "600";
    const addOptionGroup = two.makeGroup(addOptionRect, addOptionText);
    addOptionGroup.opacity = 0;
    // rectangle.noStroke();

    group.add(rectangle);
    group.children.unshift(textGroup);

    externalSVG.translation.set(
      rectangle.getBoundingClientRect(true).right - 20,
      0
    );
    if (props.parentGroup) {
      /** This element will be rendered and scoped in its parent group */
      const parentGroup = props.parentGroup;
      parentGroup.add([rectangle, textGroup]);
      two.update();
    } else {
      /** This element will render by creating it's own group wrapper */

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

      /* Add option logic unfinished */
      // let optionBoxCounter = 0;
      // addOptionText._renderer.elem.addEventListener("click", () => {
      //   optionBoxCounter = optionBoxCounter + 1;

      //   const newOptionRect = two.makePath(
      //     group.getBoundingClientRect(true).left + 3,
      //     group.getBoundingClientRect(true).top + 10,

      //     group.getBoundingClientRect(true).right,
      //     group.getBoundingClientRect(true).top + 10,

      //     group.getBoundingClientRect(true).right,
      //     group.getBoundingClientRect(true).bottom - 50,

      //     group.getBoundingClientRect(true).left + 3,
      //     group.getBoundingClientRect(true).bottom - 50
      //   );

      //   newOptionRect.fill = "#fff";
      //   newOptionRect.stroke = "#B3BAC5";
      //   newOptionRect.linewidth = 1;
      //   newOptionRect.join = "round";

      //   const newOptionText = two.makeText(`Option ${optionBoxCounter}`, -30, 0);
      //   newOptionText.size = "14";
      //   newOptionText.weight = "400";
      //   newOption;
      //   // text.fill = "#B3BAC5";
      //   // text.baseline = "sub";
      //   newOptionText.alignment = "left";

      //   const newOptionGroup = two.makeGroup(newOptionRect, newOptionText);
      //   newOptionGroup.translation.set(0, 50);

      //   group.add(newOptionGroup);
      //   addOptionGroup.translation.y = addOptionText.translation.y + 10;
      //   two.update();
      // });

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
          selector.update(
            textGroup.getBoundingClientRect(true).left - 20,
            textGroup.getBoundingClientRect(true).right + 90,
            textGroup.getBoundingClientRect(true).top - 5,
            textGroup.getBoundingClientRect(true).bottom + 5
          );

          rectangle.vertices[1].x =
            textGroup.getBoundingClientRect(true).right + 42;
          rectangle.vertices[2].x =
            textGroup.getBoundingClientRect(true).right + 42;

          externalSVG.translation.set(
            rectangle.getBoundingClientRect(true).right - 20,
            0
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
          externalSVG.translation.set(
            rectangle.getBoundingClientRect(true).right - 20,
            0
          );

          selector.update(
            textGroup.getBoundingClientRect(true).left - 20,
            textGroup.getBoundingClientRect(true).right + 80,
            textGroup.getBoundingClientRect(true).top - 5,
            textGroup.getBoundingClientRect(true).bottom + 5
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
            //   resizeRect.width = rect.width;
            if (rect.right > text.getBoundingClientRect().right) {
              rectangle.vertices[1].x = rectangle.vertices[1].x + diff;
              rectangle.vertices[2].x = rectangle.vertices[2].x + diff;
              externalSVG.translation.set(
                rectangle.getBoundingClientRect(true).right - 20,
                0
              );

              selector.update(
                rectangle.getBoundingClientRect(true).left - 7,
                rectangle.getBoundingClientRect(true).right + 7,
                rectangle.getBoundingClientRect(true).top - 7,
                rectangle.getBoundingClientRect(true).bottom + 7
              );
              addOptionText.translation.set(
                rectangle.getBoundingClientRect(true).left +
                  rectangle.getBoundingClientRect().width / 2,
                addOptionText.translation.y
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
            localStorage.setItem("dropdown_coordX", parseInt(event.pageX));
            localStorage.setItem(
              "dropdown_coordY",
              parseInt(event.pageY - offsetHeight)
            );

            dispatch(setPeronsalInformation("COMPLETE", { data: {} }));
          },
        },
      });
    }
    if (isRendered === false) setIsRendered(true);
  }

  // function changeSVG() {
  //   document.getElementById(`${externalSVGInstance.id}`).innerHTML =
  //     Icon.SIDEBAR_ICON_RECTANGLE.data;

  //   two.update();
  // }

  // Using unmount phase to remove event listeners
  useEffect(() => {
    return () => {
      console.log("UNMOUNTING in Dropdown", groupInstance);
      // clean garbage by removing instance
      two.remove(groupInstance);
    };
  }, []);

  return (
    <React.Fragment>
      <div id="two-dropdown"></div>
    </React.Fragment>
  );
}

// Dropdown.propTypes = {
//   x: PropTypes.string,
//   y: PropTypes.string,
// };

// Dropdown.defaultProps = {
//   x: 100,
//   y: 50,
// };

export default Dropdown;
