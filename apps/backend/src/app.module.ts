import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TablesModule } from './modules/tables/tables.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ReportsModule } from './modules/reports/reports.module';
import { WsModule } from './modules/ws/ws.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ReservationEntity } from './entities/reservation.entity';
import { TableEntity } from './entities/table.entity';
import { CustomerEntity } from './entities/customer.entity';
import { SettingEntity } from './entities/setting.entity';
import { UserEntity } from './entities/user.entity';

const serveStatic =
  process.env.NODE_ENV === 'production'
    ? [
        ServeStaticModule.forRoot({
          rootPath: join(__dirname, '..', 'public'),
          exclude: ['/api*'],
        }),
      ]
    : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    ...serveStatic,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        host: config.get<string>('POSTGRES_HOST', 'localhost'),
        port: config.get<number>('POSTGRES_PORT', 5432),
        username: config.get<string>('POSTGRES_USER', 'postgres'),
        password: config.get<string>('POSTGRES_PASSWORD', 'postgres'),
        database: config.get<string>('POSTGRES_DB', 'reservas'),
        synchronize: false,
        logging: false,
        entities: [
          ReservationEntity,
          TableEntity,
          CustomerEntity,
          SettingEntity,
          UserEntity,
        ],
        ssl: config.get<string>('DATABASE_SSL', 'false') === 'true',
      }),
    }),
    AuthModule,
    UsersModule,
    TablesModule,
    CustomersModule,
    ReservationsModule,
    SettingsModule,
    ReportsModule,
    TasksModule,
    WsModule,
  ],
})
export class AppModule {}
