import React, { useEffect, useState } from 'react';
import interact from 'interactjs';
import { useDispatch, useSelector } from 'react-redux';
import ObjectSelector from 'components/utils/objectSelector';
import { setPeronsalInformation } from 'store/actions/main';
import ElementCreator from 'factory/toggle';

function Toggle(props) {
  const [isRendered, setIsRendered] = useState(false);
  const [groupInstance, setGroupInstance] = useState(null);
  const dispatch = useDispatch();
  const two = props.twoJSInstance;
  let selectorInstance = null;
  let groupObject = null;

  function onBlurHandler(e) {
    console.log('on blur handler called');
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
    const prevX = localStorage.getItem('toggle_coordX');
    const prevY = localStorage.getItem('toggle_coordY');

    const elementFactory = new ElementCreator(two, prevX, prevY, {});
    const {
      group,
      circle,
      rectCircleGroup,
      rect,
    } = elementFactory.createElement();

    if (props.parentGroup) {
      /** This element will be rendered and scoped in its parent group */
      const parentGroup = props.parentGroup;
      parentGroup.add(rectCircleGroup);
      two.update();
    } else {
      /** This element will render by creating it's own group wrapper */
      groupObject = group;
      if (groupInstance === null) setGroupInstance(group);

      const selector = new ObjectSelector(two, group, 0, 0, 0, 0);
      selector.create();
      selectorInstance = selector;

      group.children.unshift(rectCircleGroup);
      two.update();

      const getGroupElementFromDOM = document.getElementById(`${group.id}`);
      getGroupElementFromDOM.addEventListener('focus', onFocusHandler);
      getGroupElementFromDOM.addEventListener('blur', onBlurHandler);

      // Does capture event of toggle me button rendered prior to this element rendering
      document.getElementById('add-1-2').addEventListener('click', () => {
        console.log('on click captured');
        let toggleCircle = circle;
        let toggleRect = rect;
        const calcCirclePointX = parseInt(toggleRect.width / 4);
        toggleCircle.translation.x = parseInt(-calcCirclePointX);
        toggleRect.fill = '#ccc';
        two.update();
      });

      interact(`#${group.id}`).on('click', () => {
        selector.update(
          rectCircleGroup.getBoundingClientRect(true).left - 4,
          rectCircleGroup.getBoundingClientRect(true).right + 4,
          rectCircleGroup.getBoundingClientRect(true).top - 4,
          rectCircleGroup.getBoundingClientRect(true).bottom + 4
        );
        two.update();
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
              'event x',
              event.target.getBoundingClientRect(),
              event.rect.left,
              event.pageX,
              event.clientX
            );
            // alternate -> take event.rect.left for x
            localStorage.setItem('toggle_coordX', parseInt(event.pageX));
            localStorage.setItem(
              'toggle_coordY',
              parseInt(event.pageY - offsetHeight)
            );

            dispatch(setPeronsalInformation('COMPLETE', { data: {} }));
          },
        },
      });
    }

    if (isRendered === false) setIsRendered(true);
  }

  // Using unmount phase to remove event listeners
  useEffect(() => {
    return () => {
      console.log('UNMOUNTING in Toggle', groupInstance);
      // clean garbage by removing instance
      two.remove(groupInstance);
    };
  }, []);

  return (
    <React.Fragment>
      <div id="two-toggle"></div>

      <button id="btn-toggle-1">Toggle btn</button>
      {/* <button>change button in group</button> */}
    </React.Fragment>
  );
}

export default Toggle;
