import React, { useEffect, useState } from 'react';
import interact from 'interactjs';
import { useDispatch, useSelector } from 'react-redux';
import { useImmer } from 'use-immer';

import { elementOnBlurHandler } from 'utils/misc';
import getEditComponents from 'components/utils/editWrapper';
import Toolbar from 'components/floatingToolbar';
import { setPeronsalInformation } from 'store/actions/main';
import ElementFactory from 'factory/imagecard';

function ImageCard(props) {
  const [showToolbar, toggleToolbar] = useState(false);
  const [internalState, setInternalState] = useImmer({});
  const dispatch = useDispatch();
  const two = props.twoJSInstance;
  let selectorInstance = null;
  let groupObject = null;

  function onBlurHandler(e) {
    elementOnBlurHandler(e, selectorInstance, two);
  }

  function onFocusHandler(e) {
    document.getElementById(`${groupObject.id}`).style.outline = 0;
  }

  // Using unmount phase to remove event listeners
  useEffect(() => {
    // Calculate x and y through dividing width and height by 2 or vice versa
    // if x and y are given then multiply width and height into 2
    const offsetHeight = 0;
    const prevX = localStorage.getItem('imagecard_coordX');
    const prevY = localStorage.getItem('imagecard_coordY');

    // Instantiate factory
    const elementFactory = new ElementFactory(two, prevX, prevY, {});
    // Get all instances of every sub child element
    const {
      group,
      circleSvgGroup,
      externalSVG,
      rectangle,
    } = elementFactory.createElement();

    if (props.parentGroup) {
      /** This element will be rendered and scoped in its parent group */
      const parentGroup = props.parentGroup;
      parentGroup.add(circleSvgGroup);
      two.update();
    } else {
      /** This element will render by creating it's own group wrapper */
      groupObject = group;

      const { selector } = getEditComponents(two, group, 4);
      selectorInstance = selector;

      group.children.unshift(circleSvgGroup);
      two.update();

      setInternalState((draft) => {
        draft.element = {
          [circleSvgGroup.id]: circleSvgGroup,
          [group.id]: group,
          // [selector.id]: selector,
        };
        draft.group = {
          id: group.id,
          data: group,
        };
        draft.shape = {
          id: circleSvgGroup.id,
          data: circleSvgGroup,
        };
        draft.text = {
          data: {},
        };
        draft.icon = {
          id: externalSVG.id,
          data: externalSVG,
        };
      });

      const initialScaleCoefficient = parseInt(
        rectangle.width + rectangle.height / externalSVG.scale
      );
      const getGroupElementFromDOM = document.getElementById(`${group.id}`);
      getGroupElementFromDOM.addEventListener('focus', onFocusHandler);
      getGroupElementFromDOM.addEventListener('blur', onBlurHandler);

      interact(`#${group.id}`).on('click', () => {
        console.log('on click ');
        selector.update(
          rectangle.getBoundingClientRect(true).left - 3,
          rectangle.getBoundingClientRect(true).right + 3,
          rectangle.getBoundingClientRect(true).top - 3,
          rectangle.getBoundingClientRect(true).bottom + 3
        );
        two.update();
        toggleToolbar(true);
      });

      // Captures double click event for text
      // and generates temporary textarea support for it

      interact(`#${group.id}`).resizable({
        edges: { right: true, left: true, top: true, bottom: true },

        listeners: {
          move(event) {
            const rect = event.rect;
            const minRectHeight = parseInt(rect.height / 2);
            const minRectWidth = parseInt(rect.width / 2);

            // Restrict width and height at arbitrary point difference where it would
            // be unstable for further SVG scaling calculations
            const minDiff = Math.abs(rect.width - rect.height);

            // Prevent the rectangle radius to be shrinked to less than 10
            if (minRectHeight > 20 && minRectWidth > 20 && minDiff < 100) {
              // update the element's style
              rectangle.width = rect.width - 10;
              rectangle.height = rect.height - 10;

              // console.log("rectangle.radius", rectangle.radius);
              externalSVG.scale =
                ((rectangle.width + rectangle.height / 2) /
                  initialScaleCoefficient) *
                1.5;
              externalSVG.center();

              selector.update(
                rectangle.getBoundingClientRect(true).left - 3,
                rectangle.getBoundingClientRect(true).right + 3,
                rectangle.getBoundingClientRect(true).top - 3,
                rectangle.getBoundingClientRect(true).bottom + 3
              );
            }

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
            localStorage.setItem('imagecard_coordX', parseInt(event.pageX));
            localStorage.setItem(
              'imagecard_coordY',
              parseInt(event.pageY - offsetHeight)
            );
            dispatch(setPeronsalInformation('COMPLETE', { data: {} }));
          },
        },
      });
    }

    return () => {
      console.log('UNMOUNTING in ImageCard', group);
      // clean garbage by removing instance
      two.remove(group);
    };
  }, []);

  function closeToolbar() {
    toggleToolbar(false);
  }

  return (
    <React.Fragment>
      <div id="two-image-card"></div>
      {showToolbar ? (
        <Toolbar
          toggle={showToolbar}
          componentState={internalState}
          closeToolbar={closeToolbar}
          updateComponent={() => {
            two.update();
          }}
        />
      ) : null}
      {/* <button>change button in group</button> */}
    </React.Fragment>
  );
}

export default ImageCard;
