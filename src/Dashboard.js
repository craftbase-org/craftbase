import React, { Component } from "react";
import Canvas from "./Canvas";
import Sidebar from "components/sidebar/primary";

class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  render() {
    return (
      <div>
        <Sidebar />
        <Canvas />
      </div>
    );
  }
}

export default Dashboard;
