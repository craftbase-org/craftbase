import {
  CONSTRUCT,
  COMPLETE,
  ADD_ELEMENT,
  UNGROUP_ELEMENT,
  AREA_SELECTION,
} from "redux/types";

const initial_state = {
  app: {},
  currentStatus: null,
  componentData: [],
  elementIDs: [],
  selectedComponents: [],
  lastAddedElement: {},
};

export default (state = initial_state, action) => {
  switch (action.type) {
    case CONSTRUCT:
      const newArr = action.payload.map((item) => item.id);

      const getCoordGraph = {};
      action.payload.forEach((item) => {
        getCoordGraph[item.id] = item.data;
      });

      return {
        ...state,
        currentStatus: "construct",
        getCoordGraph,
        componentData: action.payload,
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

    case AREA_SELECTION:
      const newSelectionFrame = action.payload;
      let x1Coord = action.payload.left;
      let x2Coord = action.payload.right;
      let y1Coord = action.payload.top;
      let y2Coord = action.payload.bottom;

      const selectedComponentArr = [];
      const allComponentCoords = Object.values(state.getCoordGraph);
      console.log("allComponentCoords", allComponentCoords);
      allComponentCoords.forEach((item, index) => {
        console.log("item", item);
        if (item !== undefined) {
          if (
            item.x > x1Coord &&
            item.x < x2Coord &&
            item.y > y1Coord &&
            item.y < y2Coord
          ) {
            console.log("a match");
            let idToSelect = parseInt(Object.keys(state.getCoordGraph)[index]);
            selectedComponentArr.push(idToSelect);
          }
        }
      });
      return {
        ...state,
        componentData: [...state.componentData],
        selectedComponents: selectedComponentArr,
      };

    case ADD_ELEMENT:
      const newElementsData = [...state.componentData, action.payload];
      return {
        ...state,
        currentStatus: "complete",
        componentData: newElementsData,
        lastAddedElement: action.payload,
      };

    case UNGROUP_ELEMENT:
      const groupToBeRemoved = action.payload.data.groupId;
      const indexOfGroup = state.componentData.findIndex(
        (x) => x.id === groupToBeRemoved
      );
      console.log(
        "getIndexOf",
        indexOfGroup,
        action.payload,
        state.componentData
      );

      const extractChildrenElements = [
        ...state.componentData[indexOfGroup].children,
      ];

      state.componentData.splice(indexOfGroup, 1);
      const updatedElementsData = [
        ...state.componentData,
        ...extractChildrenElements,
      ];
      return {
        ...state,
        currentStatus: "construct",

        componentData: updatedElementsData,
        lastAddedElement: action.payload,
      };

    default:
      return state;
  }
};
