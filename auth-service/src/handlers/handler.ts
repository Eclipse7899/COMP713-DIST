import { AuthService } from '../services/service.ts';
import { toGrpcError } from '../errors.ts';
import type { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js';
import type {
  AuthServiceServer,
  RegisterRequest,
  RegisterResponse,
  SignInRequest,
  SignInResponse,
  UserByEmailRequest,
  UserRequest,
  UserResponse,
} from '../generated/proto/auth.ts';

function fail<T>(callback: sendUnaryData<T>) {
  return (error: unknown) => callback(toGrpcError(error));
}

export function createAuthHandlers(
  authService: AuthService,
): AuthServiceServer {
  return {
    getUser(
      call: ServerUnaryCall<UserRequest, UserResponse>,
      callback: sendUnaryData<UserResponse>,
    ): void {
      authService.getUser(call.request.userId).then((getUserResponse) => {
        if (!getUserResponse.success) {
          callback(null, {
            payload: {
              error: getUserResponse.error,
              $case: 'error',
            },
          });
        } else {
          callback(null, {
            payload: {
              user: getUserResponse.data,
              $case: 'user',
            },
          });
        }
      }, fail(callback));
    },
    getUserByEmail(
      call: ServerUnaryCall<UserByEmailRequest, UserResponse>,
      callback: sendUnaryData<UserResponse>,
    ): void {
      authService.getUserByEmail(call.request.email).then((getUserResponse) => {
        if (!getUserResponse.success) {
          callback(null, {
            payload: {
              error: getUserResponse.error,
              $case: 'error',
            },
          });
        } else {
          callback(null, {
            payload: {
              user: getUserResponse.data,
              $case: 'user',
            },
          });
        }
      }, fail(callback));
    },
    register(
      call: ServerUnaryCall<RegisterRequest, RegisterResponse>,
      callback: sendUnaryData<RegisterResponse>,
    ): void {
      authService
        .registerUser(
          call.request.email,
          call.request.password,
          call.request.username,
        )
        .then((registerResponse) => {
          if (!registerResponse.success) {
            callback(null, {
              payload: {
                error: registerResponse.error,
                $case: 'error',
              },
            });
          } else {
            callback(null, {
              payload: {
                success: registerResponse.data,
                $case: 'success',
              },
            });
          }
        }, fail(callback));
    },
    signIn(
      call: ServerUnaryCall<SignInRequest, SignInResponse>,
      callback: sendUnaryData<SignInResponse>,
    ): void {
      authService
        .signInUser(call.request.email, call.request.password)
        .then((signInResponse) => {
          if (!signInResponse.success) {
            callback(null, {
              payload: {
                error: 'Invalid email or password',
                $case: 'error',
              },
            });
          } else {
            callback(null, {
              payload: {
                success: signInResponse.data,
                $case: 'success',
              },
            });
          }
        }, fail(callback));
    },
  };
}
