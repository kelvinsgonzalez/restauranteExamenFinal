import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { ReservationEntity } from '../entities/reservation.entity';
import { TableEntity } from '../entities/table.entity';
import { CustomerEntity } from '../entities/customer.entity';
import { SettingEntity } from '../entities/setting.entity';
import { UserEntity } from '../entities/user.entity';

config({ path: '.env' });
const isProd = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url:
    process.env.DATABASE_URL ||
    `postgres://${process.env.POSTGRES_USER ?? 'postgres'}:${
      process.env.POSTGRES_PASSWORD ?? 'postgres'
    }@${process.env.POSTGRES_HOST ?? 'localhost'}:${
      process.env.POSTGRES_PORT ?? 5432
    }/${process.env.POSTGRES_DB ?? 'reservas'}`,
  entities: [
    ReservationEntity,
    TableEntity,
    CustomerEntity,
    SettingEntity,
    UserEntity,
  ],
  migrations: [
    isProd
      ? 'dist/database/migrations/*{.js,.ts}'
      : 'src/database/migrations/*{.ts,.js}',
  ],
  synchronize: false,
  logging: false,
});
