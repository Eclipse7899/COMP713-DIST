import { Elysia } from "elysia";
import { node } from "@elysiajs/node";
import { authController } from './modules/auth';
import { userController } from './modules/user';
import { config } from './config';

new Elysia({ adapter: node() })
  .guard(
    {
      beforeHandle({ headers, status }) {
        if (!headers['Authorization']) {
          return status(401, {
            message: 'Missing Authorization header'
          })
        }
      }
    },
    (app) => app
      .use(authController)
      .use(userController)
  )
  .listen({ port: config.port });

console.log(`Listening on http://localhost:${config.port}`);
