import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not } from 'typeorm';
import { ReservationEntity } from '../../entities/reservation.entity';
import { TableEntity } from '../../entities/table.entity';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';
import { SettingsService } from '../settings/settings.service';
import { DateTime } from 'luxon';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ReservationEntity)
    private readonly reservationsRepo: Repository<ReservationEntity>,
    @InjectRepository(TableEntity)
    private readonly tablesRepo: Repository<TableEntity>,
    private readonly settingsService: SettingsService,
  ) {}

  async occupancy(range: 'day' | 'week', dateISO: string) {
    const settings = await this.settingsService.getOrCreate();
    let start = DateTime.fromISO(dateISO, { zone: settings.timezone });
    if (!start.isValid) {
      start = DateTime.now().setZone(settings.timezone);
    }
    const rangeStart =
      range === 'week' ? start.startOf('week') : start.startOf('day');
    const end = range === 'week' ? start.endOf('week') : start.endOf('day');
    const reservations = await this.reservationsRepo.find({
      where: {
        startsAt: Between(rangeStart.toJSDate(), end.toJSDate()),
        status: Not(ReservationStatus.CANCELLED),
      },
    });
    const tables = await this.tablesRepo.count({ where: { isActive: true } });
    const hoursMap = reservations.reduce<Record<string, number>>(
      (acc, reservation) => {
        const hour = DateTime.fromJSDate(reservation.startsAt, {
          zone: settings.timezone,
        }).toFormat('yyyy-LL-dd HH:00');
        acc[hour] = (acc[hour] ?? 0) + 1;
        return acc;
      },
      {},
    );
    const totalSlots = tables * this.estimateSlots(range, settings);
    const occupancyPct =
      totalSlots === 0
        ? 0
        : Math.min(100, Math.round((reservations.length / totalSlots) * 100));
    const peakHours = Object.entries(hoursMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, count]) => ({ hour, count }));

    return {
      range,
      from: rangeStart.toISO(),
      to: end.toISO(),
      totalReservations: reservations.length,
      tables,
      occupancyPct,
      peakHours,
    };
  }

  private estimateSlots(
    range: 'day' | 'week',
    settings: { slotMinutes: number; openHour: string; closeHour: string },
  ) {
    const [openHour] = settings.openHour.split(':').map(Number);
    const [closeHour] = settings.closeHour.split(':').map(Number);
    const hours = closeHour - openHour;
    const slotsPerDay = Math.max(
      1,
      Math.floor((hours * 60) / settings.slotMinutes),
    );
    return range === 'day' ? slotsPerDay : slotsPerDay * 7;
  }
}
