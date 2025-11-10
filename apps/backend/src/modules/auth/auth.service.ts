import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
  import bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(credentials: LoginDto) {
    const user = await this.usersService.findByEmail(credentials.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const match = await bcrypt.compare(
      credentials.password,
      user.passwordHash,
    );
    if (!match) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async login(credentials: LoginDto) {
    const user = await this.validateUser(credentials);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const token = await this.jwtService.signAsync(payload);
    return { token, user: payload };
  }

  async register(dto: CreateUserDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email already registered');
    }
    return this.usersService.create(dto);
  }
}

