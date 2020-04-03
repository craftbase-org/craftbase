import { CONSTRUCT, COMPLETE } from "redux/types";

const initial_state = {
  app: {},
  currentStatus: null,
  elementName: "",
  elementData: {}
};

export default (state = initial_state, action) => {
  switch (action.type) {
    case CONSTRUCT:
      return {
        ...state,
        currentStatus: "construct",
        elementName: action.payload.name
      };

    case COMPLETE:
      return {
        ...state,
        currentStatus: "complete",
        elementName: action.payload.name,
        elementData: action.payload.data
      };

    default:
      return state;
  }
};
