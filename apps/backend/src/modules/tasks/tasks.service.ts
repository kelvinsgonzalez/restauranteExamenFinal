import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import cron, { ScheduledTask } from 'node-cron';
import { ReservationsService } from '../reservations/reservations.service';
import { SettingsService } from '../settings/settings.service';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';

@Injectable()
export class TasksService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TasksService.name);
  private reminderJob?: ScheduledTask;
  private closingJob?: ScheduledTask;

  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly settingsService: SettingsService,
  ) {}

  async onModuleInit() {
    this.scheduleJobs();
  }

  onModuleDestroy() {
    this.reminderJob?.stop();
    this.closingJob?.stop();
  }

  private scheduleJobs() {
    this.reminderJob = cron.schedule('*/15 * * * *', () => this.handleReminders());
    this.closingJob = cron.schedule('0 23 * * *', () => this.closeDay());
  }

  private async handleReminders() {
    const settings = await this.settingsService.getOrCreate();
    const reservations = await this.reservationsService.findAll({
      from: new Date().toISOString(),
      to: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
      status: ReservationStatus.CONFIRMED,
    });
    if (reservations.length) {
      this.logger.log(`Pending reminders: ${reservations.length}`);
    }
  }

  private async closeDay() {
    const today = await this.reservationsService.today();
    today
      .filter((res) => res.status === ReservationStatus.CONFIRMED)
      .forEach((res) => {
        res.status = ReservationStatus.DONE;
      });
    this.logger.log(`Daily snapshot processed (${today.length} reservations)`);
  }
}

