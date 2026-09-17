import UserRepo from '../repositories/users.repo';

export class UserService {
  constructor(private userRepo: UserRepo) {}

  async getCurrentUser(userId: string): Promise<{ id: string, email: string, username: string } | null> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      username: user.username,
    }
  }
}
