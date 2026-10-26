import { ChannelCredentials, Metadata } from "@grpc/grpc-js";
import { AuthServiceClient } from "../generated/proto/auth";
import type { UserRepository } from "../repositories/users.repo";
import { type UserDto, userDtoSchema } from "../schemas";
import type { Result } from "../util";

const AUTH_RPC_TIMEOUT_MS = 5_000;

function rpcOptions() {
  return { deadline: Date.now() + AUTH_RPC_TIMEOUT_MS };
}

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
        new Metadata(),
        rpcOptions(),
        async (err, response) => {
          if (err) {
            reject(err);
          } else {
            if (response.payload?.$case === "success") {
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
            } else if (response.payload?.$case === "error") {
              resolve({ success: false, error: response.payload.error });
            }
          }
        },
      );
    });
  }

  async getUser(userId: string): Promise<Result<UserDto, "NOT_FOUND">> {
    return new Promise<Result<UserDto, "NOT_FOUND">>((resolve, reject) => {
      this.client.getUser(
        { userId },
        new Metadata(),
        rpcOptions(),
        (err, response) => {
          if (err) {
            reject(err);
          } else {
            if (response.payload?.$case === "user") {
              resolve({
                success: true,
                data: userDtoSchema.parse(response.payload.user),
              });
            } else if (response.payload?.$case === "error") {
              resolve({ success: false, error: "NOT_FOUND" });
            }
          }
        },
      );
    });
  }

  async getUserByEmail(email: string): Promise<Result<UserDto, "NOT_FOUND">> {
    return new Promise<Result<UserDto, "NOT_FOUND">>((resolve, reject) => {
      this.client.getUserByEmail(
        { email },
        new Metadata(),
        rpcOptions(),
        async (err, response) => {
          if (err) {
            reject(err);
          } else {
            if (response.payload?.$case === "user") {
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
            } else if (response.payload?.$case === "error") {
              resolve({ success: false, error: "NOT_FOUND" });
            }
          }
        },
      );
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
      this.client.signIn(
        { email, password },
        new Metadata(),
        rpcOptions(),
        async (err, response) => {
          if (err) {
            reject(err);
          } else {
            if (response.payload?.$case === "success") {
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
            } else if (response.payload?.$case === "error") {
              resolve({ success: false, error: response.payload.error });
            }
          }
        },
      );
    });
  }
}
