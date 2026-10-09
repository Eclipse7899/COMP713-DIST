import { AuthService } from '../services/service.ts';
import type { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js';
import type {
  AuthServiceServer,
  RegisterRequest,
  RegisterResponse,
  SignInRequest,
  SignInResponse,
  TokenRequest,
  TokenResponse,
} from '@stocked/shared/src/generated/proto/auth.ts';

export function createAuthHandlers(authService: AuthService): AuthServiceServer {
  return {
    getWsToken(call: ServerUnaryCall<TokenRequest, TokenResponse>, callback: sendUnaryData<TokenResponse>): void {
      authService.createWsToken(
        call.request.userId,
      ).then(({ wsToken }) => {
        callback(null, { token: wsToken });
      });
    },
    register(call: ServerUnaryCall<RegisterRequest, RegisterResponse>, callback: sendUnaryData<RegisterResponse>): void {
      authService.registerUser(
        call.request.email,
        call.request.password,
        call.request.username,
      ).then((registerResponse) => {
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
      });
    },
    signIn(call: ServerUnaryCall<SignInRequest, SignInResponse>, callback: sendUnaryData<SignInResponse>): void {
      authService.signInUser(
        call.request.email,
        call.request.password,
      ).then((signInResponse) => {
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
      });
    },
  };
}