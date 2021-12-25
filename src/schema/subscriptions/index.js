import { gql } from '@apollo/client'

export const GET_BOARD_DATA = gql`
    subscription GET_BOARD_DATA($id: uuid = "") {
        boardData: boards_board_by_pk(id: $id) {
            components
            id
            name
        }
    }
`

export const GET_COMPONENT_INFO = gql`
    subscription getComponentInfoSubscription($id: uuid = "") {
        component: components_component_by_pk(id: $id) {
            metadata
            x
            y
            x1
            y1
            x2
            y2
            componentType
        }
    }
`

export const GET_COMPONENT_INFO_QUERY = gql`
    query getComponentInfoQuery($id: uuid = "") {
        component: components_component_by_pk(id: $id) {
            metadata
            x
            y
            x1
            y1
            x2
            y2
            componentType
        }
    }
`
