import React, { Component } from 'react'
import { Routes, Route, BrowserRouter } from 'react-router-dom'

import {
    ApolloClient,
    ApolloProvider,
    InMemoryCache,
    HttpLink,
    split,
} from '@apollo/client'
import { getMainDefinition } from '@apollo/client/utilities'
import { WebSocketLink } from '@apollo/client/link/ws'

import BoardViewContainer from 'views/Board'
import HomePageViewContainer from 'views/Home'

import routes from './routes'

import './App.css'

import './common.css'

function getApolloClient() {
    const accessToken = localStorage.getItem('access_token')
    // console.log('access_token in client', accessToken)
    // const httpLink = new HttpLink({
    //     uri: process.env.REACT_APP_GRAPHQL_ENDPOINT,
    //     headers: {
    //         authorization: `Bearer ${accessToken}`,
    //         'content-type': 'application/json',
    //     },
    // })
    const httpLink = new HttpLink({
        uri: process.env.REACT_APP_GRAPHQL_ENDPOINT,
        headers: {
            // authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
            'x-hasura-admin-secret': process.env.REACT_APP_HASURA_ADMIN_SECRET,
        },
    })

    const wsLink = new WebSocketLink({
        uri: process.env.REACT_APP_WS_GRAPHQL_ENDPOINT,

        options: {
            reconnect: true,
            connectionParams: {
                headers: {
                    // authorization: `Bearer ${accessToken}`,
                    'content-type': 'application/json',
                    'x-hasura-admin-secret':
                        process.env.REACT_APP_HASURA_ADMIN_SECRET,
                },
            },
        },
    })

    // The split function takes three parameters:
    //
    // * A function that's called for each operation to execute
    // * The Link to use for an operation if the function returns a "truthy" value
    // * The Link to use for an operation if the function returns a "falsy" value
    const splitLink = split(
        ({ query }) => {
            const definition = getMainDefinition(query)
            return (
                definition.kind === 'OperationDefinition' &&
                definition.operation === 'subscription'
            )
        },
        wsLink,
        httpLink
    )

    const client = new ApolloClient({
        link: splitLink,
        cache: new InMemoryCache(),
    })
    return client
}

class App extends Component {
    constructor(props) {
        super(props)
    }

    render() {
        const apolloClient = getApolloClient()
        return (
            <BrowserRouter>
                <ApolloProvider client={apolloClient}>
                    <div className="App ">
                        <Routes>
                            <Route
                                path={routes.home}
                                element={<HomePageViewContainer />}
                            />
                            <Route
                                path={routes.board}
                                element={<BoardViewContainer />}
                            />
                        </Routes>
                    </div>
                </ApolloProvider>
            </BrowserRouter>
        )
    }
}

export default App
