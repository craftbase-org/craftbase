import React, { useEffect, useState } from "react";
import interact from "interactjs";
import { useDispatch, useSelector } from "react-redux";
import ObjectSelector from "components/utils/objectSelector";
import { setPeronsalInformation } from "redux/actions/main";
import ElementFactory from "factory/avatar";

function Avatar(props) {
  const [isRendered, setIsRendered] = useState(false);
  const [groupInstance, setGroupInstance] = useState(null);
  const dispatch = useDispatch();
  const two = props.twoJSInstance;
  let selectorInstance = null;
  let groupObject = null;

  function onBlurHandler(e) {
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
    const prevX = localStorage.getItem("avatar_coordX");
    const prevY = localStorage.getItem("avatar_coordY");

    // Instantiate factory
    const elementFactory = new ElementFactory(two, prevX, prevY, {});
    // Get all instances of every sub child element
    const {
      group,
      circleSvgGroup,
      circle,
      externalSVG,
    } = elementFactory.createElement();

    if (props.parentGroup) {
      /** This element will be rendered and scoped in its parent group */
      const parentGroup = props.parentGroup;
      circleSvgGroup.translation.x = props.metaData.x;

      parentGroup.add(circleSvgGroup);
      two.update();
    } else {
      /** This element will render by creating it's own group wrapper */

      groupObject = group;
      if (groupInstance === null) setGroupInstance(group);

      // After creating group, pass it's instance to selector class
      const selector = new ObjectSelector(two, group, 0, 0, 0, 0, 4);
      selector.create();
      selectorInstance = selector;

      group.children.unshift(circleSvgGroup);
      two.update();

      const initialScaleCoefficient = parseInt(
        circle.radius / externalSVG.scale
      );
      const getGroupElementFromDOM = document.getElementById(`${group.id}`);
      getGroupElementFromDOM.addEventListener("focus", onFocusHandler);
      getGroupElementFromDOM.addEventListener("blur", onBlurHandler);

      interact(`#${group.id}`).on("click", () => {
        console.log("on click ");
        selector.update(
          circle.getBoundingClientRect(true).left - 3,
          circle.getBoundingClientRect(true).right + 3,
          circle.getBoundingClientRect(true).top - 3,
          circle.getBoundingClientRect(true).bottom + 3
        );
        two.update();
      });

      // Apply resizable property to element
      interact(`#${group.id}`).resizable({
        edges: { right: true, left: true, top: true, bottom: true },

        listeners: {
          move(event) {
            const rect = event.rect;
            const rectRadii = parseInt(rect.width / 2);

            // Prevent the circle radius to be shrinked to less than 10
            if (rectRadii > 11) {
              // update the element's style
              circle.width = rect.width;
              circle.height = rect.height;
              circle.radius = parseInt(rect.width / 2);

              // console.log("circle.radius", circle.radius);
              externalSVG.scale = circle.radius / initialScaleCoefficient;
              externalSVG.center();

              selector.update(
                circle.getBoundingClientRect(true).left - 3,
                circle.getBoundingClientRect(true).right + 3,
                circle.getBoundingClientRect(true).top - 3,
                circle.getBoundingClientRect(true).bottom + 3
              );
            }

            two.update();
          },
          end(event) {
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
            localStorage.setItem("avatar_coordX", parseInt(event.pageX));
            localStorage.setItem(
              "avatar_coordY",
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
      console.log("UNMOUNTING in Avatar", groupInstance);
      // clean garbage by removing instance
      two.remove(groupInstance);
    };
  }, []);

  return (
    <React.Fragment>
      <div id="two-avatar"></div>
      <button>change button in group</button>
    </React.Fragment>
  );
}

// Avatar.propTypes = {
//   x: PropTypes.string,
//   y: PropTypes.string,
// };

// Avatar.defaultProps = {
//   x: 100,
//   y: 50,
// };

export default Avatar;
