import React, { Component } from 'react'
import { Switch, Route, BrowserRouter } from 'react-router-dom'

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
import reducers from 'store/reducers'
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
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
        },
    })

    const wsLink = new WebSocketLink({
        uri: process.env.REACT_APP_WS_GRAPHQL_ENDPOINT,

        options: {
            reconnect: true,
            connectionParams: {
                headers: {
                    authorization: `Bearer ${accessToken}`,
                    'content-type': 'application/json',
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
                        <Switch>
                            <Route
                                exact
                                path={routes.home}
                                component={HomePageViewContainer}
                            />
                            <Route
                                exact
                                path={routes.board}
                                component={BoardViewContainer}
                            />
                        </Switch>
                    </div>
                </ApolloProvider>
            </BrowserRouter>
        )
    }
}

export default App
