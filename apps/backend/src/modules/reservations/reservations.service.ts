import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  Not,
  LessThan,
  MoreThan,
  In,
} from 'typeorm';
import { ReservationEntity } from '../../entities/reservation.entity';
import { TableEntity } from '../../entities/table.entity';
import { CustomerEntity } from '../../entities/customer.entity';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationQueryDto } from './dto/reservation-query.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { SettingsService } from '../settings/settings.service';
import { DateTime } from 'luxon';
import { isWithinSchedule, addSlotMinutes } from '../../utils/time.utils';
import { WsGateway } from '../ws/ws.gateway';
import { TablesService } from '../tables/tables.service';
import { ReservationCardDto } from './dto/reservation-card.dto';
import { DashboardOverviewDto } from './dto/dashboard-overview.dto';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(ReservationEntity)
    private readonly repo: Repository<ReservationEntity>,
    @InjectRepository(TableEntity)
    private readonly tablesRepo: Repository<TableEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customersRepo: Repository<CustomerEntity>,
    private readonly settingsService: SettingsService,
    private readonly wsGateway: WsGateway,
    private readonly tablesService: TablesService,
  ) {}

  findAll(query: ReservationQueryDto = {}) {
    const where: any = {};
    if (query.from && query.to) {
      where.startsAt = Between(new Date(query.from), new Date(query.to));
    } else if (query.from) {
      where.startsAt = MoreThan(new Date(query.from));
    } else if (query.to) {
      where.startsAt = LessThan(new Date(query.to));
    }
    if (query.status) {
      where.status = query.status;
    }
    return this.repo.find({
      where,
      relations: ['customer', 'table'],
      order: { startsAt: 'ASC' },
    });
  }

  async today() {
    const settings = await this.settingsService.getOrCreate();
    const now = DateTime.now().setZone(settings.timezone);
    const from = now.startOf('day').toJSDate();
    const to = now.endOf('day').toJSDate();
    return this.repo.find({
      where: {
        startsAt: Between(from, to),
      },
      relations: ['customer', 'table'],
      order: { startsAt: 'ASC' },
    });
  }

  async findOne(id: string) {
    const reservation = await this.repo.findOne({
      where: { id },
      relations: ['customer', 'table'],
    });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    return reservation;
  }

  async create(dto: CreateReservationDto) {
    const customer = await this.customersRepo.findOne({
      where: { id: dto.customerId },
    });
    if (!customer) throw new BadRequestException('Customer not found');
    const table = await this.tablesRepo.findOne({
      where: { id: dto.tableId, isActive: true },
    });
    if (!table) throw new BadRequestException('Table not available');
    if (dto.people > table.capacity) {
      throw new BadRequestException('People exceed table capacity');
    }

    const { startsAt, endsAt } = await this.normalizeSlot(dto);
    await this.ensureSlotIsFree(table.id, startsAt, endsAt);

    const reservation = this.repo.create({
      ...dto,
      startsAt,
      endsAt,
      status: dto.status ?? ReservationStatus.PENDING,
    });
    const saved = await this.repo.save(reservation);
    this.wsGateway.broadcastReservation('created', saved);
    await this.tablesService.emitOccupancySnapshot();
    await this.broadcastTableOccupancyChange(saved);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateReservationDto) {
    const reservation = await this.findOne(id);
    let targetTable: TableEntity;
    if (reservation.table) {
      targetTable = reservation.table;
    } else {
      const existing = await this.tablesRepo.findOne({
        where: { id: reservation.tableId },
      });
      if (!existing) {
        throw new BadRequestException('Table not found');
      }
      targetTable = existing;
    }
    if (dto.tableId && dto.tableId !== reservation.tableId) {
      const updated = await this.tablesRepo.findOne({
        where: { id: dto.tableId, isActive: true },
      });
      if (!updated) throw new BadRequestException('Table not available');
      targetTable = updated;
    }
    if ((dto.people ?? reservation.people) > (targetTable?.capacity ?? 0)) {
      throw new BadRequestException('People exceed table capacity');
    }

    const normalized = await this.normalizeSlot({
      customerId: dto.customerId ?? reservation.customerId,
      tableId: dto.tableId ?? reservation.tableId,
      people: dto.people ?? reservation.people,
      startsAt: dto.startsAt ?? reservation.startsAt.toISOString(),
      endsAt: dto.endsAt ?? reservation.endsAt.toISOString(),
      notes: dto.notes ?? reservation.notes ?? undefined,
      status: dto.status ?? reservation.status,
    });

    await this.ensureSlotIsFree(
      dto.tableId ?? reservation.tableId,
      normalized.startsAt,
      normalized.endsAt,
      reservation.id,
    );

    Object.assign(reservation, dto, normalized);
    const saved = await this.repo.save(reservation);
    this.wsGateway.broadcastReservation('updated', saved);
    await this.tablesService.emitOccupancySnapshot();
    await this.broadcastTableOccupancyChange(saved);
    return saved;
  }

  async confirm(id: string) {
    const reservation = await this.findOne(id);
    reservation.status = ReservationStatus.CONFIRMED;
    const saved = await this.repo.save(reservation);
    this.wsGateway.broadcastReservation('updated', saved);
    return saved;
  }

  async cancel(id: string) {
    const reservation = await this.findOne(id);
    reservation.status = ReservationStatus.CANCELLED;
    const saved = await this.repo.save(reservation);
    this.wsGateway.broadcastReservation('cancelled', saved);
    await this.tablesService.emitOccupancySnapshot();
    await this.broadcastTableOccupancyChange(saved);
    return saved;
  }

  async remove(id: string, force = false) {
    const reservation = await this.findOne(id);
    const settings = await this.settingsService.getOrCreate();
    const timezone = settings?.timezone ?? 'UTC';
    const slotMinutes = settings?.slotMinutes ?? 120;
    const start = DateTime.fromJSDate(reservation.startsAt).setZone(timezone);
    const end = reservation.endsAt
      ? DateTime.fromJSDate(reservation.endsAt).setZone(timezone)
      : start.plus({ minutes: slotMinutes });
    const now = DateTime.now().setZone(timezone);
    if (!force && now < end) {
      throw new ConflictException('RESERVATION_NOT_FINISHED');
    }
    await this.repo.delete(id);
    this.wsGateway.broadcastReservation('cancelled', reservation);
    await this.tablesService.emitOccupancySnapshot();
    await this.broadcastTableOccupancyChange(reservation);
    return { deleted: true };
  }

  async getDashboardOverview(
    dateISO: string,
    days = 7,
  ): Promise<DashboardOverviewDto> {
    const settings = await this.settingsService.getOrCreate();
    const timezone = settings?.timezone ?? 'UTC';
    const slotMinutes = settings?.slotMinutes ?? 120;

    const baseDate = DateTime.fromISO(dateISO, { zone: timezone });
    if (!baseDate.isValid) {
      throw new BadRequestException('Invalid date');
    }
    const dayStart = baseDate.startOf('day');
    const dayEnd = baseDate.endOf('day');
    const upcomingStart = dayStart.plus({ days: 1 });
    const upcomingEnd = dayStart.plus({ days }).endOf('day');

    const baseQuery = this.repo
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.table', 'table')
      .leftJoinAndSelect('reservation.customer', 'customer');

    const todayEntities = await baseQuery
      .clone()
      .where('reservation.startsAt >= :start', { start: dayStart.toJSDate() })
      .andWhere('reservation.startsAt < :end', { end: dayEnd.toJSDate() })
      .andWhere('reservation.status = :status', {
        status: ReservationStatus.CONFIRMED,
      })
      .orderBy('reservation.startsAt', 'ASC')
      .getMany();

    const upcomingEntities = await baseQuery
      .clone()
      .where('reservation.startsAt >= :start', {
        start: upcomingStart.toJSDate(),
      })
      .andWhere('reservation.startsAt < :end', {
        end: upcomingEnd.toJSDate(),
      })
      .andWhere('reservation.status != :cancelled', {
        cancelled: ReservationStatus.CANCELLED,
      })
      .orderBy('reservation.startsAt', 'ASC')
      .getMany();

    const todayCards = todayEntities.map((entity) =>
      this.mapToCard(entity, slotMinutes, timezone),
    );

    const upcomingGroups = upcomingEntities.reduce<
      Record<string, ReservationCardDto[]>
    >((acc, entity) => {
      const card = this.mapToCard(entity, slotMinutes, timezone);
      acc[card.date] = acc[card.date] || [];
      acc[card.date].push(card);
      return acc;
    }, {});

    const upcoming = Object.entries(upcomingGroups)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, items]) => ({ date, items }));

    const totalTables = await this.tablesRepo.count();
    const countResult = await this.repo
      .createQueryBuilder('reservation')
      .select('COUNT(DISTINCT reservation.tableId)', 'count')
      .where('reservation.startsAt >= :start', { start: dayStart.toJSDate() })
      .andWhere('reservation.startsAt < :end', { end: dayEnd.toJSDate() })
      .andWhere('reservation.status != :cancelled', {
        cancelled: ReservationStatus.CANCELLED,
      })
      .getRawOne<{ count: string }>();

    const reservedTablesToday = Number(countResult?.count ?? 0);
    const occupancyPercent =
      totalTables > 0
        ? Math.round((reservedTablesToday / totalTables) * 100)
        : 0;

    return {
      totals: {
        occupancyPercent,
        todayCount: todayCards.length,
      },
      today: todayCards,
      upcoming,
    };
  }

  async availability(query: AvailabilityQueryDto) {
    const settings = await this.settingsService.getOrCreate();
    const start = DateTime.fromISO(
      `${query.date}T${query.time}`,
      { zone: settings.timezone },
    );
    if (!start.isValid) {
      throw new BadRequestException('Invalid date/time');
    }
    if (!isWithinSchedule(start, settings)) {
      throw new BadRequestException('Schedule blocked for selected slot');
    }
    const end = addSlotMinutes(start, settings.slotMinutes);
    const tables = await this.tablesRepo.find({
      where: { isActive: true },
      order: { capacity: 'ASC' },
    });
    const eligible = tables.filter((table) => table.capacity >= query.people);
    let collisions: ReservationEntity[] = [];
    if (eligible.length) {
      collisions = await this.repo.find({
        where: {
          tableId: In(eligible.map((t) => t.id)),
          status: Not(ReservationStatus.CANCELLED),
          startsAt: LessThan(end.toJSDate()),
          endsAt: MoreThan(start.toJSDate()),
        },
      });
    }
    const available = eligible.filter(
      (table) => !collisions.some((c) => c.tableId === table.id),
    );
    const suggestions = Array.from({ length: 3 }).map((_, index) => {
      const suggestionStart = start.plus({
        minutes: index * settings.slotMinutes,
      });
      return {
        startsAt: suggestionStart.toISO(),
        endsAt: suggestionStart.plus({ minutes: settings.slotMinutes }).toISO(),
      };
    });
    return {
      query,
      available,
      suggestions,
    };
  }

  private async normalizeSlot(dto: CreateReservationDto) {
    const settings = await this.settingsService.getOrCreate();
    const startsAt = DateTime.fromISO(dto.startsAt, {
      zone: settings.timezone,
    });
    if (!startsAt.isValid) {
      throw new BadRequestException('Invalid startsAt format');
    }
    if (!isWithinSchedule(startsAt, settings)) {
      throw new BadRequestException('Slot outside business hours');
    }
    const endsAt = dto.endsAt
      ? DateTime.fromISO(dto.endsAt, { zone: settings.timezone })
      : addSlotMinutes(startsAt, settings.slotMinutes);
    if (!endsAt.isValid || endsAt.toMillis() <= startsAt.toMillis()) {
      throw new BadRequestException('Invalid end slot');
    }
    if (!isWithinSchedule(endsAt.minus({ minutes: 1 }), settings)) {
      throw new BadRequestException('Slot ends outside business hours');
    }
    return {
      startsAt: startsAt.toJSDate(),
      endsAt: endsAt.toJSDate(),
    };
  }

  private async ensureSlotIsFree(
    tableId: string,
    startsAt: Date,
    endsAt: Date,
    ignoreId?: string,
  ) {
    const where: any = {
      tableId,
      status: Not(ReservationStatus.CANCELLED),
      startsAt: LessThan(endsAt),
      endsAt: MoreThan(startsAt),
    };
    if (ignoreId) {
      where.id = Not(ignoreId);
    }
    const conflict = await this.repo.findOne({ where });
    if (conflict) {
      throw new ConflictException('TABLE_OCCUPIED');
    }
  }

  private async broadcastTableOccupancyChange(
    reservation: ReservationEntity,
  ) {
    const settings = await this.settingsService.getOrCreate();
    const timezone = settings?.timezone ?? 'UTC';
    const slotMinutes = settings?.slotMinutes ?? 120;
    const start = DateTime.fromJSDate(reservation.startsAt).setZone(timezone);
    const end = reservation.endsAt
      ? DateTime.fromJSDate(reservation.endsAt).setZone(timezone)
      : start.plus({ minutes: slotMinutes });
    this.wsGateway.broadcastTableOccupancyChange({
      tableId: reservation.tableId,
      date: start.toISODate(),
      start: start.toISO(),
      end: end.toISO(),
    });
  }

  private mapToCard(
    reservation: ReservationEntity,
    slotMinutes: number,
    timezone: string,
  ): ReservationCardDto {
    const start = DateTime.fromJSDate(reservation.startsAt).setZone(timezone);
    let end = reservation.endsAt
      ? DateTime.fromJSDate(reservation.endsAt).setZone(timezone)
      : start.plus({ minutes: slotMinutes });
    if (end <= start) {
      end = start.plus({ minutes: slotMinutes });
    }
    const durationMinutes = Math.max(
      1,
      Math.round(end.diff(start, 'minutes').minutes),
    );
    return {
      id: reservation.id,
      date: start.toISODate() ?? '',
      start: start.toFormat('HH:mm'),
      end: end.toFormat('HH:mm'),
      durationMinutes,
      tableNumber: reservation.table?.number ?? 0,
      customerName:
        reservation.customer?.fullName ??
        reservation.customer?.email ??
        'Cliente',
      status: reservation.status,
    };
  }
}
