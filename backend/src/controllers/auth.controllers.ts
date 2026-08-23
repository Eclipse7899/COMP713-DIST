import { Body, Controller, Post, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../modules/auth/auth.service";
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  LoginResponse,
  LoginUserData,
  type RegisterUserData,
  RegisterUserResponse,
} from "../generated/api";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiCreatedResponse()
  @ApiConflictResponse()
  @Post("register")
  async registerUser(
    @Body() body: RegisterUserData["body"],
  ): Promise<RegisterUserResponse> {
    const { email, password, username } = body;
    const user = await this.authService.registerUser(email, password, username);
    return {
      id: user.id,
      email: user.email,
      username: user.username,
    };
  }

  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @Post("login")
  async loginUser(@Body() body: LoginUserData["body"]): Promise<LoginResponse> {
    const result = await this.authService.validateUser(
      body.email,
      body.password,
    );
    if (!result.success) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const { user, token } = result.data;
    return {
      accessToken: token,
      user,
    };
  }
}
