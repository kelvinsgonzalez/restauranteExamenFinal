import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingEntity } from '../../entities/setting.entity';
import { UpdateSettingDto } from './dto/update-setting.dto';

const DEFAULT_SETTINGS: Partial<SettingEntity> = {
  openHour: '10:00',
  closeHour: '22:00',
  timezone: 'America/Guatemala',
  slotMinutes: 60,
  closedWeekdays: [1],
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SettingEntity)
    private readonly repo: Repository<SettingEntity>,
  ) {}

  async getOrCreate() {
    let entity = await this.repo.findOne({ where: {} });
    if (!entity) {
      entity = this.repo.create(DEFAULT_SETTINGS);
      entity = await this.repo.save(entity);
    }
    return entity;
  }

  async update(dto: UpdateSettingDto) {
    const entity = await this.getOrCreate();
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }
}
