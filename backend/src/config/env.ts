import dotenv from 'dotenv';
dotenv.config();

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '4000', 10),

  DATABASE_URL: required('DATABASE_URL'),

  REDIS_URL: process.env.REDIS_URL ?? '', // مثال Upstash: rediss://default:xxxx@region.upstash.io:6379
  REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD ?? '',

  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY ?? '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY ?? '30d',

  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),

  APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
  API_URL: process.env.API_URL ?? 'http://localhost:4000',
  CORS_ORIGINS: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),

  SMTP_HOST: process.env.SMTP_HOST ?? '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT ?? '587', 10),
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD ?? '',
  SMTP_FROM: process.env.SMTP_FROM ?? 'no-reply@tradingplatform.local',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),

  EA_INGEST_RATE_LIMIT_MAX: parseInt(process.env.EA_INGEST_RATE_LIMIT_MAX ?? '30', 10),

  API_KEY_SECRET: required('API_KEY_SECRET'),
};
