import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { AuthService } from './auth.service';
import { jwtPlugin } from '../../jwt';

const authService = new AuthService(db)

export const authController = new Elysia({ prefix: '/auth' })
  .decorate('authService', authService)
  .use(jwtPlugin)
  .model({
    loginModel: t.Object({
      email: t.String(),
      password: t.String()
    })
  })
  .post(
    '/body',
    async ({ body, status, authService, jwt }) => {
      const result = await authService.validateUser(body.email, body.password)
      if (!result.success) {
        return status(401, {
          message: 'Invalid credentials'
        })
      }
      const token = await jwt.sign({ sub: result.data.id, email: result.data.email })
      return {
        accessToken: token,
        user: result.data,
      }
    }, {
      body: 'loginModel',
      response: {
        200: t.Object({
          accessToken: t.String(),
          user: t.Object({
            id: t.String(),
            email: t.String(),
            username: t.String()
          })
        }),
        401: t.Object({
          message: t.String()
        })
      }
    })
  .post(
    '/register',
    async ({ body, status, authService }) => {
      const { email, password, username } = body
      const user = await authService.registerUser(email, password, username)
      if (!user) {
        return status(400, {
          message: 'User registration failed'
        })
      }
      return {
        user,
      }
    }, {
      body: t.Object({
        email: t.String(),
        password: t.String(),
        username: t.String()
      }),
      response: {
        200: t.Object({
          user: t.Object({
            id: t.String(),
            email: t.String(),
            username: t.String()
          })
        }),
        400: t.Object({
          message: t.String()
        })
      }
    }
  )