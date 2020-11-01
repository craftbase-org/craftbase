import React, { Component } from 'react';
import './App.scss';
import Dashboard from './Dashboard';

import reducers from 'store/reducers';
import logger from 'redux-logger';
import reduxThunk from 'redux-thunk';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';

import './styles/main.css';

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
        <div className="App bg-neutrals-n20">
          <Dashboard />
        </div>
      </Provider>
    );
  }
}

export default App;
