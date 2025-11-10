import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, Not } from 'typeorm';
import { TableEntity } from '../../entities/table.entity';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { ReservationEntity } from '../../entities/reservation.entity';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';
import { WsGateway } from '../ws/ws.gateway';
import { SettingsService } from '../settings/settings.service';
import { TableAvailabilityDto } from './dto/table-availability.dto';
import { SlotSuggestionDto } from './dto/slot-suggestion.dto';
import { DateTime } from 'luxon';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(TableEntity)
    private readonly tablesRepo: Repository<TableEntity>,
    @InjectRepository(ReservationEntity)
    private readonly reservationsRepo: Repository<ReservationEntity>,
    private readonly settingsService: SettingsService,
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

  async getAvailability(params: {
    date: string;
    time: string;
    people: number;
  }): Promise<TableAvailabilityDto[]> {
    const settings = await this.settingsService.getOrCreate();
    const slotMinutes = settings?.slotMinutes ?? 120;
    const timezone = settings?.timezone ?? 'UTC';

    const start = DateTime.fromISO(`${params.date}T${params.time}`, {
      zone: timezone,
    });
    if (!start.isValid) {
      throw new BadRequestException('Invalid date/time');
    }
    const end = start.plus({ minutes: slotMinutes });

    const availableTables = await this.tablesRepo
      .createQueryBuilder('table')
      .where('table.isActive = :active', { active: true })
      .andWhere('table.capacity >= :people', { people: params.people })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from(ReservationEntity, 'reservation')
          .where('reservation.tableId = table.id')
          .andWhere('reservation.status != :cancelled')
          .andWhere('reservation.startsAt < :end')
          .andWhere('reservation.endsAt > :start')
          .getQuery();
        return `NOT EXISTS ${subQuery}`;
      })
      .setParameters({
        start: start.toJSDate(),
        end: end.toJSDate(),
        cancelled: ReservationStatus.CANCELLED,
      })
      .orderBy('table.number', 'ASC')
      .getMany();

    return availableTables.map((table) => ({
      id: table.id,
      number: table.number,
      capacity: table.capacity,
      name: null,
      status: 'AVAILABLE',
    }));
  }

  makeSlots(open: string, close: string, stepMin: number): string[] {
    const safeStep = Math.max(stepMin, 1);
    const start = DateTime.fromISO(`1970-01-01T${open}`);
    const end = DateTime.fromISO(`1970-01-01T${close}`);
    if (!start.isValid || !end.isValid || end <= start) {
      return [];
    }
    const slots: string[] = [];
    let cursor = start;
    while (cursor < end) {
      slots.push(cursor.toFormat('HH:mm'));
      cursor = cursor.plus({ minutes: safeStep });
    }
    return slots;
  }

  async getSlotSuggestions(
    date: string,
    people: number,
  ): Promise<SlotSuggestionDto[]> {
    const normalizedPeople = Math.max(1, people);
    const settings = await this.settingsService.getOrCreate();
    const timezone = settings?.timezone ?? 'UTC';
    const normalizedDate = DateTime.fromISO(date, { zone: timezone });
    if (!normalizedDate.isValid) {
      throw new BadRequestException('Invalid date');
    }
    const slotMinutes = settings?.slotMinutes ?? 60;
    const openHour = settings?.openHour ?? '10:00';
    const closeHour = settings?.closeHour ?? '22:00';
    const slots = this.makeSlots(openHour, closeHour, slotMinutes);
    if (!slots.length) {
      return [];
    }

    const results: SlotSuggestionDto[] = [];
    for (const slot of slots) {
      const availability = await this.getAvailability({
        date: normalizedDate.toISODate() ?? date,
        time: slot,
        people: normalizedPeople,
      });
      results.push({ time: slot, available: availability.length });
    }
    return results;
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
