import React, { Component } from "react";
import { connect } from "react-redux";

import ElementWrapper from "components/elementWrapper";
import Two from "two.js";
import Rectangle from "./components/shapes/rect";
import Button from "./components/elements/button";

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
    const elem = document.getElementById("main-two-root");
    const two = new Two({
      fullscreen: false,
      width: window.screen.width - 100,
    }).appendTo(elem);

    const arr = [
      // { id: 1, name: "button" },
      // { id: 2, name: "toggle" },
      { id: 1, name: "tooltip" },
    ];
    this.props.getElementsData("CONSTRUCT", arr);
    this.setState({ twoJSInstance: two });
  }

  renderElements = () => {
    const elements = this.props.elementData;
    const renderData = elements.map((item) => {
      const Element = ElementWrapper(item.name, {
        twoJSInstance: this.state.twoJSInstance,
        id: item.id,
      });
      return <Element />;
    });

    return renderData;
  };

  addElements = (elementName, id) => {
    const newId = this.props.elementData.length + 1;
    this.props.getElementsData("ADD_ELEMENT", { id: newId, name: elementName });
  };

  render() {
    return (
      <React.Fragment>
        <div id="main-two-root"></div>
        <Rectangle twoJSInstance={this.state.twoJSInstance} />
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

        <div class="controls">
          <p>
            <button id="add" onClick={() => this.addElements("button", 2)}>
              Add a rectangle
            </button>
            <button id="add" onClick={() => this.addElements("circle")}>
              Add a circle
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
