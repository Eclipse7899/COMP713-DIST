import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { AuthController } from './controllers/auth.controllers';
import { UsersController } from './controllers/users.controller';
import { AuthService } from './services/auth.service';
import { AuthRepo } from './repository/auth.repo';
import { UserRepo } from './repository/users.repo';
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    UserService,
    AuthService,
    AuthRepo,
    UserRepo,
    {
      provide: PrismaClient,
      useValue: prisma,
    },
  ],
})
export class AppModule {}
