import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import interact from 'interactjs';
import { useDispatch, useSelector } from 'react-redux';
import { useImmer } from 'use-immer';

import { elementOnBlurHandler } from 'utils/misc';
import getEditComponents from 'components/utils/editWrapper';
import Toolbar from 'components/floatingToolbar';

import { setPeronsalInformation } from 'store/actions/main';
import ElementFactory from 'factory/button';

function Button(props) {
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
    const prevX = localStorage.getItem('button_coordX');
    const prevY = localStorage.getItem('button_coordY');

    // Instantiate factory
    const elementFactory = new ElementFactory(two, prevX, prevY, {});
    // Get all instances of every sub child element
    const {
      group,
      rectTextGroup,
      text,
      rectangle,
    } = elementFactory.createElement();

    if (props.parentGroup) {
      /** This element will be rendered and scoped in its parent group */
      const parentGroup = props.parentGroup;
      parentGroup.add(rectTextGroup);
      two.update();
    } else {
      /** This element will render by creating it's own group wrapper */
      groupObject = group;

      const { selector } = getEditComponents(two, group, 2);
      selectorInstance = selector;

      group.children.unshift(rectTextGroup);
      two.update();

      // replace shape and shape id here
      setInternalState((draft) => {
        draft.element = {
          [rectTextGroup.id]: rectTextGroup,
          [group.id]: group,
          // [selector.id]: selector,
        };
        draft.group = {
          id: group.id,
          data: group,
        };
        draft.shape = {
          type: 'button',
          id: rectTextGroup.id,
          data: rectTextGroup,
        };
        draft.text = {
          id: text.id,
          data: text,
        };
        draft.icon = {
          data: {},
        };
      });

      const getGroupElementFromDOM = document.getElementById(`${group.id}`);
      getGroupElementFromDOM.addEventListener('focus', onFocusHandler);
      getGroupElementFromDOM.addEventListener('blur', onBlurHandler);

      interact(`#${group.id}`).on('click', () => {
        console.log('on click ', text.getBoundingClientRect(true));
        selector.update(
          rectTextGroup.getBoundingClientRect(true).left - 5,
          rectTextGroup.getBoundingClientRect(true).right + 5,
          rectTextGroup.getBoundingClientRect(true).top - 5,
          rectTextGroup.getBoundingClientRect(true).bottom + 5
        );
        two.update();
        toggleToolbar(true);
      });

      // Captures double click event for text
      // and generates temporary textarea support for it
      text._renderer.elem.addEventListener('click', () => {
        console.log('on click for texy', text.id);

        // Hide actual text and replace it with input box
        const twoTextInstance = document.getElementById(`${text.id}`);
        const getCoordOfBtnText = twoTextInstance.getBoundingClientRect();
        twoTextInstance.style.display = 'none';

        const input = document.createElement('input');
        const topBuffer = 2;
        input.type = 'text';
        input.value = text.value;
        input.style.color = '#fff';
        input.style.fontSize = '16px';
        input.style.position = 'absolute';
        input.style.top = `${getCoordOfBtnText.top - topBuffer}px`;
        input.style.left = `${getCoordOfBtnText.left}px`;
        input.style.width = `${
          rectTextGroup.getBoundingClientRect(true).width
        }px`;
        input.className = 'temp-input-area';

        document.getElementById('main-two-root').append(input);

        input.onfocus = function (e) {
          console.log('on input focus');
          selector.show();
          two.update();
        };
        input.focus();

        input.addEventListener('input', () => {
          let prevTextValue = text.value;
          input.style.width = `${
            rectTextGroup.getBoundingClientRect(true).width + 4
          }px`;

          // Synchronously update selector tool's coordinates
          text.value = input.value;

          // calculate difference to add to vertex's coordinates
          const diff = text.value.length - prevTextValue.length;

          if (diff < -2) {
            rectangle.width = rectangle.width + diff * 8 + 20;
          } else {
            rectangle.width =
              diff < 0
                ? rectangle.width + diff * 8
                : rectangle.width + diff * 14;
          }

          selector.update(
            rectTextGroup.getBoundingClientRect(true).left - 5,
            rectTextGroup.getBoundingClientRect(true).right + 5,
            rectTextGroup.getBoundingClientRect(true).top - 5,
            rectTextGroup.getBoundingClientRect(true).bottom + 5
          );
          two.update();
          input.style.left = `${
            document.getElementById(rectangle.id).getBoundingClientRect().left +
            20
          }px`;
        });

        input.addEventListener('blur', () => {
          twoTextInstance.style.display = 'block';
          text.value = input.value;
          input.remove();

          // USE 4 LINES 4 CIRCLES

          selector.update(
            rectTextGroup.getBoundingClientRect(true).left - 5,
            rectTextGroup.getBoundingClientRect(true).right + 5,
            rectTextGroup.getBoundingClientRect(true).top - 5,
            rectTextGroup.getBoundingClientRect(true).bottom + 5
          );
          selector.hide();
          two.update();
        });
      });

      interact(`#${group.id}`).resizable({
        edges: { right: true, left: true },

        listeners: {
          move(event) {
            var target = event.target;
            var rect = event.rect;

            // Restrict width to shrink if it has reached point
            //  where it's width should be less than or equal to text's
            if (rect.width > text.getBoundingClientRect().width) {
              rectangle.width = rect.width;
              selector.update(
                rectTextGroup.getBoundingClientRect(true).left - 5,
                rectTextGroup.getBoundingClientRect(true).right + 5,
                rectTextGroup.getBoundingClientRect(true).top - 5,
                rectTextGroup.getBoundingClientRect(true).bottom + 5
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
            two.update();
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
            localStorage.setItem('button_coordX', parseInt(event.pageX));
            localStorage.setItem(
              'button_coordY',
              parseInt(event.pageY - offsetHeight)
            );
            dispatch(setPeronsalInformation('COMPLETE', { data: {} }));
          },
        },
      });
    }

    return () => {
      console.log('UNMOUNTING in Button', group);
      // clean garbage by removing instance
      two.remove(group);
    };
  }, []);

  function closeToolbar() {
    toggleToolbar(false);
  }

  return (
    <React.Fragment>
      <div id="two-button"></div>
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

Button.propTypes = {
  x: PropTypes.string,
  y: PropTypes.string,
};

Button.defaultProps = {
  x: 100,
  y: 50,
};

export default Button;
