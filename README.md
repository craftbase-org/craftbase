## Welcome

Thanks for reading this README of craftbase app.

Craftbase is online whiteboarding tool where user(s) can brainstorm using various objects such as shapes, pencil and to name a few, with themselves as well share it with other users.

Currently, the live sharing feature is internally disabled but I am working on adding feature flag for it. Once it's enabled, you can live share it with your other colleagues/peers/friends and collaborate together.

My attempt is to make it as simple to spin up a board and start whiteboarding right away. No signup/signin required.

Please expect some bugs and glitches as I am working on it (mostly on weekends). Feel free to raise GH issue whether is feature, suggestion or bug related to craftbase.

## Craftbase and its architecture

![Architecture][https://raw.githubusercontent.com/craftbase-org/craftbase/refs/heads/main/src/assets/craftbase_frontend_architecture.png]

Craftbase underneath uses [two.js](https://github.com/jonobr1/two.js) library to render scene graph which is developed by awesome [Jono brandel](https://github.com/jonobr1)

The craftbase has "Board" as it's main primary concept which holds the specific responsiblity of rendering the canvas, components and utilities. The heirarchy looks like : Board -> Canvas -> ElementRenderer -> Component Element -> Component Factory

Board represents the Canvas, primary sidebar and floating toolbar (soon to be). Canvas is where the logic of rendering the components in 2d space is present. Each component has it's factory from which the template code is generated as output and provided to "component element" which hooks with react functional component and it attaches some event listeners to specific component.

The user interaction controls such as mouse , drag , zoom and pan are part of Canvas. All these interactions are able to make the board lively as if user was whiteboarding on it.

## Run/develop locally

This craftbase repo is containing the frontend code and the other repo under same org is containing the backend code (craftbase-hasura)

You need to setup both the projects (frontend and backend) locally in order to successfully run craftbase application server in your machine.

### Backend

Head over to the readme.md of the [craftbase-hasura](https://github.com/craftbase-org/craftbase-hasura) and follow the instructions to setup backend of the craftbase locally.

### Frontend

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

So you'll need to clone the repository and run `yarn` first to install the dependencies. You can also run `npm install` depending on your choice since it will have it's own lock file for peer and core dependencies.

Then, create `.env` file in root of the project directory and copy the contents from .envexample into that.

Finally, to run the frontend server, you can run `yarn start` which will start the server on default port of 3000.

#### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

#### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.
