#!/usr/bin/env node
/**
 * Run Supabase SQL migrations locally or against remote via psql.
 * Required env (choose one):
 *  - DATABASE_URL
 *  - SUPABASE_URL + SUPABASE_DB_PASSWORD
 * Files execute in lexical order based on migration filename.
 */
import { config as loadEnv } from 'dotenv'
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load env from supabase/.env (primary) then project .env (fallback)
loadEnv({ path: join(__dirname, '..', 'supabase', '.env') })
loadEnv({ path: join(__dirname, '..', '.env') })

let connectionString = process.env.DATABASE_URL
let pgPassword = null

if (!connectionString) {
  const url = process.env.SUPABASE_URL
  const password = process.env.SUPABASE_DB_PASSWORD
  if (!url || !password) {
    console.error('❌ Set DATABASE_URL or SUPABASE_URL + SUPABASE_DB_PASSWORD in .env')
    process.exit(1)
  }
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/)
  const projectRef = match ? match[1] : null
  if (!projectRef) {
    console.error('❌ Invalid SUPABASE_URL format')
    process.exit(1)
  }
  pgPassword = password
  connectionString = `postgresql://postgres@db.${projectRef}.supabase.co:5432/postgres`
}

const migrationsDir = join(__dirname, '..', 'supabase', 'migrations')
const files = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()

if (files.length === 0) {
  console.error(`❌ No SQL migrations found in ${migrationsDir}`)
  process.exit(1)
}

console.log('Running migrations...\n')
const env = { ...process.env }
if (pgPassword) env.PGPASSWORD = pgPassword

for (const file of files) {
  const result = spawnSync('psql', [connectionString, '-v', 'ON_ERROR_STOP=1', '-f', join(migrationsDir, file)], {
    stdio: 'inherit',
    env,
  })
  if (result.status !== 0) {
    console.error(`\n❌ Migration failed: ${file}`)
    process.exit(1)
  }
  console.log('✅', file)
}

console.log('\n✅ Migrations complete.')
