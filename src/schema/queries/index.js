import { gql } from '@apollo/client'

export const GET_USER_DETAILS = gql`
    query MyQuery($id: uuid = "") {
        users: users_user(where: { id: { _eq: $id } }) {
            firstName
            id
        }
    }
`

export const GET_COMPONENT_TYPES = gql`
    query getComponentTypes {
        componentTypes: components_componentType {
            label
            defaultMetaData
            logo
            width
            height
            fill
            textColor
        }
    }
`
