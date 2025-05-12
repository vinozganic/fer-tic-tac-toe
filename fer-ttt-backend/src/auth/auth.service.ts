import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(
      registerDto.username,
      registerDto.password,
    );

    const { password, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.usersService.findOneByUsername(loginDto.username);

      // Validate password
      const isPasswordValid = await this.usersService.validatePassword(
        loginDto.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate JWT token
      const payload = { sub: user.id, username: user.username };

      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          username: user.username,
          wins: user.wins,
          losses: user.losses,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async validateUser(userId: number) {
    return this.usersService.findOneById(userId);
  }
}
