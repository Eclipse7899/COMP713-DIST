import { ChannelCredentials } from '@grpc/grpc-js';
import { AuthServiceClient } from '../generated/proto/auth';
import {
  type UserDto,
  userDtoSchema,
  type WsTokenResponse,
  wsTokenResponseSchema,
} from '../schemas';
import type { Result } from '../util';

export class AuthService {
  private client: AuthServiceClient;

  constructor(authUrl: string) {
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
      this.client.register({ email, password, username }, (err, response) => {
        if (err) {
          reject(err);
        } else {
          if (response.payload?.$case === 'success') {
            resolve({
              success: true,
              data: {
                token: response.payload.success.token,
                user: userDtoSchema.parse(response.payload.success.user),
              },
            });
          } else if (response.payload?.$case === 'error') {
            resolve({ success: false, error: response.payload.error });
          }
        }
      });
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
      this.client.signIn({ email, password }, (err, response) => {
        if (err) {
          reject(err);
        } else {
          if (response.payload?.$case === 'success') {
            resolve({
              success: true,
              data: {
                token: response.payload.success.token,
                user: userDtoSchema.parse(response.payload.success.user),
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
