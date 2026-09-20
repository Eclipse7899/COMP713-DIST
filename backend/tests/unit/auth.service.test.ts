import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../src/generated/prisma/client';
import type { UserRepository } from '../../src/repositories/users.repo';
import { AuthService } from '../../src/services/auth.service';
import { hashPassword } from '../../src/util';

const PASSWORD = 'password';
const WRONG_PASSWORD = 'wrong-password';
const USER_ID = 'user-1';
const USER_EMAIL = 'user@example.com';
const USERNAME = 'user';
const JWT_SECRET = 'a'.repeat(32);
const USERNAME_TAKEN_ERROR = 'USERNAME_TAKEN';
const EMAIL_TAKEN_ERROR = 'EMAIL_TAKEN';

const hashedPassword = await hashPassword(PASSWORD);

const user = {
  id: USER_ID,
  createdAt: new Date('2026-01-01'),
  email: USER_EMAIL,
  username: USERNAME,
  hashed_password: hashedPassword,
} satisfies User;

describe('AuthService', () => {
  let userRepo: UserRepository;
  let service: AuthService;

  beforeEach(() => {
    userRepo = {
      findById: vi.fn(),
      createUser: vi.fn(),
      findUserByEmail: vi.fn(),
    };
    service = new AuthService(JWT_SECRET, userRepo);
  });

  it('normalizes email before registering a user and returns a token', async () => {
    vi.mocked(userRepo.createUser).mockResolvedValue({
      success: true,
      data: user,
    });

    const result = await service.registerUser(
      `  ${USER_EMAIL.toLowerCase()}  `,
      PASSWORD,
      USERNAME,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user).toEqual({
        id: user.id,
        email: user.email,
        username: user.username,
      });
      expect(result.data.accessToken).toEqual(expect.any(String));
    }
    expect(userRepo.createUser).toHaveBeenCalledWith(
      USER_EMAIL,
      expect.any(String),
      USERNAME,
    );
  });

  it.each([USERNAME_TAKEN_ERROR, EMAIL_TAKEN_ERROR] as const)(
    'returns repository registration errors (%s)',
    async (error) => {
      vi.mocked(userRepo.createUser).mockResolvedValue({
        success: false,
        error,
      });

      await expect(
        service.registerUser(USER_EMAIL, PASSWORD, USERNAME),
      ).resolves.toEqual({
        success: false,
        error,
      });
    },
  );

  it('rejects sign-in when the user does not exist', async () => {
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue(null);

    await expect(
      service.signInUser(`  ${USER_EMAIL.toUpperCase()}  `, PASSWORD),
    ).resolves.toEqual({
      success: false,
      error: undefined,
    });
    expect(userRepo.findUserByEmail).toHaveBeenCalledWith(USER_EMAIL);
  });

  it('rejects sign-in when the password is incorrect', async () => {
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue(user);

    await expect(
      service.signInUser(user.email, WRONG_PASSWORD),
    ).resolves.toEqual({
      success: false,
      error: undefined,
    });
  });

  it('signs in with valid credentials', async () => {
    const hashedPassword = await hashPassword(PASSWORD);
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue({
      ...user,
      hashed_password: hashedPassword,
    });

    const result = await service.signInUser(user.email, PASSWORD);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user).toEqual({
        id: user.id,
        email: user.email,
        username: user.username,
      });
      expect(result.data.accessToken).toEqual(expect.any(String));
    }
  });
});
