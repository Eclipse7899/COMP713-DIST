import UserRepo from '../repositories/users.repo';
import type { User } from '../generated/prisma/client';

export class UserService {
  constructor(private userRepo: UserRepo) {}

  async getCurrentUser(userId: string): Promise<User | null> {
    return this.userRepo.findById(userId);
  }
}
