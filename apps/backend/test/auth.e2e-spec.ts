import { Test } from '@nestjs/testing';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { describe, it, beforeAll, afterAll, expect, jest } from '@jest/globals';
import { AuthController } from '../src/modules/auth/auth.controller.js';
import { AuthService } from '../src/modules/auth/auth.service.js';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const authService = {
    login: jest.fn().mockResolvedValue({
      token: 'test',
      user: { sub: '1', email: 'chef@restaurante.com', role: 'ADMIN' },
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('/auth/login (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'chef@restaurante.com', password: 'Chef2024!' })
      .expect(201);
    expect(response.body.token).toEqual('test');
  });

  afterAll(async () => {
    await app.close();
  });
});
