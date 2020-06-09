import React, { useEffect, useState } from "react";
import interact from "interactjs";
import { useDispatch, useSelector } from "react-redux";
import getEditComponents from "components/utils/editWrapper";
import { setPeronsalInformation } from "redux/actions/main";
import ElementFactory from "factory/rectangle";
import idx from "idx";

function Rectangle(props) {
  const selectedComponents = useSelector(
    (state) => state.main.selectedComponents
  );
  const [isRendered, setIsRendered] = useState(false);
  const [groupInstance, setGroupInstance] = useState(null);
  const dispatch = useDispatch();
  const two = props.twoJSInstance;
  let selectorInstance = null;
  let toolbarInstance = null;
  let groupObject = null;

  function onBlurHandler(e) {
    console.log("on blur handler", e);

    // Callback for add and remove event listener for floating toolbar
    const blurListenerCB = (e) => {
      console.log("on blur toolbar", selectorInstance, e);
      if (
        idx(e, (_) => _.relatedTarget.dataset.parent) === "floating-toolbar"
      ) {
        // no action required
      } else {
        selectorInstance.hide();

        // passing same callback to event listener in wrapper class
        toolbarInstance.forceHide(blurListenerCB);
      }
    };

    // e.relatedTarget acts as main floating toolbar
    if (
      idx(e, (_) => _.relatedTarget.id) === "floating-toolbar" ||
      idx(e, (_) => _.relatedTarget.dataset.parent) === "floating-toolbar"
    ) {
      document
        .getElementById("floating-toolbar")
        .addEventListener("blur", blurListenerCB);
    } else {
      console.log("not a related target");
      selectorInstance.hide();
      toolbarInstance.forceHide(blurListenerCB);
    }

    two.update();
  }

  function onFocusHandler(e) {
    document.getElementById(`${groupObject.id}`).style.outline = 0;
  }

  if (isRendered === false) {
    // Calculate x and y through dividing width and height by 2 or vice versa
    // if x and y are given then multiply width and height into 2
    const offsetHeight = 0;
    const prevX = localStorage.getItem("rectangle_coordX");
    const prevY = localStorage.getItem("rectangle_coordY");

    // Instantiate factory
    const elementFactory = new ElementFactory(two, prevX, prevY, {});
    // Get all instances of every sub child element
    const { group, rectangle } = elementFactory.createElement();

    if (props.parentGroup) {
      /** This element will be rendered and scoped in its parent group */
      const parentGroup = props.parentGroup;
      parentGroup.add(rectangle);
      two.update();
    } else {
      /** This element will render by creating it's own group wrapper */
      groupObject = group;
      if (groupInstance === null) setGroupInstance(group);

      const { selector, toolbar } = getEditComponents(two, group, 4);
      selectorInstance = selector;
      toolbarInstance = toolbar;

      group.children.unshift(rectangle);
      two.update();

      const getGroupElementFromDOM = document.getElementById(`${group.id}`);
      getGroupElementFromDOM.addEventListener("focus", onFocusHandler);
      getGroupElementFromDOM.addEventListener("blur", onBlurHandler);

      // If component is in area of selection frame/tool, programmatically enable it's selector
      if (selectedComponents.includes(props.id)) {
        console.log("selectedComponents", selectedComponents);

        // forcefully
        // document.getElementById(`${group.id}`).focus();

        selector.update(
          rectangle.getBoundingClientRect(true).left - 10,
          rectangle.getBoundingClientRect(true).right + 10,
          rectangle.getBoundingClientRect(true).top - 10,
          rectangle.getBoundingClientRect(true).bottom + 10
        );
      }

      interact(`#${group.id}`).on("click", () => {
        console.log("on click ");
        selector.update(
          rectangle.getBoundingClientRect(true).left - 10,
          rectangle.getBoundingClientRect(true).right + 10,
          rectangle.getBoundingClientRect(true).top - 10,
          rectangle.getBoundingClientRect(true).bottom + 10
        );
        two.update();

        toolbar.show();
        toolbar.shift(
          getGroupElementFromDOM.getBoundingClientRect().left,
          getGroupElementFromDOM.getBoundingClientRect().top
        );
      });

      interact(`#${group.id}`).resizable({
        edges: { right: true, left: true, top: true, bottom: true },

        listeners: {
          move(event) {
            toolbar.hide();
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

            two.update();
          },
          end(event) {
            toolbar.show();
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
            toolbar.hide();
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
            localStorage.setItem("rectangle_coordX", parseInt(event.pageX));
            localStorage.setItem(
              "rectangle_coordY",
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
      console.log("UNMOUNTING in Rectangle", groupInstance);
      // clean garbage by removing instance
      two.remove(groupInstance);
    };
  }, []);

  return (
    <React.Fragment>
      <div id="two-rectangle"></div>

      {/* <button>change button in group</button> */}
    </React.Fragment>
  );
}

export default Rectangle;
