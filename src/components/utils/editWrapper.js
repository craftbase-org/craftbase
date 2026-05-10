import ObjectSelector from "./objectSelector";
import ToolBar from "./toolbarConnector";

const getEditComponents = (two, group, constant1) => {
  const selector = new ObjectSelector(two, group, 0, 0, 0, 0, constant1);
  selector.create();

  const toolbar = new ToolBar();
  toolbar.create();

  return { selector, toolbar };
};

export default getEditComponents;
