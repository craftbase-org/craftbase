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
