import { describe, expect, it } from 'vitest';
import { comparePasswords, hashPassword } from '../../src/util';

describe('Hashing', () => {
  it('hashes a password correctly', async () => {
    const password = '123';
    const hashed = await hashPassword(password);
    const compare = await comparePasswords(password, hashed);
    expect(compare).toBe(true);
  });
  it('fails to compare an incorrect password', async () => {
    const password = '123';
    const hashed = await hashPassword(password);
    const compare = await comparePasswords('wrongpassword', hashed);
    expect(compare).toBe(false);
  });
  it ('successfully compares the same password with different hashes', async () => {
    const password = '123';
    const hashed1 = await hashPassword(password);
    const hashed2 = await hashPassword(password);
    const compare1 = await comparePasswords(password, hashed1);
    const compare2 = await comparePasswords(password, hashed2);
    expect(compare1).toBe(true);
    expect(compare2).toBe(true);
  });
  it('hashes different passwords to different hashes', async () => {
    const password1 = 'password1';
    const password2 = 'password2';
    const hashed1 = await hashPassword(password1);
    const hashed2 = await hashPassword(password2);
    expect(hashed1).not.toBe(hashed2);
  });
});
