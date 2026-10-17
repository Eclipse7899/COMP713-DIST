import { ChannelCredentials } from '@grpc/grpc-js';
import { AuthServiceClient } from '../generated/proto/auth';
import type { UserRepository } from '../repositories/users.repo';
import {
  type UserDto,
  userDtoSchema,
  type WsTokenResponse,
  wsTokenResponseSchema,
} from '../schemas';
import type { Result } from '../util';

export class AuthService {
  private client: AuthServiceClient;

  constructor(
    authUrl: string,
    private readonly usersRepo: UserRepository,
  ) {
    this.client = new AuthServiceClient(
      authUrl,
      ChannelCredentials.createInsecure(),
    );
  }

  async register(
    email: string,
    password: string,
    username: string,
  ): Promise<
    Result<
      {
        token: string;
        user: UserDto;
      },
      string
    >
  > {
    return new Promise<
      Result<
        {
          token: string;
          user: UserDto;
        },
        string
      >
    >((resolve, reject) => {
      this.client.register(
        { email, password, username },
        async (err, response) => {
          if (err) {
            reject(err);
          } else {
            if (response.payload?.$case === 'success') {
              const user = userDtoSchema.parse(response.payload.success.user);
              try {
                await this.usersRepo.ensureUser(user.id);
              } catch (error) {
                reject(error);
                return;
              }
              resolve({
                success: true,
                data: {
                  token: response.payload.success.token,
                  user,
                },
              });
            } else if (response.payload?.$case === 'error') {
              resolve({ success: false, error: response.payload.error });
            }
          }
        },
      );
    });
  }

  async getUser(userId: string): Promise<Result<UserDto, 'NOT_FOUND'>> {
    return new Promise<Result<UserDto, 'NOT_FOUND'>>((resolve, reject) => {
      this.client.getUser({ userId }, (err, response) => {
        if (err) {
          reject(err);
        } else {
          if (response.payload?.$case === 'user') {
            resolve({
              success: true,
              data: userDtoSchema.parse(response.payload.user),
            });
          } else if (response.payload?.$case === 'error') {
            resolve({ success: false, error: 'NOT_FOUND' });
          }
        }
      });
    });
  }

  async getUserByEmail(email: string): Promise<Result<UserDto, 'NOT_FOUND'>> {
    return new Promise<Result<UserDto, 'NOT_FOUND'>>((resolve, reject) => {
      this.client.getUserByEmail({ email }, async (err, response) => {
        if (err) {
          reject(err);
        } else {
          if (response.payload?.$case === 'user') {
            const user = userDtoSchema.parse(response.payload.user);
            try {
              await this.usersRepo.ensureUser(user.id);
            } catch (error) {
              reject(error);
              return;
            }
            resolve({
              success: true,
              data: user,
            });
          } else if (response.payload?.$case === 'error') {
            resolve({ success: false, error: 'NOT_FOUND' });
          }
        }
      });
    });
  }

  async signIn(
    email: string,
    password: string,
  ): Promise<
    Result<
      {
        token: string;
        user: UserDto;
      },
      string
    >
  > {
    return new Promise<
      Result<
        {
          token: string;
          user: UserDto;
        },
        string
      >
    >((resolve, reject) => {
      this.client.signIn({ email, password }, async (err, response) => {
        if (err) {
          reject(err);
        } else {
          if (response.payload?.$case === 'success') {
            const user = userDtoSchema.parse(response.payload.success.user);
            try {
              await this.usersRepo.ensureUser(user.id);
            } catch (error) {
              reject(error);
              return;
            }
            resolve({
              success: true,
              data: {
                token: response.payload.success.token,
                user,
              },
            });
          } else if (response.payload?.$case === 'error') {
            resolve({ success: false, error: response.payload.error });
          }
        }
      });
    });
  }

  async getWsToken(userId: string): Promise<WsTokenResponse> {
    return new Promise((resolve, reject) => {
      this.client.getWsToken({ userId }, (err, response) => {
        if (err) {
          reject(err);
        } else {
          const tokenResponse = wsTokenResponseSchema.parse({
            token: response.token,
          });
          resolve(tokenResponse);
        }
      });
    });
  }
}
