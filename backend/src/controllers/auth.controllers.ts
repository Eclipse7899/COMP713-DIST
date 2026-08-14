import { Controller, Get } from '@nestjs/common';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Get()
  findAll(): string {
    return 'This action returns all auth routes';
  }
}
