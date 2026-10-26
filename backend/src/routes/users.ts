import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import type { Variables } from '../variables';
import { messageSchema, unauthorizedResponse, userDtoSchema } from '../schemas';
import type { AuthService } from '../services/auth.service';

export function createUsersRoute(authService: AuthService) {
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
          content: { 'application/json': { schema: resolver(userDtoSchema) } },
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
      const user = await authService.getUser(userId);
      if (!user || !user.success) {
        return c.json({ message: 'User not found' }, 404);
      }
      return c.json(user.data);
    },
  );
}
