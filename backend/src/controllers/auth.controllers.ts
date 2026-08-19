import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { UserDto } from '../dto/user.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from '../dto/login.dto';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { LoggedInDto } from '../dto/logged-in.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @ApiCreatedResponse({
    type: UserDto,
  })
  @ApiConflictResponse({
    description: 'Email already exists',
  })
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<UserDto> {
    const { email, password, username } = registerDto;
    const user = await this.authService.registerUser(email, password, username);
    const userDto = new UserDto();
    userDto.id = user.id;
    userDto.email = user.email;
    userDto.username = user.username;
    return userDto;
  }

  @ApiOkResponse({
    description: 'Login successful',
    type: LoggedInDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid email or password',
  })
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<LoggedInDto> {
    const { email, password } = loginDto;
    const user = await this.authService.loginUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = await this.jwtService.signAsync({ userId: user.id });
    const loggedInDto = new LoggedInDto();
    loggedInDto.accessToken = token;
    loggedInDto.user = new UserDto();
    loggedInDto.user.id = user.id;
    loggedInDto.user.email = user.email;
    loggedInDto.user.username = user.username;
    return loggedInDto;
  }
}
