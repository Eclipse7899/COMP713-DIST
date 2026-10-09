import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Network, Wait } from 'testcontainers';

const POSTGRES_ALIAS = 'postgres';
const POSTGRES_PORT = 5432;
const POSTGRES_DB = 'test';
const POSTGRES_USER = 'postgres';
const POSTGRES_PASSWORD = 'postgres';
const AUTH_ALIAS = 'auth';

let dbContainer: StartedPostgreSqlContainer;
let authContainer: StartedTestContainer;

function internalDatabaseUrl(): string {
  return `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_ALIAS}:${POSTGRES_PORT}/${POSTGRES_DB}`;
}

export async function setupNetwork() {
  return await new Network().start();
}

export async function setupTestDatabase(network: StartedNetwork) {
  dbContainer = await new PostgreSqlContainer('postgres:17')
    .withDatabase(POSTGRES_DB)
    .withUsername(POSTGRES_USER)
    .withPassword(POSTGRES_PASSWORD)
    .withNetworkAliases(POSTGRES_ALIAS)
    .withNetwork(network)
    .start();

  const init = new GenericContainer('db-init:latest');
  await init
    .withEnvironment({ DATABASE_URL: internalDatabaseUrl() })
    .withNetwork(network)
    .withWaitStrategy(Wait.forLogMessage('🌱  The seed command has been executed.'))
    .start();

  return `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${dbContainer.getHost()}:${dbContainer.getMappedPort(POSTGRES_PORT)}/${POSTGRES_DB}`;
}

export async function setupTestAuth(
  _database: string,
  jwtSecret: string,
  port: number,
  network: StartedNetwork,
) {
  authContainer = await new GenericContainer('auth-service:latest')
    .withExposedPorts(port)
    .withNetworkAliases(AUTH_ALIAS)
    .withEnvironment({
      PORT: port.toString(),
      DATABASE_URL: internalDatabaseUrl(),
      JWT_SECRET: jwtSecret,
    })
    .withNetwork(network)
    .start();

  return `${authContainer.getHost()}:${authContainer.getMappedPort(port)}`;
}

export async function teardownTestDatabase() {
  await dbContainer.stop();
}

export async function teardownTestAuth() {
  await authContainer.stop();
}

let network: StartedNetwork;

export async function setup(jwtSecret: string, port: number) {
  network = await setupNetwork();
  const postgres = await setupTestDatabase(network);
  const auth = await setupTestAuth(postgres, jwtSecret, port, network);

  return { postgres, auth };
}

export async function teardown() {
  await teardownTestAuth();
  await teardownTestDatabase();
  await network.stop();
}
