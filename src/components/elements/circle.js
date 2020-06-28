import React, { useEffect, useState } from "react";
import interact from "interactjs";
import { useDispatch, useSelector } from "react-redux";
import ObjectSelector from "components/utils/objectSelector";
import { setPeronsalInformation } from "redux/actions/main";
import getEditComponents from "components/utils/editWrapper";
import CircleFactory from "factory/circle";
import Toolbar from "components/floatingToolbar";
// const useSelector = createSelectorHook(ReactReduxContext);
// const useDispatch = createDispatchHook(ReactReduxContext);

function Circle(props) {
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
        e.relatedTarget &&
        e.relatedTarget.dataset.parent &&
        e.relatedTarget.dataset.parent === "floating-toolbar"
      ) {
        // no action required
      } else {
        selectorInstance.hide();

        // passing same callback to event listener in wrapper class
        toolbarInstance.forceHide(blurListenerCB);
      }
    };

    // e.relatedTarget acts as main floating toolbar
    if (e.relatedTarget) {
      if (
        e.relatedTarget.id === "floating-toolbar" ||
        (e.relatedTarget.dataset.parent &&
          e.relatedTarget.dataset.parent === "floating-toolbar")
      ) {
        document
          .getElementById("floating-toolbar")
          .addEventListener("blur", blurListenerCB);
      } else {
        console.log("not a related target");
        selectorInstance.hide();
        toolbarInstance.forceHide(blurListenerCB);
      }
    } else {
      selectorInstance.hide();
      toolbarInstance.forceHide(blurListenerCB);
    }

    two.update();
  }

  function onFocusHandler(e) {
    console.log("groupInstance", groupObject);
    document.getElementById(`${groupObject.id}`).style.outline = 0;
  }

  if (isRendered === false) {
    // Calculate x and y through dividing width and height by 2 or vice versa
    // if x and y are given then multiply width and height into 2
    const offsetHeight = 0;

    const prevX = localStorage.getItem("Circle_coordX");
    const prevY = localStorage.getItem("Circle_coordY");

    // Instantiate factory
    const elementFactory = new CircleFactory(two, prevX, prevY, {});
    // Get all instances of every sub child element
    const { group, circle } = elementFactory.createElement();

    if (props.parentGroup) {
      /** This element will be rendered and scoped in its parent group */
      console.log("properties of circle", props);
      const parentGroup = props.parentGroup;
      circle.translation.x = props.properties.x;
      circle.translation.y = props.properties.y;
      parentGroup.add(circle);
      two.update();
    } else {
      /** This element will render by creating it's own group wrapper */
      groupObject = group;

      if (groupInstance === null) setGroupInstance(group);

      const { selector, toolbar } = getEditComponents(two, group, 4);
      selectorInstance = selector;
      toolbarInstance = toolbar;

      group.children.unshift(circle);
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
          circle.getBoundingClientRect(true).left - 10,
          circle.getBoundingClientRect(true).right + 10,
          circle.getBoundingClientRect(true).top - 10,
          circle.getBoundingClientRect(true).bottom + 10
        );
      }

      interact(`#${group.id}`).on("click", () => {
        console.log("on click ");
        selector.update(
          circle.getBoundingClientRect(true).left - 10,
          circle.getBoundingClientRect(true).right + 10,
          circle.getBoundingClientRect(true).top - 10,
          circle.getBoundingClientRect(true).bottom + 10
        );
        two.update();

        toolbar.show();
        toolbar.shift(
          getGroupElementFromDOM.getBoundingClientRect().left,
          getGroupElementFromDOM.getBoundingClientRect().top
        );
      });
      // Apply resizable property to element
      interact(`#${group.id}`).resizable({
        edges: { right: true, left: true, top: true, bottom: true },

        listeners: {
          move(event) {
            toolbar.hide();
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

            two.update();
          },
          end(event) {
            toolbar.show();
            console.log("the end");
          },
        },
      });

      // Apply draggable property to element
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
      <div id="two-Circle"></div>
      {/* {isRendered ? <Toolbar toggle={toolbar} /> : <Toolbar toggle={false} />} */}
      {/* <button>change button in group</button> */}
    </React.Fragment>
  );
}

export default Circle;
