import { UserService } from '../services/user.service';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import type { Variables } from '../variables';
import {
  messageSchema,
  unauthorizedResponse,
  userSchema,
} from '../schemas';

export function createUsersRoute(userService: UserService) {
  return new Hono<{ Variables: Variables }>().get(
    '/me',
    describeRoute({
      tags: ['Users'],
      summary: 'Get the authenticated user',
      description:
        'Returns the profile of the user identified by the JWT supplied in the Authorization header.',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'The authenticated user profile',
          content: { 'application/json': { schema: resolver(userSchema) } },
        },
        401: unauthorizedResponse,
        404: {
          description: 'The user referenced by the token no longer exists',
          content: { 'application/json': { schema: resolver(messageSchema) } },
        },
      },
    }),
    async (c) => {
      const userId = c.get('jwtPayload').sub;
      const user = await userService.getCurrentUser(userId);
      if (!user || !user.success) {
        return c.json({ message: 'User not found' }, 404);
      }
      return c.json(user.data);
    },
  );
}
