import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async create(data: CreateUserDto) {
    const hash = await bcrypt.hash(data.password, 10);
    const entity = this.repo.create({
      email: data.email.toLowerCase(),
      passwordHash: hash,
      role: data.role ?? UserRole.STAFF,
    });
    return this.repo.save(entity);
  }

  async ensureAdminExists() {
    const admins = await this.repo.count({ where: { role: UserRole.ADMIN } });
    return admins > 0;
  }

  findByEmail(email: string) {
    return this.repo.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async findAll() {
    return this.repo.find();
  }

  async remove(id: string) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('User not found');
    await this.repo.remove(entity);
    return true;
  }
}

