import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'settings' })
export class SettingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 10 })
  openHour!: string;

  @Column({ type: 'varchar', length: 10 })
  closeHour!: string;

  @Column({ type: 'varchar', length: 60 })
  timezone!: string;

  @Column({ type: 'int', default: 60 })
  slotMinutes!: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  closedWeekdays!: number[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

