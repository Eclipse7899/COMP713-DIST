import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../../src/generated/prisma/client';
import type { UserRepository } from '../../../src/repositories/users.repo';
import { UserService } from '../../../src/services/user.service';

const USER_ID = 'user-1';
const USER_EMAIL = 'user@example.com';
const USERNAME = 'user';
const MISSING_USER_ID = 'missing-user';
const HASHED_PASSWORD = 'hashed-password';
const NOT_FOUND_ERROR = 'NOT_FOUND';

const user = {
  id: USER_ID,
  createdAt: new Date('2026-01-01'),
  email: USER_EMAIL,
  username: USERNAME,
  hashed_password: HASHED_PASSWORD,
} satisfies User;

describe('UserService', () => {
  let userRepo: UserRepository;
  let service: UserService;

  beforeEach(() => {
    userRepo = {
      findById: vi.fn(),
      createUser: vi.fn(),
      findUserByEmail: vi.fn(),
    };
    service = new UserService(userRepo);
  });

  it('returns the current user without the password hash', async () => {
    vi.mocked(userRepo.findById).mockResolvedValue(user);

    await expect(service.getCurrentUser(user.id)).resolves.toEqual({
      success: true,
      data: { id: user.id, email: user.email, username: user.username },
    });
    expect(userRepo.findById).toHaveBeenCalledWith(user.id);
  });

  it('returns NOT_FOUND when the repository has no user', async () => {
    vi.mocked(userRepo.findById).mockResolvedValue(null);

    await expect(service.getCurrentUser(MISSING_USER_ID)).resolves.toEqual({
      success: false,
      error: NOT_FOUND_ERROR,
    });
  });
});
