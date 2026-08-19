import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
    input: '../api/swagger.json',
    output: 'src/generated/client',
});