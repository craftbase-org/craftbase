import { gql } from '@apollo/client'

export const GET_BOARD_DATA = gql`
    query GET_BOARD_DATA($id: uuid = "") {
        boardData: boards_board_by_pk(id: $id) {
            components
            id
            name
        }
    }
`

export const GET_COMPONENT_INFO = gql`
    subscription GET_COMPONENT_INFO($id: uuid = "") {
        component: components_component_by_pk(id: $id) {
            metadata
            x
            y
            componentType
        }
    }
`
