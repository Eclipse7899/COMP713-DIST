import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { AuthController } from './controllers/auth.controllers';
import { UsersController } from './controllers/users.controller';

@Module({
  imports: [],
  controllers: [AuthController, UsersController],
  providers: [UserService],
})
export class AppModule {}
