import * as grpc from '@grpc/grpc-js';
import { AuthService } from './services/service.ts';
import { createAuthHandlers } from './handlers/handler.ts';
import UserRepo from '@stocked/shared/src/repositories/users.repo.ts';
import { createDb } from '@stocked/shared/src/db.ts';
import {
  AuthServiceService,
} from '@stocked/shared/src/generated/proto/auth.ts';

function main() {
  const server = new grpc.Server();
  const port = '5051';

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const db = createDb(databaseUrl);
  const userRepo = new UserRepo(db);
  const repo = new AuthService(jwtSecret, userRepo);
  const authHandlers = createAuthHandlers(repo);

  server.addService(AuthServiceService, authHandlers);
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error(`Server failed to bind: ${err.message}`);
      return;
    }
    console.log(`Server running on port ${port}`);
  });
}

main();