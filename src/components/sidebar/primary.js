import React, { Component } from 'react';
import { connect } from 'react-redux';

import SecondarySidebar from './secondary';
import Icon from 'icons/icon';
import { addElement } from 'store/actions/main';

class Sidebar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedItem: null,
      toggleSecondaryMenu: false,
    };
  }
  handleMenuClick = (menu) => {
    console.log('Yo dawg');
    this.setState({ selectedItem: menu, toggleSecondaryMenu: true });
  };

  addElementToScene = (result) => {
    let id = Math.floor(Math.random() * 9000) + 1000;
    let newElement = { id, name: result };
    this.props.addElement('ADD_ELEMENT', newElement);
  };

  handleOnBlurSecSidebar = (result) => {
    result && this.addElementToScene(result);
    this.setState({ toggleSecondaryMenu: false, selectedItem: null });
  };

  render() {
    return (
      <div className="sidebar-container flex items-center justify-center ">
        {' '}
        <div className="flex items-center justify-center w-64 px-2 py-2 mx-4 bg-white shadow-xl">
          <div className="relative transition-shadow transition-transform transition-all">
            <button
              className={`${
                this.state.selectedItem === 'elements' ? '' : 'icon-elements'
              }  hover:bg-blues-b50 bg-transparent px-2  py-2 block`}
              onClick={() => this.handleMenuClick('elements')}
            >
              <Icon icon="SIDEBAR_ICON_ELEMENTS" />
            </button>
          </div>
          <div className="relative">
            {' '}
            <button
              className={`${
                this.state.selectedItem === 'shapes' ? '' : 'icon-shape'
              }  hover:bg-blues-b50 bg-transparent px-2  py-2 block`}
              onClick={() => this.handleMenuClick('shapes')}
            >
              <Icon icon="SIDEBAR_ICON_POLYGON" />
            </button>
          </div>
          <div className="relative">
            <button
              className={`${
                this.state.selectedItem === 'frames' ? '' : 'icon-frame'
              }  hover:bg-blues-b50 bg-transparent px-2  py-2 block`}
              onClick={this.handleMenuClick}
            >
              <Icon icon="SIDEBAR_ICON_FRAME" />
            </button>
          </div>
          <div className="relative">
            <button
              className={`${
                this.state.selectedItem === 'text' ? '' : 'icon-text'
              }  hover:bg-blues-b50 bg-transparent px-2  py-2 block`}
              onClick={this.handleMenuClick}
            >
              <Icon icon="SIDEBAR_ICON_TEXT" />
            </button>
          </div>
          <div className="relative">
            {' '}
            <button
              className={`${
                this.state.selectedItem === 'draw' ? '' : 'icon-pencil'
              }  hover:bg-blues-b50 bg-transparent px-2  py-2 block`}
              onClick={this.handleMenuClick}
            >
              <Icon icon="SIDEBAR_ICON_PENCIL" />
            </button>
          </div>
        </div>
        <div>
          {this.state.toggleSecondaryMenu && (
            <SecondarySidebar
              selectedItem={this.state.selectedItem}
              handleOnBlur={(result) => this.handleOnBlurSecSidebar(result)}
            />
          )}
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    componentData: state.main.componentData,
  };
}
export default connect(null, {
  addElement,
})(Sidebar);
