import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationEntity } from '../../entities/reservation.entity';
import { TableEntity } from '../../entities/table.entity';
import { CustomerEntity } from '../../entities/customer.entity';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { AvailabilityController } from './availability.controller';
import { SettingsModule } from '../settings/settings.module';
import { WsModule } from '../ws/ws.module';
import { TablesModule } from '../tables/tables.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReservationEntity, TableEntity, CustomerEntity]),
    SettingsModule,
    WsModule,
    TablesModule,
  ],
  providers: [ReservationsService],
  controllers: [ReservationsController, AvailabilityController],
  exports: [ReservationsService],
})
export class ReservationsModule {}

