import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { env } from './config';
import { HttpError } from './errors';
import { adminRoutes } from './routes/admin';
import { citizenRoutes } from './routes/citizen';
import { publicRoutes } from './routes/public';

/** Fits a 3 MB image once base64 encoded, plus the report's text fields. */
const BODY_LIMIT_BYTES = 6 * 1024 * 1024;

export async function buildApp() {
  const app = Fastify({
    trustProxy: true,
    bodyLimit: BODY_LIMIT_BYTES,
    logger: env.NODE_ENV === 'test' ? false : { redact: ['req.headers.authorization'] },
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Client-Platform'],
    methods: ['GET', 'POST', 'OPTIONS'],
  });
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      return reply.code(400).send({
        code: 'invalid_input',
        message: issue ? `${issue.path.join('.') || 'body'}: ${issue.message}` : 'Invalid input',
      });
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

  return app;
}
