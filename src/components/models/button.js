import React, { Component } from "react";
import { fabric } from "fabric";
import PropTypes from "prop-types";
import idx from "idx";
import { calcCoordsFromRect } from "utils";

class Button extends Component {
  constructor(props) {
    super(props);

    this.state = {
      itextInstance: null,
      rectInstance: null,
      groupInstance: null
    };
  }
  componentDidMount() {
    // this.canvas = new fabric.Canvas("main-canvas", {});

    if (this.props.canvasInstance) {
      const { x, y } = this.props;
      const canvas = this.props.canvasInstance;

      let rect = new fabric.Rect({
        left: x,
        top: y,
        fill: "rgb(26, 174, 159)",
        width: 200,
        height: 50,
        objectCaching: false,
        transparentCorners: false,
        cornerColor: "blue",
        strokeWidth: 1,
        cornerStyle: "circle"
      });

      let textCoords = calcCoordsFromRect(rect);
      let itext = new fabric.IText("fabricjs", {
        fontFamily: "Ubuntu",
        left: textCoords.left, //Take the block's position
        top: textCoords.top,
        fill: "#eee",
        fontSize: "22",
        textAlign: "center"
      });

      let group = new fabric.Group([rect, itext], {
        top: 200,
        left: 250,
        originX: "center",
        originY: "center",
        objectCaching: false,
        transparentCorners: false,
        cornerColor: "blue",
        strokeWidth: 2,
        cornerStyle: "circle"
      });
      // rect.co;
      canvas.add(group);
      canvas.setActiveObject(group);

      //   group.on(
      //     "mousedown",
      //     fabricDblClick(grp, function(obj) {
      //       console.log("Event of dbl click");
      //     })
      //   );
      this.setState({
        itextInstance: itext,
        rectInstance: rect,
        groupInstance: group
      });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { itextInstance, rectInstance, groupInstance } = this.state;
    let group = groupInstance;
    const { canvasInstance } = this.props;
    let canvas = canvasInstance;
    let itext = itextInstance;
    let rect = rectInstance;

    group.on("mousedblclick", e => {
      console.log("DBL click on group", group._objects);
      this.onGroupDBLClick(e, itext, rect, group);
      // Re-group when text editing finishes
    });
  }

  onGroupDBLClick = (e, itext, rect, group) => {
    console.log("INTO DOUBLE CLICK");
    let newGroup = null;
    const canvas = this.props.canvasInstance;
    const groupMetaData = { ...e.target };
    delete groupMetaData._objects;

    const items = group._objects;
    group._restoreObjectsState();
    canvas.remove(group);
    for (var i = 0; i < items.length; i++) {
      canvas.add(items[i]);
    }
    // if you have disabled render on addition
    canvas.setActiveObject(items[1]);
    // canvas.renderAll();

    // Directly after double click, give focus to text area and
    // transform it into editing state
    itext.enterEditing();
    itext.hiddenTextarea.focus();

    let previousText = itext.text;
    itext.on("editing:exited", e => {
      console.log("ITEXT EDITING EXIT", itext.text, previousText);
      const newItems = [];
      items.forEach(function(obj) {
        // Get Previous IText's text as user edited before exiting,
        // and assign that to new IText Instance
        if (obj.type === "i-text") {
          obj.text = itext.text;
        }

        newItems.push(obj);
        canvas.remove(obj);
      });

      let group = new fabric.Group(newItems, {
        top: groupMetaData.top,
        left: groupMetaData.left,
        width: groupMetaData.width,
        height: groupMetaData.height,
        originX: "center",
        originY: "center"
      });
      // rect.co;
      canvas.remove(this.state.itextInstance);
      canvas.remove(this.state.rectInstance);
      canvas.remove(this.state.groupInstance);
      console.log("before adding new group");
      canvas.add(group);
      canvas.setActiveObject(group);
      newGroup = group;
      this.setState({
        itextInstance: newItems[1],
        rectInstance: newItems[0],
        groupInstance: newGroup
      });
    });
  };

  rectChange = () => {
    const { rectInstance, itextInstance, groupInstance } = this.state;
    rectInstance.fill = "blue";
    this.props.canvasInstance.remove(groupInstance);
    let group = new fabric.Group([rectInstance, itextInstance], {
      top: groupInstance.top,
      left: groupInstance.left,
      width: groupInstance.width,
      height: groupInstance.height,
      originX: "center",
      originY: "center"
    });
    this.props.canvasInstance.add(group);
  };

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
    return (
      <React.Fragment>
        <button onClick={this.rectChange}>change rect in group</button>
      </React.Fragment>
    );
  }
}

Button.propTypes = {
  x: PropTypes.string,
  y: PropTypes.string
};

Button.defaultProps = {
  x: 100,
  y: 50
};

export default Button;
