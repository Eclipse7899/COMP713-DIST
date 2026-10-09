import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PrismaClient } from '@prisma/client/extension';
import { generateSpecs } from 'hono-openapi';

import { createApp } from '../src/app';

const outputPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../openapi.json',
);

const { app } = createApp('a'.repeat(32), '127.0.0.1:5051', {} as PrismaClient);

async function main() {
  const specs = await generateSpecs(app, {
    documentation: {
      info: {
        title: 'Stocked API',
        version: '1.0.0',
        description:
          'REST API for managing a personal food inventory: authentication, foods, and food items.',
      },
      tags: [
        { name: 'Health', description: 'Service health checks' },
        { name: 'Auth', description: 'Registration and login' },
        { name: 'Users', description: 'Authenticated user profile' },
        { name: 'Food', description: 'Food catalog management' },
        { name: 'Items', description: 'Food inventory management' },
        {
          name: 'WebSocket',
          description: 'Realtime inventory event streaming',
        },
      ],
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Local development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  fs.writeFileSync(outputPath, `${JSON.stringify(specs, null, 2)}\n`);
  console.log(`OpenAPI spec written to ${outputPath}`);
}

main();
