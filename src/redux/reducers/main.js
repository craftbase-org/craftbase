import { CONSTRUCT, COMPLETE, ADD_ELEMENT } from "redux/types";

const initial_state = {
  app: {},
  currentStatus: null,
  elementData: [],
  elementIDs: [],
  lastAddedElement: {},
};

export default (state = initial_state, action) => {
  switch (action.type) {
    case CONSTRUCT:
      const newArr = action.payload.map((item) => item.id);

      return {
        ...state,
        currentStatus: "construct",
        elementData: action.payload,
        elementIDs: [...state.elementIDs, ...newArr],
      };

    case COMPLETE:
      const newItems = [...state.elementIDs];
      const elementId = action.payload.data.id;
      newItems.push(elementId);
      return {
        ...state,
        currentStatus: "complete",
        elementIDs: newItems,
        lastAddedElement: {},
      };

    case ADD_ELEMENT:
      const newElementsData = [...state.elementData, action.payload];
      return {
        ...state,
        currentStatus: "complete",
        elementData: newElementsData,
        lastAddedElement: action.payload,
      };

    default:
      return state;
  }
};
