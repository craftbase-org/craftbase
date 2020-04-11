import React, { Component } from "react";
import "./App.css";
import Canvas from "./Canvas";

import reducers from "redux/reducers";
import logger from "redux-logger";
import reduxThunk from "redux-thunk";
import { Provider } from "react-redux";
import { createStore, applyMiddleware } from "redux";
import { ReactReduxContext } from "utils/misc";

const createStoreWithMiddleware = applyMiddleware(
  reduxThunk,
  logger
)(createStore);

const store = createStoreWithMiddleware(
  reducers,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);

class App extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <Provider store={store}>
        <div className="App">
          <Canvas />
        </div>
      </Provider>
    );
  }
}

export default App;
