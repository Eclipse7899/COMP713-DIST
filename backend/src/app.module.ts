import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { AuthController } from './controllers/auth.controllers';
import { UsersController } from './controllers/users.controller';
import { AuthService } from './services/auth.service';
import { AuthRepo } from './repository/auth.repo';
import { UserRepo } from './repository/users.repo';
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development', '.env.production'],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secretOrPrivateKey: configService.get<string>('SECRET_KEY'),
        signOptions: {
          expiresIn: 3600,
        },
      }),
      inject: [ConfigService],
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
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error(
            'DATABASE_URL is not defined in the environment variables',
          );
        }
        return new PrismaClient({
          adapter: new PrismaPg({ connectionString: databaseUrl }),
        });
      },
    },
  ],
})
export class AppModule {}
