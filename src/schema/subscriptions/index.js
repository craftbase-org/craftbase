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
