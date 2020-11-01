import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Two from 'two.js';
import interact from 'interactjs';
import { useDispatch, useSelector } from 'react-redux';
import { useImmer } from 'use-immer';

import { elementOnBlurHandler } from 'utils/misc';
import getEditComponents from 'components/utils/editWrapper';
import Toolbar from 'components/floatingToolbar';
import Icon from 'icons/icons';
import ObjectSelector from 'components/utils/objectSelector';
import { setPeronsalInformation } from 'store/actions/main';

function Checkbox(props) {
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
    const offsetHeight = 0;
    let checkboxCounter = 2;

    const prevX = localStorage.getItem('checkbox_coordX');
    const prevY = localStorage.getItem('checkbox_coordY');

    const currentCheckboxes = [
      { name: 'checkbox 1', checked: false },
      { name: 'checkbox 2', checked: true },
      { name: 'checkbox 3', checked: false },
    ];

    const svgImage = new DOMParser().parseFromString(
      Icon.ICON_CHECKBOX_1.data,
      'text/xml'
    );

    const textMap = {};
    const rectMap = {};
    const groupMap = {};
    const svgMap = {};

    // Iterating over data and attaching to it's respective mappings
    currentCheckboxes.forEach((item, index) => {
      // construct text part of the checkbox
      let text = new Two.Text(item.name, 10, index * 30);
      text.alignment = 'left';
      text.size = '16';
      text.weight = '400';
      text.baseline = 'central';

      // construct external sqaure shape part of the checkbox
      // Subtracted to some value to have rect positioned in aligned manner
      let rect = two.makeRectangle(-10, index * 30, 15, 15);
      rect.stroke = '#B3BAC5';

      // construct tick mark part of the checkbox by attaching custom
      // svg of tick mark
      const externalSVG = two.interpret(
        svgImage.firstChild.firstChild.firstChild
      );

      externalSVG.translation.x = -10;
      externalSVG.translation.y = index * 30;
      externalSVG.scale = 0.04;
      externalSVG.opacity = 0;
      // externalSVG.center();
      if (item.checked) {
        externalSVG.opacity = 1;
      }

      // construct group to combine all parts into one
      let group = two.makeGroup(rect, externalSVG, text);

      // group.children.unshift(externalSVG);

      textMap[`checkbox${index}`] = text;
      rectMap[`checkbox${index}`] = rect;
      svgMap[`checkbox${index}`] = externalSVG;
      groupMap[`checkbox${index}`] = group;
    });

    const checkboxGroup = two.makeGroup(Object.values(groupMap));

    // console.log("checkboxGroup", checkboxGroup, checkboxGroup.id);

    if (props.parentGroup) {
      /** This element will be rendered and scoped in its parent group */
      const parentGroup = props.parentGroup;
      parentGroup.add(checkboxGroup);
      two.update();
    } else {
      /** This element will render by creating it's own group wrapper */
      const group = two.makeGroup(checkboxGroup);
      group.translation.x = prevX || 500;
      group.translation.y = prevY || 200;
      groupObject = group;

      // console.log("text bounding initial", group.id, checkboxGroup.id);

      const { selector } = getEditComponents(two, group, 4);
      selectorInstance = selector;

      // Shifting order of objects in group to reflect "z-index alias" mechanism for text box
      group.children.unshift(checkboxGroup);
      two.update();

      setInternalState((draft) => {
        draft.element = {
          [checkboxGroup.id]: checkboxGroup,
          [group.id]: group,
          // [selector.id]: selector,
        };
        draft.group = {
          id: group.id,
          data: group,
        };
        draft.shape = {
          data: {},
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

      const addCheckboxClickHandler = (index, initialLoad) => {
        // console.log("add checkbox listener");
        checkboxCounter = checkboxCounter + 1;

        // construct text part of the checkbox
        let text = new Two.Text(
          `checkbox ${checkboxCounter + 1}`,
          10,
          checkboxCounter * 30
        );
        text.alignment = 'left';
        text.size = '16';
        text.weight = '400';
        text.baseline = 'central';

        // construct external sqaure shape part of the checkbox
        // Subtracted to some value to have rect positioned in aligned manner
        let rect = two.makeRectangle(-10, checkboxCounter * 30, 15, 15);
        rect.stroke = '#B3BAC5';

        // construct tick mark part of the checkbox by attaching custom
        // svg of tick mark
        const externalSVG = two.interpret(
          svgImage.firstChild.firstChild.firstChild
        );

        externalSVG.translation.x = -10;
        externalSVG.translation.y = checkboxCounter * 30;
        externalSVG.scale = 0.04;
        externalSVG.opacity = 0;

        // construct group to combine all parts into one
        let group = two.makeGroup(rect, externalSVG, text);

        textMap[`checkbox${checkboxCounter}`] = text;
        rectMap[`checkbox${checkboxCounter}`] = rect;
        svgMap[`checkbox${checkboxCounter}`] = externalSVG;
        groupMap[`checkbox${checkboxCounter}`] = group;

        checkboxGroup.add(group);
        two.update();

        attachEventToCheckboxes();
      };

      interact(`#${group.id}`).on('click', () => {
        selector.update(
          checkboxGroup.getBoundingClientRect(true).left - 10,
          checkboxGroup.getBoundingClientRect(true).right + 10,
          checkboxGroup.getBoundingClientRect(true).top - 10,
          checkboxGroup.getBoundingClientRect(true).bottom + 10
        );

        document
          .getElementById('checkbox-add')
          .addEventListener('click', addCheckboxClickHandler);

        two.update();
        toggleToolbar(true);
      });

      // Store the ids of all checkbox elements
      let checkboxTextArr = [];
      let checkboxRectArr = [];
      let checkboxSvgArr = [];

      // Loop and attach event listeners to all elements
      function attachEventToCheckboxes(flushEvents) {
        for (let index = 0; index < Object.values(textMap).length; index++) {
          /* Double Click event handling portion for text*/
          let text = Object.values(textMap)[index];

          const dblClickHandler = () => {
            // Hide actual text and replace it with input box
            const twoTextInstance = document.getElementById(`${text.id}`);
            const getCoordOfBtnText = document
              .getElementById(`${text.id}`)
              .getBoundingClientRect();
            twoTextInstance.style.display = 'none';

            const input = document.createElement('input');
            const topBuffer = 2;
            input.type = 'text';
            input.value = text.value;
            input.style.fontSize = '16px';
            input.style.fontWeight = '400';
            input.style.position = 'absolute';
            input.style.top = `${getCoordOfBtnText.top - topBuffer}px`;
            input.style.left = `${getCoordOfBtnText.left}px`;
            input.style.width = `${
              checkboxGroup.getBoundingClientRect(true).width
            }px`;
            input.className = 'temp-input-area';

            // Appending in space of two's root element
            document.getElementById('main-two-root').append(input);

            // Declaratively set focus for input box
            input.onfocus = function (e) {
              console.log('on input focus');
              selector.show();
              two.update();
            };
            input.focus();

            // Handle input event for input box
            input.addEventListener('input', () => {
              input.style.width = `${
                checkboxGroup.getBoundingClientRect(true).width + 4
              }px`;

              // Synchronously update selector tool's coordinates
              text.value = input.value;
              selector.update(
                checkboxGroup.getBoundingClientRect(true).left - 10,
                checkboxGroup.getBoundingClientRect(true).right + 30,
                checkboxGroup.getBoundingClientRect(true).top - 10,
                checkboxGroup.getBoundingClientRect(true).bottom + 10
              );
              two.update();
            });

            // Handle Input box blur event
            input.addEventListener('blur', () => {
              twoTextInstance.style.display = 'block';
              text.value = input.value;
              input.remove();

              selector.update(
                checkboxGroup.getBoundingClientRect(true).left - 10,
                checkboxGroup.getBoundingClientRect(true).right + 10,
                checkboxGroup.getBoundingClientRect(true).top - 10,
                checkboxGroup.getBoundingClientRect(true).bottom + 10
              );
              selector.hide();
              two.update();
            });
          };

          if (!checkboxTextArr.includes(text.id)) {
            checkboxTextArr.push(text.id);
            document
              .getElementById(text.id)
              .addEventListener('click', dblClickHandler);
          }

          /* On click event handling portion for rect (checkbox)*/
          let rect = Object.values(rectMap)[index];
          let svg = Object.values(svgMap)[index];

          const checkboxClickHandler = () => {
            if (svg.opacity == 0) {
              svg.opacity = 1;
            } else {
              svg.opacity = 0;
            }
          };

          // One event handler for both the elements (rect and svg)
          // as user behavior would be clicking on checkbox or either empty rectangle

          if (!checkboxRectArr.includes(rect.id)) {
            checkboxRectArr.push(rect.id);
            document
              .getElementById(rect.id)
              .addEventListener('click', checkboxClickHandler);
          }

          if (!checkboxSvgArr.includes(svg.id)) {
            checkboxSvgArr.push(svg.id);
            document
              .getElementById(svg.id)
              .addEventListener('click', checkboxClickHandler);
          }
        }
      }
      attachEventToCheckboxes();

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
            localStorage.setItem('checkbox_coordX', parseInt(event.pageX));
            localStorage.setItem(
              'checkbox_coordY',
              parseInt(event.pageY - offsetHeight)
            );
            dispatch(setPeronsalInformation('COMPLETE', { data: {} }));
          },
        },
      });
    }

    return () => {
      console.log('UNMOUNTING in Check box', checkboxGroup);
      // clean garbage by removing instance
      two.remove(checkboxGroup);
    };
  }, []);

  function closeToolbar() {
    toggleToolbar(false);
  }

  return (
    <React.Fragment>
      <div id="two-checkbox"></div>
      <button
        id="checkbox-add"
        className="absolute right-0"
        style={{ top: '190px' }}
      >
        add checkbox
      </button>
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

Checkbox.propTypes = {
  x: PropTypes.string,
  y: PropTypes.string,
};

Checkbox.defaultProps = {
  x: 100,
  y: 50,
};

export default Checkbox;
