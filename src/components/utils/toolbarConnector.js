import { properties } from "utils/constants";

export default class ToolBar {
  constructor() {
    this.toolBarDOM = document.getElementById("floating-toolbar");
  }
  create_color_bg() {
    // contains DOM creation and styling part
  }
  create_color_text() {
    // contains DOM creation and styling part
  }
  create_color_icon() {
    // contains DOM creation and styling part
  }
  create_font_size() {
    // contains DOM creation and styling part
  }
  create_font_weight() {
    // contains DOM creation and styling part
  }
  create_alignment() {
    // contains DOM creation and styling part
  }
  create_border_color() {
    // contains DOM creation and styling part
  }
  create_border_width() {
    // contains DOM creation and styling part
  }
  create_link_url() {
    // contains DOM creation and styling part
  }
  create_opacity() {
    // contains DOM creation and styling part
  }
  create() {
    // create bare bones for toolbar
    // this.toolBarDOM.style.left = "500px";
    // this.toolBarDOM.style.top = "300px";
  }
  hide() {
    // this.toolBarDOM.hidden = true;
  }
  forceHide(callback) {
    // this.toolBarDOM.hidden = true;
    // this.toolBarDOM.removeEventListener("blur", callback);
  }
  show() {
    // this.toolBarDOM.style.visibility = "visible";
    // console.log("on show toolbar connector");
    // this.toolBarDOM.hidden = false;
  }
  shift(pageX, pageY) {
    // this.toolBarDOM.style.left = `${pageX}px`;
    // this.toolBarDOM.style.top = `${
    //   pageY - this.toolBarDOM.getBoundingClientRect().height
    // }px`;
  }
}
