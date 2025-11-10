import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { CustomerEntity } from '../../entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ReservationEntity } from '../../entities/reservation.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly repo: Repository<CustomerEntity>,
    @InjectRepository(ReservationEntity)
    private readonly reservationRepo: Repository<ReservationEntity>,
  ) {}

  async create(dto: CreateCustomerDto) {
    const normalizedEmail = dto.email?.toLowerCase() ?? null;
    if (normalizedEmail) {
      const exists = await this.repo.findOne({
        where: { email: normalizedEmail },
      });
      if (exists) {
        throw new BadRequestException('El correo ya está registrado');
      }
    }
    const entity = this.repo.create({
      ...dto,
      email: normalizedEmail,
      points: dto.points ?? 0,
    });
    return this.repo.save(entity);
  }

  async findAll(search?: string) {
    if (search) {
      return this.repo.find({
        where: [
          { fullName: ILike(`%${search}%`) },
          { email: ILike(`%${search}%`) },
          { phone: ILike(`%${search}%`) },
        ],
        order: { createdAt: 'DESC' },
      });
    }
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const customer = await this.repo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const customer = await this.findOne(id);
    Object.assign(customer, dto);
    return this.repo.save(customer);
  }

  async getHistory(id: string) {
    await this.findOne(id);
    return this.reservationRepo.find({
      where: { customerId: id },
      relations: ['table'],
      order: { startsAt: 'DESC' },
    });
  }

  async remove(id: string) {
    const customer = await this.findOne(id);
    await this.repo.remove(customer);
    return { success: true };
  }
}
