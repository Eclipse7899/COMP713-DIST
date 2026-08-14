import { Controller, Get } from '@nestjs/common';
import { UserService } from '../services/user.service';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}
  @Get()
  findAll(): string {
    return 'This action returns all users';
  }
}
