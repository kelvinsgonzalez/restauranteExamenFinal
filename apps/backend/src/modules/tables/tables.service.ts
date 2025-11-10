import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, Not } from 'typeorm';
import { TableEntity } from '../../entities/table.entity';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { ReservationEntity } from '../../entities/reservation.entity';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';
import { WsGateway } from '../ws/ws.gateway';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(TableEntity)
    private readonly tablesRepo: Repository<TableEntity>,
    @InjectRepository(ReservationEntity)
    private readonly reservationsRepo: Repository<ReservationEntity>,
    private readonly wsGateway: WsGateway,
  ) {}

  findAll(isActive?: boolean) {
    return this.tablesRepo.find({
      where: typeof isActive === 'boolean' ? { isActive } : {},
      order: { number: 'ASC' },
    });
  }

  async create(dto: CreateTableDto) {
    const entity = this.tablesRepo.create(dto);
    const saved = await this.tablesRepo.save(entity);
    await this.emitOccupancySnapshot();
    return saved;
  }

  async findOne(id: string) {
    const table = await this.tablesRepo.findOne({ where: { id } });
    if (!table) throw new NotFoundException('Table not found');
    return table;
  }

  async update(id: string, dto: UpdateTableDto) {
    const table = await this.findOne(id);
    Object.assign(table, dto);
    const saved = await this.tablesRepo.save(table);
    await this.emitOccupancySnapshot();
    return saved;
  }

  async remove(id: string) {
    const table = await this.findOne(id);
    await this.tablesRepo.remove(table);
    await this.emitOccupancySnapshot();
    return true;
  }

  async occupancySnapshot(reference = new Date()) {
    const tables = await this.tablesRepo.find({ order: { number: 'ASC' } });
    const reservations = await this.reservationsRepo.find({
      where: {
        startsAt: LessThanOrEqual(reference),
        endsAt: MoreThan(reference),
        status: Not(ReservationStatus.CANCELLED),
      },
    });

    const occupied = new Set(reservations.map((res) => res.tableId));
    return {
      timestamp: reference,
      total: tables.length,
      occupied: occupied.size,
      tables: tables.map((table) => ({
        id: table.id,
        number: table.number,
        capacity: table.capacity,
        location: table.location,
        isActive: table.isActive,
        occupied: occupied.has(table.id),
      })),
    };
  }

  async emitOccupancySnapshot() {
    const snapshot = await this.occupancySnapshot();
    this.wsGateway.broadcastTablesSnapshot(snapshot);
  }
}
