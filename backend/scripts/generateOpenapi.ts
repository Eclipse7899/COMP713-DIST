import fs from 'node:fs';
import { generateSpecs } from 'hono-openapi';

import { createApp } from '../src/app';


const { app } =
  // @ts-ignore
  createApp('a'.repeat(32), null);


async function main() {
  const specs = await generateSpecs(
    app,
    {

    },
  );
  fs.writeFileSync('../openapi.json', JSON.stringify(specs, null, 2));
}

main();