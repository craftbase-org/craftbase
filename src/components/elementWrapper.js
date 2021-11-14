import React from 'react'
import Loadable from 'react-loadable'
import { useSubscription } from '@apollo/client'

import Spinner from './common/spinner'
import { GET_COMPONENT_INFO } from 'schema/subscriptions'
import Loader from 'components/utils/loader'

const ElementWrapper = (elementName, data) => {
    // const ElementName = element.toLowerCase();
    const ElementToRender = Loadable({
        loader: () => import(`components/elements/${elementName}`),
        loading: Loader,
    })

    const RenderElement = () => {
        console.log('in render Element', data)
        const {
            loading: getComponentInfoLoading,
            data: getComponentInfoData,
            error: getComponentInfoError,
        } = useSubscription(GET_COMPONENT_INFO, { variables: { id: data.id } })

        if (getComponentInfoLoading) {
            return <Spinner />
        }

        console.log('getComponentInfoData data change', getComponentInfoData)
        return data.twoJSInstance ? (
            <ElementToRender {...data} {...getComponentInfoData.component} />
        ) : (
            <Spinner />
        )
    }

    return RenderElement
}

export default ElementWrapper
