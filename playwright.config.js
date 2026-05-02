import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    retries: 0,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:5173',
        screenshot: 'only-on-failure',
        video: 'off',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
})
