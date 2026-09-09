import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { execSync } from 'node:child_process'

let container: Awaited<ReturnType<PostgreSqlContainer['start']>>

export async function setupTestDatabase() {
  container = await new PostgreSqlContainer('postgres:17')
    .withDatabase('test')
    .withUsername('postgres')
    .withPassword('postgres')
    .start()

  const databaseUrl = container.getConnectionUri()

  process.env.DATABASE_URL = databaseUrl

  execSync('npx prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: 'inherit',
  })

  return databaseUrl
}

export async function teardownTestDatabase() {
  await container.stop()
}