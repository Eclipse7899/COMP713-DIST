import {User} from "../../models/user.model";

export class UserService {
  async getCurrentUser(userId: string): Promise<User> {}
}