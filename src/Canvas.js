import React, { Component } from "react";
import { connect } from "react-redux";

import ElementWrapper from "components/elementWrapper";
import Two from "two.js";
import Rectangle from "./components/shapes/rect";

import { getElementsData } from "redux/actions/main";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      twoJSInstance: null,
      elements: [
        { id: 1, name: "rect" },
        // { id: 2, name: "Circle" }
      ],
      lastAddedElement: {},
    };
  }

  componentDidMount() {
    console.log("CANVAS CDM");
    const elem = document.getElementById("main-two-root");
    const two = new Two({
      fullscreen: true,
      // width: "auto",
    }).appendTo(elem);

    const arr = [
      // { id: 1, name: "buttonwithicon" },
      // { id: 2, name: "toggle" },
      // { id: 3, name: "tooltip" },
      // { id: 4, name: "circle" },
      // { id: 5, name: "imagecard" },
      // { id: 6, name: "rectangle" },
      // { id: 7, name: "divider" },
      { id: 8, name: "avatar" },
      // { id: 9, name: "linkwithicon" },
      { id: 10, name: "text" },
      // { id: 11, name: "overlay" },
      { id: 12, name: "button" },
      // { id: 13, name: "checkbox" },
      // { id: 14, name: "radiobox" },
      { id: 15, name: "textinput" },
      // { id: 16, name: "dropdown" },
      // { id: 17, name: "textarea" },
      // {
      //   id: 18,
      //   name: "groupobject",
      //   children: [
      //     { id: 9, name: "link", x: 30 },
      //     { id: 8, name: "avatar", x: -30 },
      //   ],
      // },
    ];

    this.props.getElementsData("CONSTRUCT", arr);
    this.setState({ twoJSInstance: two });
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.elementData !== this.props.elementData) {
      // this.state.twoJSInstance.scene.remove();
    }
  }

  changeInPlan = () => {
    const arr = [
      { id: 1, name: "button" },
      { id: 2, name: "toggle" },
      { id: 3, name: "tooltip" },
      { id: 4, name: "circle" },
    ];
    this.props.getElementsData("CONSTRUCT", arr);
  };

  renderElements = () => {
    console.log(
      "At the time of rendering",
      this.state.twoJSInstance.scene.children
    );

    const elements = this.props.elementData;
    const renderData = elements.map((item) => {
      const Element = ElementWrapper(item.name, {
        twoJSInstance: this.state.twoJSInstance,
        id: item.id,
        childrenArr: item.children,
      });
      return (
        <React.Fragment key={item.id}>
          <Element />
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
      { id: 1, name: "circle" },
    ];
    this.props.getElementsData("CONSTRUCT", arr);
  };

  render() {
    return (
      <React.Fragment>
        <div id="rsz-rect"></div>
        <div id="main-two-root"></div>
        {this.state.twoJSInstance && (
          <React.Fragment>
            {" "}
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

        <div className="controls">
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
        </div>
      </React.Fragment>
    );
  }
}

function mapStateToProps(state) {
  return {
    elementData: state.main.elementData,
  };
}
export default connect(mapStateToProps, {
  getElementsData,
})(App);
