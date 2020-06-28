import React, { useEffect, useState } from "react";
import interact from "interactjs";
import { useDispatch, useSelector } from "react-redux";
import getEditComponents from "components/utils/editWrapper";
import { setPeronsalInformation } from "redux/actions/main";
import ElementFactory from "factory/rectangle";
import Toolbar from "components/floatingToolbar";
import idx from "idx";
import { useImmer } from "use-immer";

function Rectangle(props) {
  const selectedComponents = useSelector(
    (state) => state.main.selectedComponents
  );
  const [toolbar, setToolbar] = useState(false);
  const [internalState, setInternalState] = useImmer({});
  const dispatch = useDispatch();
  const two = props.twoJSInstance;
  let selectorInstance = null;
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
        // setToolbar(false);
      }
    };

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
      // setToolbar(false);
    }

    two.update();
  }

  function onFocusHandler(e) {
    document.getElementById(`${groupObject.id}`).style.outline = 0;
  }

  // Using unmount phase to remove event listeners
  useEffect(() => {
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

      const { selector } = getEditComponents(two, group, 4);
      selectorInstance = selector;
      group.children.unshift(rectangle);
      two.update();

      setInternalState((draft) => {
        draft.element = {
          [rectangle.id]: rectangle,
          [group.id]: group,
          // [selector.id]: selector,
        };
      });

      const getGroupElementFromDOM = document.getElementById(`${group.id}`);
      getGroupElementFromDOM.addEventListener("focus", onFocusHandler);
      getGroupElementFromDOM.addEventListener("blur", onBlurHandler);

      // If component is in area of selection frame/tool, programmatically enable it's selector
      if (selectedComponents.includes(props.id)) {
        console.log("selectedComponents", selectedComponents);

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

        setToolbar(true);
      });

      interact(`#${group.id}`).resizable({
        edges: { right: true, left: true, top: true, bottom: true },

        listeners: {
          move(event) {
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

    return () => {
      console.log("UNMOUNTING in Rectangle", group);
      // clean garbage by removing instance
      two.remove(group);
    };
  }, []);

  function closeToolbar() {
    setToolbar(false);
  }

  return (
    <React.Fragment>
      <div id="two-rectangle"></div>
      {toolbar && <button> Rectangles </button>}
      {/* <button>change button in group</button> */}
      {toolbar && (
        <Toolbar
          toggle={toolbar}
          componentState={internalState}
          closeToolbar={closeToolbar}
        />
      )}
      {/* <Toolbar toggle={toolbar} /> */}
    </React.Fragment>
  );
}

export default Rectangle;
