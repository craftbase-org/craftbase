import { gql } from '@apollo/client'

export const UPDATE_COMPONENT_INFO = gql`
    mutation UPDATE_COMPONENT_INFO(
        $id: uuid = ""
        $updateObj: components_component_set_input = {}
    ) {
        update_components_component_by_pk(
            pk_columns: { id: $id }
            _set: $updateObj
        ) {
            id
        }
    }
`

export const INSERT_COMPONENT = gql`
    mutation insertComponent($object: components_component_insert_input = {}) {
        component: insert_components_component_one(object: $object) {
            id
            componentType
        }
    }
`

export const UPDATE_BOARD_COMPONENTS = gql`
    mutation updateBoardComponents($id: uuid = "", $components: jsonb = "") {
        update_boards_board_by_pk(
            pk_columns: { id: $id }
            _set: { components: $components }
        ) {
            id
        }
    }
`

export const DELETE_COMPONENT_BY_ID = gql`
    mutation deleteComponentById($id: uuid = "") {
        delete_components_component_by_pk(id: $id) {
            boardId
        }
    }
`

export const INSERT_BULK_COMPONENTS = gql`
    mutation MyMutation($objects: [components_component_insert_input!]! = {}) {
        insert_components_component(objects: $objects) {
            affected_rows
            returning {
                boardId
                componentType
                id
            }
        }
    }
`

export const INSERT_USER_ONE = gql`
    mutation insertUser($object: users_user_insert_input! = {}) {
        user: insert_users_user_one(object: $object) {
            id
            firstName
        }
    }
`

export const CREATE_BOARD = gql`
    mutation createBoard($object: boards_board_insert_input! = {}) {
        board: insert_boards_board_one(object: $object) {
            id
            createdBy
        }
    }
`

export const DELETE_BULK_COMPONENTS = gql`
    mutation deleteComponents($_in: [uuid!]! = "") {
        deleteComponents: delete_components_component(
            where: { id: { _in: $_in } }
        ) {
            affected_rows
        }
    }
`
