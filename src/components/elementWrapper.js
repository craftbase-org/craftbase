import React, { useEffect } from 'react'
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

    const RenderElement = ({ ElementToRender, data }) => {
        console.log('in render Element', data)
        const {
            loading: getComponentInfoLoading,
            data: getComponentInfoData,
            error: getComponentInfoError,
        } = useSubscription(GET_COMPONENT_INFO, { variables: { id: data.id } })

        if (getComponentInfoLoading) {
            return <Spinner displayText={'Loading component data'} />
        }

        console.log('getComponentInfoData data change', getComponentInfoData)
        return data.twoJSInstance ? (
            getComponentInfoData?.component ? (
                <ElementToRender
                    {...data}
                    {...getComponentInfoData.component}
                />
            ) : null
        ) : (
            <Spinner />
        )
    }

    return RenderElement
}

export default ElementWrapper
