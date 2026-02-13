# Craftbase Codebase Map

## Overview

Craftbase is an online whiteboarding tool built with React that uses Two.js for 2D canvas rendering. This document maps the codebase structure to help developers quickly locate and understand different parts of the application.

## Core Architecture

**Rendering Stack**: Board → Canvas → ElementRenderer → Component Element → Component Factory

- **Board**: Main container handling canvas rendering, sidebar, and floating toolbar
- **Canvas**: 2D rendering logic and user interaction controls (mouse, drag, zoom, pan)
- **Component Elements**: React functional components with attached event listeners
- **Component Factories**: Template generators that produce component definitions

The Board component uses React Context (`BoardContext`) to pass state and methods down to child components. This is the primary state management pattern used throughout the application.

## Directory Structure

### `/src/views`

Top-level page views/routes.

- **`Board/`**: Main whiteboard page
    - `board.js` - Board component with `BoardContext` provider, GraphQL operations
    - `index.js` - Entry point with error boundary
    - `errorBoundary.js` - Error boundary wrapper

- **`Home/`**: Landing/home page

### `/src/components`

Reusable React UI components.

- **`elements/`**: Whiteboard element components (shapes, controls, UI widgets)
    - Shape components: `circle.js`, `rectangle.js`, `frame.js`
    - Arrow components: `arrowLine.js`, `divider.js`
    - Drawing: `pencil.js`
    - UI components: `button.js`, `dropdown.js`, `checkbox.js`, `radiobox.js`, `toggle.js`, `tooltip.js`
    - Text components: `text.js`, `textarea.js`, `textinput.js`
    - Other: `imageCard.js`, `avatar.js`, `groupobject.js`, `overlay.js`
    - `template.js` - Component template definitions

- **`sidebar/`**: Left sidebar UI
    - `primary.js` - Main sidebar component
    - `elementsDropdown.js` - Element selection dropdown
    - `shareLinkPopup.js` - Share functionality popup
    - `userDetailsPopup.js` - User information popup

- **`common/`**: Shared utility components
    - `button.js` - Base button component
    - `modal.js`, `modalContainer.js` - Modal system
    - `portal.js` - React portal wrapper
    - `spinner.js`, `spinnerWithSize.js` - Loading indicators

- **`utils/`**: Component-specific utility functions

- **`floatingToolbar.js`**: Floating toolbar for quick actions (every time when a user clicks component, this floating toolbar gets visible and invisible when the focus is moved away from component)

- **`ProgressiveImageLoader/`**: Progressive image loading component

### `/src/factory`

Component factory functions that generate template definitions for each element type. Each factory corresponds to a component element.

- Factories: `arrowLine.js`, `newArrowLine.js`, `avatar.js`, `button.js`, `buttonwithicon.js`, `circle.js`, `divider.js`, `dropdown.js`, `frame.js`, `imagecard.js`, `linkwithicon.js`, `overlay.js`, `pencil.js`, `rectangle.js`, `text.js`, `textarea.js`, `textinput.js`, `toggle.js`
- `main.js` - Factory registry/coordinator

### `/src/store`

Legacy Redux store files (currently unused in the project).

- **`actions/`**: Redux action creators (not in use)
- **`reducers/`**: Redux reducers (not in use)

### `/src/schema`

GraphQL schema definitions for backend communication (Hasura).

- **`queries/`**: GraphQL query definitions
- **`mutations/`**: GraphQL mutation definitions
- **`subscriptions/`**: GraphQL subscription definitions for real-time updates

### `/src/constants`

Application constants and configuration.

- `elementSchema.js` - Element schema definitions
- `properties.js` - Property configurations
- `misc.js` - Miscellaneous constants
- `exportHooks.js` - Custom hook exports

### `/src/utils`

Utility functions and helpers.

- `constants.js` - Shared constants
- `misc.js` - Miscellaneous utilities
- `updateVertices.js` - Vertex update utilities

### `/src/hooks`

Custom React hooks.

- `intersectionObserver.js` - Intersection Observer hook

### `/src/icons`

SVG icon components.

### `/src/assets`

Static assets (images, fonts, etc.).

### `/src/wireframeAssets`

Wireframe-related assets.

### `/src/styles`

Global stylesheets.

## Key Files

### Root Level (`/src`)

- **`App.js`**: Root application component with routing
- **`newCanvas.js`**: Main canvas rendering logic using Two.js
- **`routes.js`**: Application routes configuration
- **`index.js`**: Application entry point
- **`serviceWorker.js`**: PWA service worker

## Data Flow

1. **User Interaction** → Canvas event listeners (mouse, drag, zoom)
2. **Component Creation** → Factory generates template → Element renderer creates Two.js object
3. **State Updates** → React Context (BoardContext) + local component state → Component re-renders
4. **Backend Sync** → GraphQL mutations/subscriptions → Hasura backend

## React Context

The **BoardContext** (created in `src/views/Board/board.js`) provides:

- Component store state
- Selected component state
- Two.js instance
- Pencil mode state
- Toolbar visibility
- GraphQL mutation functions
- Other board-level state and handlers

Child components access this context via `useContext(BoardContext)`.

## Technology Stack

- **UI Framework**: React
- **Canvas Rendering**: Two.js
- **State Management**: React Context (BoardContext) + local component state
- **Backend**: GraphQL (Hasura)
- **GraphQL Client**: Apollo Client
- **Styling**: CSS + Tailwind CSS
- **Build Tool**: Create React App with CRACO
