import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import interact from 'interactjs';
import { useDispatch, useSelector } from 'react-redux';
import ObjectSelector from 'components/utils/objectSelector';
import { setPeronsalInformation } from 'store/actions/main';
import ElementFactory from 'factory/text';

function Text(props) {
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
    const prevX = localStorage.getItem('text_coordX');
    const prevY = localStorage.getItem('text_coordY');

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
      if (groupInstance === null) setGroupInstance(group);

      const selector = new ObjectSelector(two, group, 0, 0, 0, 0, 4);
      selector.create();
      selectorInstance = selector;

      group.children.unshift(rectTextGroup);
      two.update();

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
      });

      // Captures double click event for text
      // and generates temporary textarea support for it
      text._renderer.elem.addEventListener('dblclick', () => {
        console.log('on click for texy', text.id);

        // Hide actual text and replace it with input box
        const twoTextInstance = document.getElementById(`${text.id}`);
        const getCoordOfBtnText = twoTextInstance.getBoundingClientRect();
        twoTextInstance.style.display = 'none';

        const input = document.createElement('input');
        const topBuffer = 2;
        input.type = 'text';
        input.value = text.value;
        input.style.color = '#0052CC';
        input.style.fontSize = `${text.size}px`;
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
          input.style.width = `${
            rectTextGroup.getBoundingClientRect(true).width + 4
          }px`;

          // Synchronously update selector tool's coordinates
          text.value = input.value;
          rectangle.width = input.value.length * 14;

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
        edges: { right: true, left: true, top: true, bottom: true },

        listeners: {
          move(event) {
            var target = event.target;
            var rect = event.rect;

            const rosterSize = rect.width / 6;
            // Restrict width to shrink if it has reached point
            //  where it's width should be less than or equal to text's
            if (rect.width > text.getBoundingClientRect().width) {
              rectangle.width = rect.width;
              rectangle.height = rect.height;
              text.size = rosterSize;
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
            localStorage.setItem('text_coordX', parseInt(event.pageX));
            localStorage.setItem(
              'text_coordY',
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
      console.log('UNMOUNTING in Circle', groupInstance);
      // clean garbage by removing instance
      two.remove(groupInstance);
    };
  }, []);

  return (
    <React.Fragment>
      <div id="two-text"></div>
      <button>change button in group</button>
    </React.Fragment>
  );
}

// Text.propTypes = {
//   x: PropTypes.string,
//   y: PropTypes.string,
// };

// Text.defaultProps = {
//   x: 100,
//   y: 50,
// };

export default Text;
