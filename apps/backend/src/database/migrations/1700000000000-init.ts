import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitMigration1700000000000 implements MigrationInterface {
  name = 'InitMigration1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"`);

    await queryRunner.query(`
      CREATE TABLE \"tables\" (
        \"id\" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        \"number\" int NOT NULL UNIQUE,
        \"capacity\" int NOT NULL,
        \"location\" varchar(100) NOT NULL,
        \"isActive\" boolean NOT NULL DEFAULT true,
        \"createdAt\" timestamptz NOT NULL DEFAULT now(),
        \"updatedAt\" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE \"customers\" (
        \"id\" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        \"fullName\" varchar(160) NOT NULL,
        \"email\" varchar(160),
        \"phone\" varchar(32),
        \"points\" int NOT NULL DEFAULT 0,
        \"createdAt\" timestamptz NOT NULL DEFAULT now(),
        \"updatedAt\" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX \"IDX_customers_email\" ON \"customers\" (\"email\") WHERE email IS NOT NULL`,
    );

    await queryRunner.query(`
      CREATE TYPE \"reservation_status_enum\" AS ENUM ('PENDING','CONFIRMED','CANCELLED','NOSHOW','DONE')
    `);

    await queryRunner.query(`
      CREATE TABLE \"reservations\" (
        \"id\" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        \"customerId\" uuid NOT NULL,
        \"tableId\" uuid NOT NULL,
        \"people\" int NOT NULL,
        \"startsAt\" timestamptz NOT NULL,
        \"endsAt\" timestamptz NOT NULL,
        \"status\" \"reservation_status_enum\" NOT NULL DEFAULT 'PENDING',
        \"notes\" text,
        \"createdAt\" timestamptz NOT NULL DEFAULT now(),
        \"updatedAt\" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT \"FK_reservations_customer\" FOREIGN KEY (\"customerId\") REFERENCES \"customers\"(\"id\") ON DELETE CASCADE,
        CONSTRAINT \"FK_reservations_table\" FOREIGN KEY (\"tableId\") REFERENCES \"tables\"(\"id\") ON DELETE CASCADE,
        CONSTRAINT \"CHK_reservation_time\" CHECK (\"endsAt\" > \"startsAt\"),
        CONSTRAINT \"UQ_table_slot\" UNIQUE (\"tableId\", \"startsAt\")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX \"IDX_reservations_startsAt\" ON \"reservations\" (\"startsAt\")`,
    );
    await queryRunner.query(
      `CREATE INDEX \"IDX_reservations_table\" ON \"reservations\" (\"tableId\")`,
    );

    await queryRunner.query(`
      CREATE TYPE \"users_role_enum\" AS ENUM ('ADMIN','STAFF')
    `);
    await queryRunner.query(`
      CREATE TABLE \"users\" (
        \"id\" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        \"email\" varchar(160) UNIQUE NOT NULL,
        \"passwordHash\" varchar(255) NOT NULL,
        \"role\" \"users_role_enum\" NOT NULL DEFAULT 'STAFF',
        \"createdAt\" timestamptz NOT NULL DEFAULT now(),
        \"updatedAt\" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE \"settings\" (
        \"id\" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        \"openHour\" varchar(10) NOT NULL,
        \"closeHour\" varchar(10) NOT NULL,
        \"timezone\" varchar(60) NOT NULL,
        \"slotMinutes\" int NOT NULL DEFAULT 60,
        \"closedWeekdays\" jsonb NOT NULL DEFAULT '[]',
        \"createdAt\" timestamptz NOT NULL DEFAULT now(),
        \"updatedAt\" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \"settings\"`);
    await queryRunner.query(`DROP TABLE \"users\"`);
    await queryRunner.query(`DROP TYPE \"users_role_enum\"`);
    await queryRunner.query(`DROP INDEX \"IDX_reservations_table\"`);
    await queryRunner.query(`DROP INDEX \"IDX_reservations_startsAt\"`);
    await queryRunner.query(`DROP TABLE \"reservations\"`);
    await queryRunner.query(`DROP TYPE \"reservation_status_enum\"`);
    await queryRunner.query(`DROP INDEX \"IDX_customers_email\"`);
    await queryRunner.query(`DROP TABLE \"customers\"`);
    await queryRunner.query(`DROP TABLE \"tables\"`);
  }
}

