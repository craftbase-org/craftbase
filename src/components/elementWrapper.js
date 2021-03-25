import React from 'react'
import Loadable from 'react-loadable'

import Loader from 'components/utils/loader'

const ElementWrapper = (elementName, data) => {
    // const ElementName = element.toLowerCase();
    const ElementToRender = Loadable({
        loader: () => import(`components/elements/${elementName}`),
        loading: Loader,
    })

    class RenderElement extends React.Component {
        componentDidMount() {}
        render() {
            return data.twoJSInstance ? (
                <ElementToRender {...data} />
            ) : (
                <div>Loading ..</div>
            )
        }
    }

    return RenderElement
}

export default ElementWrapper
