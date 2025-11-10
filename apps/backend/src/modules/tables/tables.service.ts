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
import { TableOccupancyDto } from './dto/table-occupancy.dto';
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

    const tables = await this.tablesRepo.find({
      where: { isActive: true },
      order: { number: 'ASC' },
    });

    const overlapping = await this.reservationsRepo
      .createQueryBuilder('reservation')
      .select('reservation.tableId', 'tableId')
      .where('reservation.startsAt < :end', { end: end.toJSDate() })
      .andWhere('reservation.endsAt > :start', { start: start.toJSDate() })
      .andWhere('reservation.status != :cancelled', {
        cancelled: ReservationStatus.CANCELLED,
      })
      .getRawMany<{ tableId: string }>();

    const blocked = new Set(overlapping.map((row) => row.tableId));

    const availableTables = tables.filter(
      (table) => table.capacity >= params.people && !blocked.has(table.id),
    );

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

  async getOccupancy(params: {
    date: string;
    time: string;
  }): Promise<TableOccupancyDto[]> {
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

    const tables = await this.tablesRepo.find({
      order: { number: 'ASC' },
    });

    const reservations = await this.reservationsRepo
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.customer', 'customer')
      .where('reservation.startsAt < :end', { end: end.toJSDate() })
      .andWhere('reservation.endsAt > :start', { start: start.toJSDate() })
      .andWhere('reservation.status != :cancelled', {
        cancelled: ReservationStatus.CANCELLED,
      })
      .getMany();

    const slotMinutesFallback = slotMinutes;
    const reservationMap = new Map<string, ReservationEntity>();
    reservations.forEach((res) => {
      if (!reservationMap.has(res.tableId)) {
        reservationMap.set(res.tableId, res);
      }
    });

    return tables.map((table) => {
      const reservation = reservationMap.get(table.id);
      if (!reservation) {
        return {
          tableId: table.id,
          tableNumber: table.number,
          capacity: table.capacity,
          status: 'AVAILABLE' as const,
        };
      }
      const startDt = DateTime.fromJSDate(reservation.startsAt).setZone(
        timezone,
      );
      const endDt = reservation.endsAt
        ? DateTime.fromJSDate(reservation.endsAt).setZone(timezone)
        : startDt.plus({ minutes: slotMinutesFallback });
      return {
        tableId: table.id,
        tableNumber: table.number,
        capacity: table.capacity,
        status: 'OCCUPIED' as const,
        until: endDt.toFormat('HH:mm'),
        reservationId: reservation.id,
        customerName:
          reservation.customer?.fullName ??
          reservation.customer?.email ??
          undefined,
      };
    });
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
