# Vite Migration

This documents the completed migration from Create React App (CRA) 5 + CRACO to Vite 5.
Done in March 2026.

## Why

`react-scripts` was effectively unmaintained and carried ~200 transitive npm vulnerabilities.
CRACO (which wraps react-scripts) had no active customisations — all plugins were commented out.
Migrating eliminated the entire CRA/CRACO dependency tree.

---

## Package changes

### Removed

| Package                                             | Reason                                     |
| --------------------------------------------------- | ------------------------------------------ |
| `react-scripts`                                     | Replaced by Vite                           |
| `@craco/craco`                                      | No longer needed                           |
| `craco-less`                                        | Was already commented out, never used      |
| `@babel/plugin-proposal-private-property-in-object` | CRA-era Babel plugin, not needed with Vite |

### Added (devDependencies)

| Package                | Version    | Purpose                                                                      |
| ---------------------- | ---------- | ---------------------------------------------------------------------------- |
| `vite`                 | `^5.4.0`   | Build tool                                                                   |
| `@vitejs/plugin-react` | `^4.3.1`   | React/JSX support in Vite                                                    |
| `vite-tsconfig-paths`  | `^6.1.1`   | Reads `jsconfig.json` `baseUrl` to resolve bare imports like `'views/Board'` |
| `vitest`               | `^2.0.0`   | Vite-native test runner (replaces Jest via react-scripts)                    |
| `jsdom`                | `^25.0.0`  | DOM environment for Vitest                                                   |
| `autoprefixer`         | `^10.4.27` | PostCSS plugin for CSS vendor prefixes (was included implicitly by CRA)      |

### Scripts updated

```json
"start":   "vite",
"build":   "vite build",
"preview": "vite preview",
"test":    "vitest"
```

The `eject` script was removed — it was CRA-specific and meaningless without `react-scripts`.

### Resolutions cleaned up

Removed the `react-scripts/**/react-error-overlay` resolution since `react-scripts` is gone.
The `micromatch` and `form-data` resolutions were kept as they still apply to other deps.

### ESLint

Changed from `"extends": "react-app"` (depends on react-scripts) to `"extends": "react-app/base"`.

---

## Files deleted

- `craco.config.js` — was effectively empty (all plugin config commented out)

---

## Files created

### `vite.config.mjs`

Named `.mjs` (not `.js`) because `vite-tsconfig-paths` v6 is ESM-only and can't be
loaded when the config is treated as CommonJS. Using `.mjs` forces Node to treat it as
an ES module, avoiding the conflict.

**Why the custom `treat-js-files-as-jsx` plugin?**

The project uses `.js` file extensions for files that contain JSX (e.g. `src/index.js`,
`src/App.js`, all component files). Vite's Rollup-based build pipeline parses JS with
Rollup's internal parser before any transform runs, and Rollup can't parse JSX syntax.
The custom plugin pre-transforms all `src/**/*.js` files through esbuild with
`loader: 'jsx'` before the import analysis step, unblocking the rest of the build.

The `optimizeDeps.esbuildOptions.loader` handles the same issue for the dev server's
dependency pre-bundling phase.

**Why `vite-tsconfig-paths`?**

`jsconfig.json` has `baseUrl: "src"`, which means CRA resolved bare imports like
`import Foo from 'views/Board'` relative to `src/`. Vite doesn't do this automatically.
`vite-tsconfig-paths` reads `jsconfig.json` and wires up the same resolution, so all
existing bare imports continue to work without changes.

### `postcss.config.js`

CRA handled PostCSS implicitly. Vite requires an explicit config.
Note: uses `module.exports` (CommonJS), not `export default`, because this file is
loaded by PostCSS via Node's `require()` and the project does not have `"type": "module"`.

```js
module.exports = {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
    },
}
```

### `index.html` (project root)

Vite requires the HTML entry point at the project root, not inside `public/`.
Copied from `public/index.html` with two changes:

1. All `%PUBLIC_URL%` placeholders replaced with `/` (e.g. `href="%PUBLIC_URL%/favicon.svg"` → `href="/favicon.svg"`).
   CRA substituted this at build time; Vite serves the `public/` folder from `/` directly.

