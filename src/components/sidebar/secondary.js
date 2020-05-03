import React, { Component } from "react";
import Icon from "icons/icon";

class SecondarySidebar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedItem: "shapes",
    };
  }

  componentDidMount() {
    // setting focus on secondary sidebar to have blur event
    // effective right on from that
    document.getElementById("sec-sidebar").focus();
  }

  getItemRenderData = (item) => {
    switch (item) {
      case "elements":
        return (
          <div className="secondary-sidebar-content secondary-sidebar-elements w-32 px-2 py-2 bg-white block text-left">
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold my-1 px-4">
              Button
            </button>
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold my-1 px-4">
              Image
            </button>
          </div>
        );
      case "shapes":
        return (
          <div className="secondary-sidebar-content secondary-sidebar-shapes w-32 px-2 py-2 bg-white block text-left">
            <button
              className="inline-block px-1"
              onMouseDown={() => {
                console.log("shape on click");
                this.props.handleOnBlur("circle");
              }}
            >
              {" "}
              <Icon icon="SIDEBAR_ICON_CIRCLE" width={28} height={28} />
            </button>
            <button
              className="inline-block px-1"
              onMouseDown={() => {
                console.log("shape on click");
                this.props.handleOnBlur("rectangle");
              }}
            >
              {" "}
              <Icon icon="SIDEBAR_ICON_RECTANGLE" width={23} />
            </button>
            <button
              className="inline-block px-1"
              onMouseDown={() => {
                console.log("shape on click");
                this.props.handleOnBlur("rectangle");
              }}
            >
              <Icon icon="SIDEBAR_ICON_POLYGON" />
            </button>
          </div>
        );
      default:
        break;
    }
  };

  renderItems = () => {
    const selectedItems = this.props.selectedItem;
    const toRender = this.getItemRenderData(selectedItems);

    return toRender;
  };

  render() {
    return (
      <div
        tabIndex="-1"
        id="sec-sidebar"
        onBlur={() => {
          console.log("sec sidebar on blur");

          // This will also act if user doesn't select any item from secondary sidebar
          // leading to no action for redux
          this.props.handleOnBlur();
        }}
        className="relative "
      >
        {this.renderItems()}
      </div>
    );
  }
}

export default SecondarySidebar;
