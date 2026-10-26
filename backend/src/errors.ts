import { status as grpcStatus } from "@grpc/grpc-js";

/**
 * Prisma errors that mean the database cannot be reached or stopped responding,
 * as opposed to errors caused by the request itself (validation, constraints).
 */
const DATABASE_UNAVAILABLE_CODES = new Set([
  "P1000", // Authentication failed
  "P1001", // Can't reach database server
  "P1002", // Database server timed out
  "P1003", // Database does not exist
  "P1008", // Operations timed out
  "P1010", // Access to the database was denied
  "P1011", // Error opening a TLS connection
  "P1017", // Server closed the connection
  "P2024", // Timed out fetching a connection from the pool
  "P2037", // Too many database connections
]);

const NETWORK_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);

const AUTH_SERVICE_UNAVAILABLE_CODES = new Set<number>([
  grpcStatus.UNAVAILABLE,
  grpcStatus.DEADLINE_EXCEEDED,
]);

export function isServiceUnavailable(
  error: unknown,
  seen = new Set<unknown>(),
): boolean {
  if (typeof error !== "object" || error === null || seen.has(error)) {
    return false;
  }
  seen.add(error);

  const candidate = error as {
    cause?: unknown;
    code?: unknown;
    name?: unknown;
  };

  if (candidate.name === "PrismaClientInitializationError") {
    return true;
  }

  if (typeof candidate.code === "string") {
    if (
      DATABASE_UNAVAILABLE_CODES.has(candidate.code) ||
      NETWORK_ERROR_CODES.has(candidate.code)
    ) {
      return true;
    }
  } else if (
    typeof candidate.code === "number" &&
    AUTH_SERVICE_UNAVAILABLE_CODES.has(candidate.code)
  ) {
    return true;
  }

  return isServiceUnavailable(candidate.cause, seen);
}
