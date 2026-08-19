import { UserDto } from './user.dto';

export class LoggedInDto {
  accessToken: string;
  user: UserDto;
}
