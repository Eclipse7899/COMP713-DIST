import type {
  UserRepository,
} from '@stocked/shared/src/repositories/users.repo';
import type { Result } from '@stocked/shared/src/util';
import { type UserDto, userDtoSchema } from '../schemas';

export class UserService {
  constructor(private userRepo: UserRepository) {}

  async getCurrentUser(userId: string): Promise<Result<UserDto, 'NOT_FOUND'>> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      return {
        success: false,
        error: 'NOT_FOUND',
      }
    }
    return {
      success: true,
      data: userDtoSchema.parse(user),
    }
  }
}
