import React, { Component } from "react";
import { fabric } from "fabric";
import PropTypes from "prop-types";
import idx from "idx";

class Rectangle extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }
  componentDidMount() {
    // this.canvas = new fabric.Canvas("main-canvas", {});
    console.log(
      "CDM Rect check",
      // this.props.canvasInstance,
      idx(this.props.lastAddedElement, _ => _.id) === this.props.id,
      this.props
    );
    if (
      this.props.canvasInstance &&
      idx(this.props.lastAddedElement, _ => _.id) === this.props.id
    ) {
      const { x, y } = this.props;
      const canvas = this.props.canvasInstance;
      // create a rect object
      let deleteIcon =
        "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'%3E%3Csvg version='1.1' id='Ebene_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='595.275px' height='595.275px' viewBox='200 215 230 470' xml:space='preserve'%3E%3Ccircle style='fill:%23F44336;' cx='299.76' cy='439.067' r='218.516'/%3E%3Cg%3E%3Crect x='267.162' y='307.978' transform='matrix(0.7071 -0.7071 0.7071 0.7071 -222.6202 340.6915)' style='fill:white;' width='65.545' height='262.18'/%3E%3Crect x='266.988' y='308.153' transform='matrix(0.7071 0.7071 -0.7071 0.7071 398.3889 -83.3116)' style='fill:white;' width='65.544' height='262.179'/%3E%3C/g%3E%3C/svg%3E";

      let img = document.createElement("img");
      img.src = deleteIcon;

      function Add() {
        let rect = new fabric.Rect({
          left: x,
          top: y,
          fill: "rgb(26, 174, 159)",
          width: 200,
          height: 100,
          objectCaching: false,
          transparentCorners: false,
          cornerColor: "blue",
          strokeWidth: 2,
          cornerStyle: "circle"
        });
        // rect.co;
        canvas.add(rect);
        canvas.setActiveObject(rect);
      }

      // fabric.Object.prototype.controls.deleteControl = new fabric.Control({
      //   position: { x: 0.5, y: -0.5 },
      //   offsetY: 10,
      //   cursorStyle: "pointer",
      //   mouseUpHandler: deleteObject,
      //   render: renderIcon,
      //   cornerSize: 24
      // });

      Add();

      function deleteObject(eventData, target) {
        let canvas = target.canvas;
        canvas.remove(target);
        canvas.requestRenderAll();
      }

      function renderIcon(ctx, left, top, styleOverride, fabricObject) {
        if (!this.getVisibility(fabricObject)) {
          return;
        }
        var size = this.cornerSize;
        ctx.save();
        ctx.translate(left, top);
        ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
      }
    }
  }

  addObject = () => {
    const canvas = this.props.canvasInstance;
    let rect = new fabric.Rect({
      left: 100,
      top: 50,
      fill: "yellow",
      width: 200,
      height: 100,
      objectCaching: false,
      transparentCorners: false,
      cornerColor: "blue",
      stroke: "lightgreen",
      strokeWidth: 4,
      cornerStyle: "circle"
    });

    canvas.add(rect);
    canvas.setActiveObject(rect);
  };
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

// Functions

function create(canvasInstance, cod) {
  const canvas = canvasInstance;
  let rect = new fabric.Rect({
    left: cod.x,
    top: cod.y,
    fill: "yellow",
    width: 200,
    height: 100,
    objectCaching: false,
    transparentCorners: false,
    cornerColor: "blue",
    stroke: "lightgreen",
    strokeWidth: 4,
    cornerStyle: "circle"
  });
  // rect.co;
  canvas.add(rect);
  canvas.setActiveObject(rect);
}
