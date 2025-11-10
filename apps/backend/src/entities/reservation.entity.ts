import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerEntity } from './customer.entity';
import { TableEntity } from './table.entity';
import { ReservationStatus } from '../common/enums/reservation-status.enum';

@Entity({ name: 'reservations' })
@Index(['tableId', 'startsAt'], { unique: true })
@Index(['startsAt'])
@Index(['tableId'])
@Check(`\"endsAt\" > \"startsAt\"`)
export class ReservationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  customerId!: string;

  @Column({ type: 'uuid' })
  tableId!: string;

  @Column({ type: 'int' })
  people!: number;

  @Column({ type: 'timestamptz' })
  startsAt!: Date;

  @Column({ type: 'timestamptz' })
  endsAt!: Date;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status!: ReservationStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @ManyToOne(() => CustomerEntity, (customer) => customer.reservations, {
    eager: false,
  })
  @JoinColumn({ name: 'customerId' })
  customer!: CustomerEntity;

  @ManyToOne(() => TableEntity, { eager: false })
  @JoinColumn({ name: 'tableId' })
  table!: TableEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

