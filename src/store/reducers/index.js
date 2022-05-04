import { combineReducers } from 'redux';

import main from 'store/reducers/main';

const appReducer = combineReducers({
  main,
});

const rootReducer = (state, action) => {
  console.log('action.type in root reducer', action.type);
  if (action.type === 'LOGOUT') {
    state = undefined;
  }
  return appReducer(state, action);
};

export default rootReducer;
