import { Controller, Get, Req } from "@nestjs/common";
import { UserService } from "../modules/user/user.service";
import { GetCurrentUserResponse } from "src/generated/api";

@Controller("users")
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get("me")
  async getCurrentUser(@Req() req: any): Promise<GetCurrentUserResponse> {
    return await this.userService.getCurrentUser(ctx.user);
  }
}
