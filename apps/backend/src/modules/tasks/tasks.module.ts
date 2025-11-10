import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { ReservationsModule } from '../reservations/reservations.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [ReservationsModule, SettingsModule],
  providers: [TasksService],
})
export class TasksModule {}

