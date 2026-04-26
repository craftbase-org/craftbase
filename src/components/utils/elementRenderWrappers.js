import React, { useEffect, useState } from 'react'
import Spinner from 'components/common/spinner'

export const ElementRenderWrapper = (
    ElementToRender,
    data,
    deleteComponentFromLocalStore,
    componentStore
) => {
    const RenderElement = () => {
        const [twoJSShape, setTwoJSShape] = useState(null)
        const [componentData, setComponentData] = useState(null)

        useEffect(() => {
            let allComponents = Object.values(componentStore)
            if (allComponents.length > 0) {
                let componentData = allComponents.find(
                    (item) => data.id === item.id
                )
                componentData && setComponentData(componentData)
            }
        }, [componentStore])

        if (componentData === null) {
            return <></>
        }

        const handleDeleteComponent = () => {
            deleteComponentFromLocalStore(data.id)
        }

        return data.twoJSInstance ? (
            componentData !== null ? (
                <ElementToRender
                    handleDeleteComponent={handleDeleteComponent}
                    {...data}
                    {...componentData}
                />
            ) : null
        ) : (
            <Spinner />
        )
    }
    return RenderElement
}

export const GroupRenderWrapper = (ElementToRender, data) => {
    const RenderGroup = () => {
        return data.twoJSInstance ? <ElementToRender {...data} /> : <Spinner />
    }
    return RenderGroup
}
