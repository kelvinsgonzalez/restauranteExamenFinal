import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect, jest } from '@jest/globals';
import { ReservationsController } from '../src/modules/reservations/reservations.controller.js';
import { ReservationsService } from '../src/modules/reservations/reservations.service.js';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard.js';

describe('ReservationsController (e2e)', () => {
  let app: INestApplication;
  const reservationsService = {
    findAll: jest.fn().mockResolvedValue([]),
    today: jest.fn().mockResolvedValue([]),
    create: jest
      .fn()
      .mockResolvedValue({ id: '1', tableId: 't1', customerId: 'c1' }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        { provide: ReservationsService, useValue: reservationsService },
        { provide: JwtAuthGuard, useValue: { canActivate: () => true } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('/reservations (GET)', async () => {
    await request(app.getHttpServer()).get('/reservations').expect(200);
    expect(reservationsService.findAll).toHaveBeenCalled();
  });

  it('/reservations (POST)', async () => {
    await request(app.getHttpServer())
      .post('/reservations')
      .send({
        customerId: 'c1',
        tableId: 't1',
        people: 2,
        startsAt: new Date().toISOString(),
      })
      .expect(201);
    expect(reservationsService.create).toHaveBeenCalled();
  });

  afterAll(async () => {
    await app.close();
  });
});
