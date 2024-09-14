import { gql } from '@apollo/client'

export const GET_USER_DETAILS = gql`
    subscription MyQuery($id: uuid = "") {
        users: users_user(where: { id: { _eq: $id } }) {
            firstName
            id
        }
    }
`

export const GET_BOARD_DATA_SUBSCRIPTION = gql`
    subscription getBoardComponents($boardId: String! = "") {
        components: components_component(
            where: { boardId: { _eq: $boardId } }
        ) {
            id
            componentType
        }
    }
`

export const GET_BOARD_DATA_QUERY = gql`
    query getBoardComponents($boardId: String! = "") {
        components: components_component(
            where: { boardId: { _eq: $boardId } }
        ) {
            id
            componentType
        }
    }
`

export const GET_COMPONENT_INFO_SUBSCRIPTION = gql`
    subscription getComponentInfoSubscription($id: uuid = "") {
        component: components_component_by_pk(id: $id) {
            metadata
            width
            height
            fill
            id
            stroke
            linewidth
            x
            y
            x1
            y1
            x2
            y2
            componentType
            children
            updatedBy
            iconStroke
            textColor
        }
    }
`
export const GET_COMPONENT_INFO_QUERY = gql`
    query getComponentInfoSubscription($id: uuid = "") {
        component: components_component_by_pk(id: $id) {
            metadata
            width
            height
            fill
            id
            stroke
            linewidth
            x
            y
            x1
            y1
            x2
            y2
            componentType
            children
            updatedBy
            iconStroke
            textColor
        }
    }
`

export const GET_COMPONENTS_FOR_BOARD_SUBSCRIPTION = gql`
    subscription getComponentsForBoard($boardId: String = "") {
        components: components_component(
            where: { boardId: { _eq: $boardId } }
        ) {
            id
            componentType
            children
            metadata
            x
            x1
            x2
            y
            y1
            y2
            fill
            width
            height
            iconStroke
            stroke
            linewidth
        }
    }
`

export const GET_COMPONENTS_FOR_BOARD_QUERY = gql`
    query getComponentsForBoard($boardId: String = "") {
        components: components_component(
            where: { boardId: { _eq: $boardId } }
        ) {
            id
            componentType
            children
            metadata
            x
            x1
            x2
            y
            y1
            y2
            fill
            width
            height
            iconStroke
            stroke
            linewidth
        }
    }
`
