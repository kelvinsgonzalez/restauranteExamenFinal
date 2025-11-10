import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationEntity } from '../../entities/reservation.entity';
import { TableEntity } from '../../entities/table.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReservationEntity, TableEntity]),
    SettingsModule,
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}

