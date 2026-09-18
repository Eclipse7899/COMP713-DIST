import UserRepo from '../repositories/users.repo';
import type { Result } from '../util';

export class UserService {
  constructor(private userRepo: UserRepo) {}

  async getCurrentUser(userId: string): Promise<Result<{ id: string, email: string, username: string }, 'NOT_FOUND'>> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      return {
        success: false,
        error: 'NOT_FOUND',
      }
    }
    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    }
  }
}
