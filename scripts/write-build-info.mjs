import { execSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(__dirname, '..', 'public', 'build-info.json')

function resolveSha() {
    if (process.env.COMMIT_REF) return process.env.COMMIT_REF
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
    } catch {
        return 'unknown'
    }
}

const payload = {
    sha: resolveSha(),
    builtAt: new Date().toISOString(),
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n')

console.log(`[write-build-info] wrote ${outputPath}: sha=${payload.sha}`)
