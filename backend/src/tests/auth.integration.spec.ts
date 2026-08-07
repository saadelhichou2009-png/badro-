import request from 'supertest';
import { testApp } from './testApp';
import { prisma } from '../database/prisma';

/**
 * اختبار Integration حقيقي يحتاج قاعدة بيانات فعلية متصلة عبر DATABASE_URL
 * (يُفضَّل قاعدة اختبار منفصلة، مثال: trading_platform_test)
 * شغّله عبر: npm run test -- auth.integration
 */

const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'Str0ng@Pass123';

describe('Auth Flow (Integration)', () => {
  let accessToken: string;
  let refreshToken: string;

  afterAll(async () => {
    // تنظيف بيانات الاختبار من القاعدة
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.$disconnect();
  });

  it('POST /auth/register — ينشئ حساباً جديداً بنجاح', async () => {
    const res = await request(testApp).post('/api/v1/auth/register').send({
      firstName: 'Test',
      lastName: 'User',
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(TEST_EMAIL);
  });

  it('POST /auth/register — يرفض بريداً مكرراً بكود 409', async () => {
    const res = await request(testApp).post('/api/v1/auth/register').send({
      firstName: 'Test',
      lastName: 'User',
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('POST /auth/register — يرفض كلمة مرور ضعيفة بكود 422', async () => {
    const res = await request(testApp).post('/api/v1/auth/register').send({
      firstName: 'Test',
      lastName: 'User',
      email: `weak_${Date.now()}@example.com`,
      password: '12345678',
    });

    expect(res.status).toBe(422);
  });

  it('POST /auth/login — يسجّل الدخول بنجاح ويُعيد accessToken وrefreshToken', async () => {
    const res = await request(testApp).post('/api/v1/auth/login').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();

    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('POST /auth/login — يرفض كلمة مرور خاطئة بكود 401', async () => {
    const res = await request(testApp).post('/api/v1/auth/login').send({
      email: TEST_EMAIL,
      password: 'WrongPassword@123',
    });

    expect(res.status).toBe(401);
  });

  it('GET /auth/me — يرفض الطلب بدون توكن بكود 401', async () => {
    const res = await request(testApp).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /auth/me — يعيد بيانات المستخدم مع توكن صالح', async () => {
    const res = await request(testApp)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(TEST_EMAIL);
  });

  it('POST /auth/refresh — يجدد accessToken باستخدام refreshToken صالح', async () => {
    const res = await request(testApp).post('/api/v1/auth/refresh').send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('POST /auth/logout — يُبطل الجلسة، ومحاولة استخدامها لاحقاً في refresh تفشل', async () => {
    const logoutRes = await request(testApp).post('/api/v1/auth/logout').send({ refreshToken });
    expect(logoutRes.status).toBe(200);

    const refreshRes = await request(testApp).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });
});
