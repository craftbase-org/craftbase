// import React, { Component } from "react";
// // import { fabric } from "fabric";
// import PropTypes from "prop-types";

// class Circle extends Component {
//   constructor(props) {
//     super(props);

//     this.state = {};
//   }

//   componentDidMount() {
//     // this.canvas = new fabric.Canvas("main-canvas", {});
//     if (this.props.canvasInstance) {
//       const { x, y } = this.props;
//       const canvas = this.props.canvasInstance;

//       // create a circle object

//       function Add() {
//         let rect = new fabric.Circle({
//           left: x,
//           top: y,
//           radius: 65,
//           fill: "#039BE5",
//           left: 0,
//           stroke: "red",
//           strokeWidth: 3
//         });

//         // rect.co;
//         canvas.add(rect);
//         canvas.setActiveObject(rect);
//       }

//       // fabric.Object.prototype.controls.deleteControl = new fabric.Control({
//       //   position: { x: 0.5, y: -0.5 },
//       //   offsetY: 10,
//       //   cursorStyle: "pointer",
//       //   mouseUpHandler: deleteObject,
//       //   render: renderIcon,
//       //   cornerSize: 24
//       // });

//       Add();
//     }
//   }

//   addObject = () => {
//     const canvas = this.props.canvasInstance;
//     let rect = new fabric.Circle({
//       radius: 65,
//       fill: "#039BE5",
//       left: 0,
//       stroke: "red",
//       strokeWidth: 3
//     });

//     canvas.add(rect);
//     canvas.setActiveObject(rect);
//   };
//   render() {
//     return <React.Fragment></React.Fragment>;
//   }
// }

// Circle.propTypes = {
//   x: PropTypes.string,
//   y: PropTypes.string
// };

// Circle.defaultProps = {
//   x: 100,
//   y: 50
// };

// export default Circle;
