import { Controller, Get } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Get()
  findAll(): string {
    return 'This action returns all auth routes';
  }
}
