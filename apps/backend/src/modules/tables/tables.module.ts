import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TableEntity } from '../../entities/table.entity';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { ReservationEntity } from '../../entities/reservation.entity';
import { WsModule } from '../ws/ws.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TableEntity, ReservationEntity]),
    WsModule,
    SettingsModule,
  ],
  providers: [TablesService],
  controllers: [TablesController],
  exports: [TablesService],
})
export class TablesModule {}

