// Ambient declarations for non-code assets and module shapes that aren't
// covered by their own packages.

/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
    readonly VITE_GRAPHQL_ENDPOINT: string
    readonly VITE_WS_GRAPHQL_ENDPOINT: string
    readonly VITE_HASURA_ADMIN_SECRET: string
    readonly VITE_SENTRY_DSN?: string
    readonly VITE_GRAPHQL_ERROR_POLICY?: string
    readonly MODE: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

// `idx` ships without types in some versions. Minimal shim so callers don't
// see implicit-any errors during migration; we can sharpen this later.
declare module 'idx' {
    function idx<T, R>(input: T, accessor: (input: T) => R): R | null | undefined
    export default idx
}
