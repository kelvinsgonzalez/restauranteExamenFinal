import { AppDataSource } from './data-source';
import { TableEntity } from '../entities/table.entity';
import { UserEntity, UserRole } from '../entities/user.entity';
import { SettingEntity } from '../entities/setting.entity';
import bcrypt from 'bcryptjs';

async function seed() {
  await AppDataSource.initialize();
  const tableRepo = AppDataSource.getRepository(TableEntity);
  const userRepo = AppDataSource.getRepository(UserEntity);
  const settingRepo = AppDataSource.getRepository(SettingEntity);

  if ((await tableRepo.count()) === 0) {
    const tableData = [
      { number: 1, capacity: 2, location: 'salón' },
      { number: 2, capacity: 2, location: 'salón' },
      { number: 3, capacity: 4, location: 'salón' },
      { number: 4, capacity: 4, location: 'terraza' },
      { number: 5, capacity: 4, location: 'terraza' },
      { number: 6, capacity: 6, location: 'salón' },
      { number: 7, capacity: 6, location: 'privado' },
      { number: 8, capacity: 2, location: 'barra' },
      { number: 9, capacity: 4, location: 'salón' },
      { number: 10, capacity: 6, location: 'terraza' },
    ];
    await tableRepo.save(tableData.map((data) => tableRepo.create(data)));
    console.log('Seeded tables');
  }

  if ((await userRepo.count()) === 0) {
    const passwordHash = await bcrypt.hash('Admin123!', 10);
    const admin = userRepo.create({
      email: 'admin@demo.com',
      passwordHash,
      role: UserRole.ADMIN,
    });
    await userRepo.save(admin);
    console.log('Seeded admin user');
  }

  if ((await settingRepo.count()) === 0) {
    const settings = settingRepo.create({
      openHour: '10:00',
      closeHour: '22:00',
      timezone: 'America/Guatemala',
      slotMinutes: 60,
      closedWeekdays: [1],
    });
    await settingRepo.save(settings);
    console.log('Seeded default settings');
  }

  await AppDataSource.destroy();
}

seed()
  .then(() => {
    console.log('Seed completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
