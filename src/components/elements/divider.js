import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import interact from 'interactjs';
import { useDispatch, useSelector } from 'react-redux';
import { useImmer } from 'use-immer';

import { elementOnBlurHandler } from 'utils/misc';
import getEditComponents from 'components/utils/editWrapper';
import Toolbar from 'components/floatingToolbar';
import { setPeronsalInformation } from 'store/actions/main';
import ElementCreator from 'factory/divider';

function Divider(props) {
  const [showToolbar, toggleToolbar] = useState(false);
  const [internalState, setInternalState] = useImmer({});
  const dispatch = useDispatch();
  const two = props.twoJSInstance;
  let selectorInstance = null;
  let groupObject = null;
  let resizeLineInstance = null;

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
    const prevX = localStorage.getItem('line_coordX');
    const prevY = localStorage.getItem('line_coordY');

    // Instantiate factory
    const elementFactory = new ElementCreator(two, prevX, prevY, {});
    // Get all instances of every sub child element
    const {
      group,
      pointCircle1,
      pointCircle2,
      resizeLine,
      line,
    } = elementFactory.createElement();

    if (props.parentGroup) {
      /** This element will be rendered and scoped in its parent group */
      const parentGroup = props.parentGroup;
      parentGroup.add(group);
      two.update();
    } else {
      /** This element will render by creating it's own group wrapper */
      groupObject = group;
      resizeLineInstance = resizeLine;
      const { selector } = getEditComponents(two, group, 4);
      selectorInstance = selector;

      console.log('BUtton', props.twoJSInstance);
      two.update();

      setInternalState((draft) => {
        draft.element = {
          [group.id]: group,
          [line.id]: line,
        };
        draft.group = {
          id: group.id,
          data: group,
        };
        draft.shape = {
          id: line.id,
          data: line,
        };
        draft.text = {
          data: {},
        };
        draft.icon = {
          data: {},
        };
      });

      const getGroupElementFromDOM = document.getElementById(`${group.id}`);
      getGroupElementFromDOM.addEventListener('focus', onFocusHandler);
      getGroupElementFromDOM.addEventListener('blur', onBlurHandler);

      interact(`#${group.id}`).on('click', () => {
        console.log('on click ');
        resizeLine.opacity = 1;

        two.update();
        toggleToolbar(true);
      });

      // Captures double click event for text
      // and generates temporary textarea support for it

      interact(`#${group.id}`).resizable({
        edges: { right: true, left: true },

        listeners: {
          start() {
            resizeLine.opacity = 1;
          },
          move(event) {
            console.log('on resize event', event.edges);

            // Check for which edge has been selected for resizing
            if (event.edges.left) {
              line.vertices[0].x += event.dx;
              pointCircle1.translation.x = line.vertices[0].x;
            } else if (event.edges.right) {
              // line.vertices[0].x += event.dx;
              line.vertices[1].x += event.dx;
              pointCircle2.translation.x = line.vertices[1].x;
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
            localStorage.setItem('line_coordX', parseInt(event.pageX));
            localStorage.setItem(
              'line_coordY',
              parseInt(event.pageY - offsetHeight)
            );
            dispatch(setPeronsalInformation('COMPLETE', { data: {} }));
          },
        },
      });
    }

    return () => {
      console.log('UNMOUNTING in Divider', group);
      // clean garbage by removing instance
      two.remove(group);
    };
  }, []);

  function closeToolbar() {
    toggleToolbar(false);
  }

  return (
    <React.Fragment>
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
    </React.Fragment>
  );
}

Divider.propTypes = {
  x: PropTypes.string,
  y: PropTypes.string,
};

Divider.defaultProps = {
  x: 100,
  y: 50,
};

export default Divider;