2. Added an explicit module script tag before `</body>` — CRA injected this automatically,
   Vite requires it to be declared in the HTML:
    ```html
    <script type="module" src="/src/index.js"></script>
    ```

The original `public/index.html` was left in place (Vite ignores it, but it does no harm).

---

## Source file changes

### `src/index.js` — React 18 createRoot

CRA had been using the React 17 `ReactDOM.render()` API despite the project being on
React 18. Migrated to the React 18 `createRoot` API:

```js
// Before
import ReactDOM from 'react-dom'
ReactDOM.render(<App />, document.getElementById('root'))

// After
import ReactDOM from 'react-dom/client'
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
```

### Environment variables — renamed and re-accessed

Vite exposes env vars via `import.meta.env.VITE_*` instead of `process.env.REACT_APP_*`.
All four env vars were renamed in `.env`:

| Old name                         | New name                    |
| -------------------------------- | --------------------------- |
| `REACT_APP_HASURA_ADMIN_SECRET`  | `VITE_HASURA_ADMIN_SECRET`  |
| `REACT_APP_WS_GRAPHQL_ENDPOINT`  | `VITE_WS_GRAPHQL_ENDPOINT`  |
| `REACT_APP_GRAPHQL_ENDPOINT`     | `VITE_GRAPHQL_ENDPOINT`     |
| `REACT_APP_GRAPHQL_ERROR_POLICY` | `VITE_GRAPHQL_ERROR_POLICY` |

Access pattern changed in all files from `process.env.REACT_APP_*` → `import.meta.env.VITE_*`.

Files updated:

| File                       | What changed                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/App.js`               | 4 references — GraphQL HTTP endpoint, WS endpoint, admin secret (×2)                                   |
| `src/views/Board/board.js` | 2 references — `errorPolicy` option on GraphQL mutations                                               |
| `src/serviceWorker.js`     | `process.env.NODE_ENV` → `import.meta.env.MODE`, `process.env.PUBLIC_URL` → `import.meta.env.BASE_URL` |

### `.gitignore`

Changed build output directory from `/build` (CRA default) to `/dist` (Vite default).

---

## Caveat: fully dynamic imports break in production

Vite's bundler (Rollup) must be able to statically analyze dynamic `import()` calls at
build time to emit the imported files as chunks. If the entire path is a runtime variable,
Vite has nothing to analyze and silently skips bundling those files.

**What breaks:**

```js
// BAD — Vite cannot determine which files to bundle
import(`./components/elements/${item.componentType}`)
import(`../../factory/${item.componentType}`)
```

In production the import resolves to a missing file. The server (e.g. Netlify) returns
its 404 HTML page, which fails the browser's strict MIME type check for ES modules:

```
Failed to load module script: Expected a JavaScript-or-Wasm module script but the
server responded with a MIME type of "text/html".
```

Note: this is invisible in dev — Vite's dev server resolves imports at request time and
doesn't need to pre-bundle them, so the bug only surfaces after a production build.

**The fix — use `import.meta.glob`:**

`import.meta.glob` is a Vite-specific API that takes a static glob pattern and registers
all matching files as lazy chunks at build time. You then call the returned function to
load the module dynamically at runtime.

```js
// At module top level — Vite analyzes this statically
const elementModules = import.meta.glob('./components/elements/*.js')
const factoryModules = import.meta.glob('../../factory/*.js')

// At runtime — same lazy-loading behaviour as before
const ElementToRender = React.lazy(() =>
    elementModules[`./components/elements/${item.componentType}.js`]()
)

factoryModules[`../../factory/${item.componentType}.js`]().then((component) => { ... })
```

The glob pattern must be a string literal — it cannot itself be dynamic.
The key used for lookup must include the `.js` extension.

**Files changed:** `src/newCanvas.js`, `src/components/elements/groupobject.js`

---

## Verifying the build

```bash
yarn start    # dev server at http://localhost:5173
yarn build    # production build to /dist
yarn test     # vitest
```
