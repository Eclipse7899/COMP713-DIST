import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Network, Wait } from 'testcontainers';

const POSTGRES_ALIAS = 'postgres';
const POSTGRES_PORT = 5432;
const POSTGRES_DB = 'test';
const AUTH_DB = 'auth';
const POSTGRES_USER = 'postgres';
const POSTGRES_PASSWORD = 'postgres';
const AUTH_ALIAS = 'auth';

let dbContainer: StartedPostgreSqlContainer;
let authContainer: StartedTestContainer;

function internalDatabaseUrl(database: string): string {
  return `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_ALIAS}:${POSTGRES_PORT}/${database}`;
}

function externalDatabaseUrl(
  database: string,
  container: StartedPostgreSqlContainer,
): string {
  return `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${container.getHost()}:${container.getMappedPort(POSTGRES_PORT)}/${database}`;
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

  // Each service owns its own database, mirroring production. The auth
  // database has to be created explicitly because the container only creates
  // the default one.
  await dbContainer.exec([
    'psql',
    '-U',
    POSTGRES_USER,
    '-d',
    POSTGRES_DB,
    '-c',
    `CREATE DATABASE "${AUTH_DB}"`,
  ]);

  const initContainers = [
    { image: 'backend-db-init:latest', database: POSTGRES_DB },
    { image: 'auth-db-init:latest', database: AUTH_DB },
  ];

  for (const { image, database } of initContainers) {
    await new GenericContainer(image)
      .withEnvironment({ DATABASE_URL: internalDatabaseUrl(database) })
      .withNetwork(network)
      .withWaitStrategy(
        Wait.forLogMessage('🌱  The seed command has been executed.'),
      )
      .start();
  }

  return {
    backendDatabaseUrl: externalDatabaseUrl(POSTGRES_DB, dbContainer),
    authDatabaseUrl: externalDatabaseUrl(AUTH_DB, dbContainer),
  };
}

export async function setupTestAuth(
  databaseUrl: string,
  jwtSecret: string,
  port: number,
  network: StartedNetwork,
) {
  authContainer = await new GenericContainer('auth-service:latest')
    .withExposedPorts(port)
    .withNetworkAliases(AUTH_ALIAS)
    .withEnvironment({
      PORT: port.toString(),
      DATABASE_URL: databaseUrl,
      JWT_SECRET: jwtSecret,
    })
    .withNetwork(network)
    .start();

  return `${authContainer.getHost()}:${authContainer.getMappedPort(port)}`;
}

export async function teardownTestDatabase() {
  if (dbContainer) {
    await dbContainer.stop();
  }
}

export async function teardownTestAuth() {
  if (authContainer) {
    await authContainer.stop();
  }
}

let network: StartedNetwork;

export async function setup(jwtSecret: string, port: number) {
  network = await setupNetwork();
  const { backendDatabaseUrl, authDatabaseUrl } =
    await setupTestDatabase(network);
  const auth = await setupTestAuth(
    internalDatabaseUrl(AUTH_DB),
    jwtSecret,
    port,
    network,
  );

  return { backendDatabaseUrl, authDatabaseUrl, auth };
}

export async function teardown() {
  await teardownTestAuth();
  await teardownTestDatabase();
  await network.stop();
}
