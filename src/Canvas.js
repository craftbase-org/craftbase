import React, { Component } from "react";
import "./App.css";
import ElementWrapper from "components/elementWrapper";
import { fabric } from "fabric";
import Button from "./components/models/button";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      canvasInstance: null,
      elements: [
        { id: 1, name: "rect" }
        // { id: 2, name: "Circle" }
      ],
      lastAddedElement: {}
    };
  }

  componentDidMount() {
    var canvas = new fabric.Canvas("main-canvas", {});
    this.setState({ canvasInstance: canvas });
  }

  renderElements = () => {
    const renderData = this.state.elements.map(item => {
      const Element = ElementWrapper(item.name, {
        canvasInstance: this.state.canvasInstance,
        id: item.id,
        lastAddedElement: this.state.lastAddedElement
      });
      return <Element />;
    });

    return renderData;
  };

  addElements = element => {
    let id = parseInt(this.state.elements.length + 1);
    const currentElements = [...this.state.elements];
    currentElements.push({ id, name: element });
    // this.state.canvasInstance.remove(...this.state.canvasInstance.getObjects());
    this.setState({
      elements: currentElements,
      lastAddedElement: { id, name: element }
    });
  };

  getAllElementsData = () => {
    const canvas = this.state.canvasInstance;
    canvas &&
      console.log(
        "this.state.canvasInstance.getObjects()",
        canvas.getObjects(),
        canvas.getObjects().map(el => el.type)
      );
  };

  render() {
    console.log("get all elements", this.getAllElementsData());
    return (
      <React.Fragment>
        <canvas
          id="main-canvas"
          width="800"
          height="400"
          //   style="border:1px solid #ccc"
        ></canvas>

        {this.state.canvasInstance && (
          <React.Fragment>
            {" "}
            {this.renderElements()}{" "}
            <Button canvasInstance={this.state.canvasInstance} />
          </React.Fragment>
        )}

        <div class="controls">
          <p>
            <button id="add" onClick={() => this.addElements("rect")}>
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

export default App;
