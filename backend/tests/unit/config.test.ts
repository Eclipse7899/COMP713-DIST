import { afterEach, describe, expect, it } from 'bun:test';
import { getConfig } from '../../src/config';

const originalEnv = process.env;

afterEach(() => {
  process.env = originalEnv;
});

describe('getConfig', () => {
  it('returns valid configuration', () => {
    process.env = {
      NODE_ENV: 'production',
      PORT: '8080',
      AUTH_HOST: '127.0.0.1',
      AUTH_PORT: '5051',
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(getConfig()).toEqual({
      NODE_ENV: 'production',
      PORT: 8080,
      AUTH_HOST: '127.0.0.1',
      AUTH_PORT: 5051,
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    });
  });

  it('uses defaults for NODE_ENV and PORT', () => {
    process.env = {
      AUTH_HOST: '127.0.0.1',
      AUTH_PORT: '5051',
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(getConfig()).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      AUTH_HOST: '127.0.0.1',
      AUTH_PORT: 5051,
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    });
  });

  it('coerces PORT from a string to a number', () => {
    process.env = {
      NODE_ENV: 'test',
      PORT: '4567',
      AUTH_HOST: '127.0.0.1',
      AUTH_PORT: '5051',
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(getConfig().PORT).toBe(4567);
    expect(typeof getConfig().PORT).toBe('number');
  });

  it.each(['development', 'test', 'production'])(
    'accepts NODE_ENV=%s',
    (nodeEnv) => {
      process.env = {
        NODE_ENV: nodeEnv,
        PORT: '3000',
        AUTH_HOST: '127.0.0.1',
        AUTH_PORT: '5051',
        DATABASE_URL: 'https://example.com/database',
        JWT_SECRET: 'a'.repeat(32),
      };

      expect(getConfig().NODE_ENV).toBe(nodeEnv);
    },
  );

  it('rejects an invalid NODE_ENV', () => {
    process.env = {
      NODE_ENV: 'staging',
      PORT: '3000',
      AUTH_HOST: '127.0.0.1',
      AUTH_PORT: '5051',
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects a PORT below 1', () => {
    process.env = {
      PORT: '0',
      AUTH_HOST: '127.0.0.1',
      AUTH_PORT: '5051',
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects a PORT above 65535', () => {
    process.env = {
      PORT: '65536',
      AUTH_HOST: '127.0.0.1',
      AUTH_PORT: '5051',
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects a non-integer PORT', () => {
    process.env = {
      PORT: '3000.5',
      AUTH_HOST: '127.0.0.1',
      AUTH_PORT: '5051',
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects a non-numeric PORT', () => {
    process.env = {
      PORT: 'not-a-number',
      AUTH_HOST: '127.0.0.1',
      AUTH_PORT: '5051',
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects a missing DATABASE_URL', () => {
    process.env = {
      PORT: '3000',
      AUTH_HOST: '127.0.0.1',
      AUTH_PORT: '5051',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects an invalid DATABASE_URL', () => {
    process.env = {
      PORT: '3000',
      DATABASE_URL: 'not-a-url',
      AUTH_HOST: '127.0.0.1',
      AUTH_PORT: '5051',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects a missing JWT_SECRET', () => {
    process.env = {
      PORT: '3000',
      AUTH_HOST: '127.0.0.1',
      AUTH_PORT: '5051',
      DATABASE_URL: 'https://example.com/database',
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects a JWT_SECRET shorter than 32 characters', () => {
    process.env = {
      PORT: '3000',
      DATABASE_URL: 'https://example.com/database',
      AUTH_HOST: '127.0.0.1',
      AUTH_PORT: '5051',
      JWT_SECRET: 'a'.repeat(31),
    };

    expect(() => getConfig()).toThrow();
  });

  it('accepts a JWT_SECRET of exactly 32 characters', () => {
    process.env = {
      PORT: '3000',
      DATABASE_URL: 'https://example.com/database',
      AUTH_HOST: '127.0.0.1',
      AUTH_PORT: '5051',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(getConfig().JWT_SECRET).toBe('a'.repeat(32));
  });

  it('accepts a valid AUTH_HOST and AUTH_PORT', () => {
    process.env = {
      PORT: '3000',
      DATABASE_URL: 'https://example.com/database',
      AUTH_HOST: 'auth.example.com',
      AUTH_PORT: '5051',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(getConfig().AUTH_HOST).toBe('auth.example.com');
    expect(getConfig().AUTH_PORT).toBe(5051);
  });

  it('coerces AUTH_PORT from a string to a number', () => {
    process.env = {
      PORT: '3000',
      DATABASE_URL: 'https://example.com/database',
      AUTH_HOST: '127.0.0.1',
      AUTH_PORT: '5051',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(typeof getConfig().AUTH_PORT).toBe('number');
  });

  it('rejects a missing AUTH_HOST', () => {
    process.env = {
      PORT: '3000',
      DATABASE_URL: 'https://example.com/database',
      AUTH_PORT: '5051',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects an empty AUTH_HOST', () => {
    process.env = {
      PORT: '3000',
      DATABASE_URL: 'https://example.com/database',
      AUTH_HOST: '',
      AUTH_PORT: '5051',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects a missing AUTH_PORT', () => {
    process.env = {
      PORT: '3000',
      DATABASE_URL: 'https://example.com/database',
      AUTH_HOST: '127.0.0.1',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects a non-numeric AUTH_PORT', () => {
    process.env = {
      PORT: '3000',
      DATABASE_URL: 'https://example.com/database',
      AUTH_HOST: '127.0.0.1',
      AUTH_PORT: 'not-a-number',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects an AUTH_PORT out of range', () => {
    process.env = {
      PORT: '3000',
      DATABASE_URL: 'https://example.com/database',
      AUTH_HOST: '127.0.0.1',
      AUTH_PORT: '70000',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });
});
