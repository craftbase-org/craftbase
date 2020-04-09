import React from "react";
import Loadable from "react-loadable";
import Loader from "components/utils/loader";

const ElementWrapper = (element, data) => {
  const ElementName = element.toLowerCase();
  const ElementToRender = Loadable({
    loader: () => import(`components/elements/${ElementName}`),
    loading: Loader,
  });

  class RenderElement extends React.Component {
    componentDidMount() {}
    render() {
      return <ElementToRender {...data} />;
    }
  }

  return RenderElement;
};

export default ElementWrapper;
