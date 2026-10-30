import { existsSync } from 'node:fs';
import path from 'node:path';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { env } from './config';
import { HttpError } from './errors';
import { adminRoutes } from './routes/admin';
import { citizenRoutes } from './routes/citizen';
import { publicRoutes } from './routes/public';

/** Fits a 3 MB image once base64 encoded, plus the report's text fields. */
const BODY_LIMIT_BYTES = 6 * 1024 * 1024;

const SITE_DIR = path.resolve(import.meta.dirname, '../../web/dist');

export async function buildApp() {
  const app = Fastify({
    trustProxy: true,
    bodyLimit: BODY_LIMIT_BYTES,
    logger: env.NODE_ENV === 'test' ? false : { redact: ['req.headers.authorization'] },
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://maps.googleapis.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.googleapis.com', 'https://*.gstatic.com'],
        connectSrc: ["'self'", 'https://*.googleapis.com'],
        workerSrc: ["'self'", 'blob:'],
        mediaSrc: ["'self'", 'blob:'],
      },
    },
  });
  if (env.CORS_ORIGINS.length > 0) {
    await app.register(cors, {
      origin: env.CORS_ORIGINS,
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Client-Platform'],
      methods: ['GET', 'POST', 'OPTIONS'],
    });
  }
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ code: 'invalid_input', message: error.issues[0]?.message ?? 'Invalid input' });
    }
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({ code: error.code, message: error.message });
    }

    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode && statusCode < 500) {
      const message = error instanceof Error ? error.message : 'Bad request';
      return reply.code(statusCode).send({ code: 'bad_request', message });
    }

    request.log.error(error);
    return reply.code(500).send({ code: 'internal_error', message: 'Something went wrong. Please try again.' });
  });

  await app.register(publicRoutes);
  await app.register(citizenRoutes);
  await app.register(adminRoutes);

  // Serves the built website, so one service runs at one address.
  if (existsSync(SITE_DIR)) {
    await app.register(fastifyStatic, { root: SITE_DIR, wildcard: false });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/v1/')) return reply.code(404).send({ code: 'not_found', message: 'Not found' });
      return reply.sendFile('index.html');
    });
  }

  return app;
}
