import React, { Component } from "react";
import PropTypes from "prop-types";
import idx from "idx";

class Rectangle extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }
  componentDidMount() {
    // this.canvas = new fabric.Canvas("main-canvas", {});
    if (this.props.twoJSInstance) {
      const two = this.props.twoJSInstance;
      // Calculate x and y through dividing width and height by 2
      // if x and y are given then multiply width and height into 2
      const rect = two.makeRectangle(55, 20, 110, 55);
      rect.fill = "yellow";
      rect.noStroke();
      console.log("rect", rect);
      two.update();
    }
  }

  render() {
    return <React.Fragment></React.Fragment>;
  }
}

Rectangle.propTypes = {
  x: PropTypes.string,
  y: PropTypes.string
};

Rectangle.defaultProps = {
  x: 100,
  y: 50
};

export default Rectangle;
