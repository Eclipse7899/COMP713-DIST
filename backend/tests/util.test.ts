import { describe, expect, it } from 'vitest';
import { comparePasswords, hashPassword } from '../src/util';

describe('Hashing', () => {
  it('hashes a password correctly', async () => {
    const password = '123';
    const hashed = await hashPassword(password);
    const compare = await comparePasswords(password, hashed);
    expect(compare).toBe(true);
  });
});
