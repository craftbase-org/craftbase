import React, { useEffect, useState } from 'react';
import interact from 'interactjs';
import { useDispatch, useSelector } from 'react-redux';
import ObjectSelector from 'components/utils/objectSelector';
import { setPeronsalInformation } from 'store/actions/main';
import ElementFactory from 'factory/overlay';

function Overlay(props) {
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
    const prevX = localStorage.getItem('overlay_coordX');
    const prevY = localStorage.getItem('overlay_coordY');

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

      const selector = new ObjectSelector(two, group, 0, 0, 0, 0, 4);
      selector.create();
      selectorInstance = selector;

      group.children.unshift(rectangle);
      two.update();

      const getGroupElementFromDOM = document.getElementById(`${group.id}`);
      getGroupElementFromDOM.addEventListener('focus', onFocusHandler);
      getGroupElementFromDOM.addEventListener('blur', onBlurHandler);

      interact(`#${group.id}`).on('click', () => {
        console.log('on click ');
        selector.update(
          rectangle.getBoundingClientRect(true).left - 10,
          rectangle.getBoundingClientRect(true).right + 10,
          rectangle.getBoundingClientRect(true).top - 10,
          rectangle.getBoundingClientRect(true).bottom + 10
        );
        two.update();
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

            //   target.style.width = rect.width + "px";
            //   target.style.height = rect.height + "px";

            //   target.textContent = rect.width + "×" + rect.height;
            two.update();
          },
          end(event) {
            console.log('the end');
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
              'event x',
              event.target.getBoundingClientRect(),
              event.rect.left,
              event.pageX,
              event.clientX
            );
            // alternate -> take event.rect.left for x
            localStorage.setItem('overlay_coordX', parseInt(event.pageX));
            localStorage.setItem(
              'overlay_coordY',
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
      console.log('UNMOUNTING in Overlay', groupInstance);
      // clean garbage by removing instance
      two.remove(groupInstance);
    };
  }, []);

  return (
    <React.Fragment>
      <div id="two-overlay"></div>

      {/* <button>change button in group</button> */}
    </React.Fragment>
  );
}

export default Overlay;
