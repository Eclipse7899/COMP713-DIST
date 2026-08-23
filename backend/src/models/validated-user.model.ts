import { User } from './user.model';

export default class ValidatedUser {
  constructor(
    public user: User,
    public token: string,
  ) {}
}
