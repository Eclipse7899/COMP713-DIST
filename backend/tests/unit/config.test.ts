import { afterEach, describe, expect, it } from 'vitest';
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
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(getConfig()).toEqual({
      NODE_ENV: 'production',
      PORT: 8080,
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    });
  });

  it('uses defaults for NODE_ENV and PORT', () => {
    process.env = {
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(getConfig()).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    });
  });

  it('coerces PORT from a string to a number', () => {
    process.env = {
      NODE_ENV: 'test',
      PORT: '4567',
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
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects a PORT below 1', () => {
    process.env = {
      PORT: '0',
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects a PORT above 65535', () => {
    process.env = {
      PORT: '65536',
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects a non-integer PORT', () => {
    process.env = {
      PORT: '3000.5',
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects a non-numeric PORT', () => {
    process.env = {
      PORT: 'not-a-number',
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects a missing DATABASE_URL', () => {
    process.env = {
      PORT: '3000',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects an invalid DATABASE_URL', () => {
    process.env = {
      PORT: '3000',
      DATABASE_URL: 'not-a-url',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects a missing JWT_SECRET', () => {
    process.env = {
      PORT: '3000',
      DATABASE_URL: 'https://example.com/database',
    };

    expect(() => getConfig()).toThrow();
  });

  it('rejects a JWT_SECRET shorter than 32 characters', () => {
    process.env = {
      PORT: '3000',
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(31),
    };

    expect(() => getConfig()).toThrow();
  });

  it('accepts a JWT_SECRET of exactly 32 characters', () => {
    process.env = {
      PORT: '3000',
      DATABASE_URL: 'https://example.com/database',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(getConfig().JWT_SECRET).toBe('a'.repeat(32));
  });
});
