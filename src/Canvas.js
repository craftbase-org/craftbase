import React, { Component } from 'react';
import { connect } from 'react-redux';

import ComponentWrapper from 'components/elementWrapper';
import Toolbar from 'components/floatingToolbar';
import Two from 'two.js';
import { getElementsData } from 'store/actions/main';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      twoJSInstance: null,
      elements: [
        { id: 1, name: 'rect' },
        // { id: 2, name: "Circle" }
      ],
      lastAddedElement: {},
    };
  }

  componentDidMount() {
    console.log('CANVAS CDM');
    const elem = document.getElementById('main-two-root');

    // Logic for capturing events in empty space in drawing area
    document
      .getElementById('main-two-root')
      .addEventListener('mousedown', (e) => {
        console.log('event mouse down main root', e);
        document.getElementById('main-two-root').focus();
        if (e.target.tagName == 'svg') {
          const rect = document.getElementById('selector-rect');
          rect.style.position = 'absolute';
          rect.style.zIndex = '1';
          rect.style.width = '20px';
          rect.style.height = '20px';
          rect.style.border = '0px dashed grey';
          rect.style.transform = `translateX(${e.x - 10}px) translateY(${
            e.y - 10
          }px) `;
          document.getElementById('main-two-root').blur();
          rect.setAttribute('draggable', true);
        }
      });

    document.getElementById('selector-rect').addEventListener('drag', (e) => {
      console.log('selector-rect being dragged', e);
      const rect = document.getElementById('selector-rect');
      rect.style.zIndex = '1';
      rect.style.border = '1px dashed grey';
      rect.style.width = `${Math.abs(e.offsetX)}px`;
      rect.style.height = `${Math.abs(e.offsetY)}px`;
      console.log('rect getBoundingClientRect', rect.getBoundingClientRect());
    });

    document
      .getElementById('selector-rect')
      .addEventListener('dragend', (e) => {
        console.log('selector-rect drag end', e);
        const rect = document.getElementById('selector-rect');
        rect.style.zIndex = '-1';
        rect.style.width = `${Math.abs(e.offsetX)}px`;
        rect.style.height = `${Math.abs(e.offsetY)}px`;
        rect.setAttribute('draggable', false);
        rect.blur();
        console.log('rect getBoundingClientRect', rect.getBoundingClientRect());
        this.handleFinalDrag(rect.getBoundingClientRect());
        // rect.style.width = `${e.offsetX}px`;
        // rect.style.height = `${e.offsetY}px`;
        // console.log("rect getBoundingClientRect", rect.getBoundingClientRect());
      });

    document.getElementById('main-two-root').addEventListener('mouseup', () => {
      console.log('event mouse up main root');
    });

    const two = new Two({
      fullscreen: true,
      // width: "auto",
    }).appendTo(elem);

    const arr = [
      //   { id: 1, name: 'buttonwithicon' },

      //   { id: 3, name: 'tooltip' },
      //   { id: 4, name: 'circle', data: { x: 272, y: 707, name: 'circle' } },
      //   { id: 5, name: 'imagecard' },
      { id: 6, name: 'rectangle', data: { x: 290, y: 430, name: 'rectangle' } },
      //   { id: 2, name: 'toggle' },
      //   { id: 7, name: 'divider' },
      //   { id: 8, name: 'avatar' },
      //   { id: 9, name: 'linkwithicon' },
      { id: 10, name: 'text', data: { fontSize: '16' } },
      //   { id: 11, name: 'overlay' },
      { id: 12, name: 'button' },
      //   { id: 13, name: 'checkbox' },
      //   { id: 14, name: 'radiobox' },
      //   { id: 15, name: 'textinput' },
      //   { id: 16, name: 'dropdown' },
      //   { id: 17, name: 'textarea' },
      // {
      //   id: 18,
      //   name: "groupobject",
      //   children: [
      //     { id: 9, name: "linkwithicon", x: 30 },
      //     { id: 8, name: "avatar", x: -30 },
      //   ],
      // },
    ];

    this.props.getElementsData('CONSTRUCT', arr);
    this.setState({ twoJSInstance: two });
  }

  handleFinalDrag = (e) => {
    console.log('final drag', e);
    this.props.getElementsData('AREA_SELECTION', e);
  };

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.componentData !== this.props.componentData) {
      // this.state.twoJSInstance.scene.remove();
    }
  }

  renderElements = () => {
    console.log(
      'At the time of rendering',
      this.state.twoJSInstance.scene.children
    );

    const elements = this.props.componentData;
    const renderData = elements.map((item) => {
      const NewComponent = ComponentWrapper(item.name, {
        twoJSInstance: this.state.twoJSInstance,
        id: item.id,
        childrenArr: item.children,
        itemData: item,
      });
      return (
        <React.Fragment key={item.id}>
          <NewComponent />
        </React.Fragment>
      );
    });

    return renderData;
  };

  addElements = (elementName, id) => {
    const arr = [
      // { id: 1, name: "button" },
      // { id: 2, name: "toggle" },
      // { id: 1, name: "tooltip" },
      { id: 1, name: 'circle' },
    ];
    this.props.getElementsData('CONSTRUCT', arr);
  };

  render() {
    return (
      <React.Fragment>
        <div id="rsz-rect"></div>
        <div id="selector-rect"></div>

        <div id="main-two-root"></div>
        {this.state.twoJSInstance && (
          <React.Fragment>
            {' '}
            {this.renderElements()}
            {/* <Rectangle twoJSInstance={this.state.twoJSInstance} /> */}
            {/* <Button
              updateParent={() => {
                console.log("update parent");
                this.setState({ lastAddedElement: null });
              }}
              twoJSInstance={this.state.twoJSInstance}
            /> */}
          </React.Fragment>
        )}
        {/* <Toolbar /> */}
        {/* <div className="controls">
          <p>
            <button id="add" onClick={() => this.addElements("button", 2)}>
              Add a rectangle
            </button>

            <button
              id="add-1-2"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              // onClick={() => this.addElements("circle")}
            >
              Toggle me
            </button>
            <button
              onClick={() => {
                this.changeInPlan();
              }}
            >
              Delete
            </button>
            <button
              onClick={() => {
                this.getAllElementsData();
              }}
            >
              {" "}
              Get all elements data{" "}
            </button>
          </p>
        </div> */}
      </React.Fragment>
    );
  }
}

function mapStateToProps(state) {
  return {
    componentData: state.main.componentData,
  };
}
export default connect(mapStateToProps, {
  getElementsData,
})(App);
