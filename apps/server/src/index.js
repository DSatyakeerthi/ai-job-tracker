import 'dotenv/config';

console.log("ADZUNA_APP_ID:", process.env.ADZUNA_APP_ID);
console.log("ADZUNA_APP_KEY exists:", !!process.env.ADZUNA_APP_KEY);
console.log("ADZUNA_COUNTRY:", process.env.ADZUNA_COUNTRY);

console.log('KEY LOADED:', !!process.env.OPENAI_API_KEY);

import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import { loginRoute } from './routes/auth.js';
import { resumeRoutes } from './routes/resumes.js';
import { jobsRoutes } from './routes/jobs.js';
import { applicationsRoutes } from './routes/applications.js';
import { assistantRoutes } from './routes/assistant.js';


const fastify = Fastify({
  logger: true,
});

// Register plugins
await fastify.register(cors, { origin: true });
await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register API routes with /api prefix
await fastify.register(loginRoute, { prefix: '/api' });
await fastify.register(resumeRoutes, { prefix: '/api' });
await fastify.register(jobsRoutes, { prefix: '/api' });
await fastify.register(applicationsRoutes, { prefix: '/api' });
// await fastify.register(assistantRoutes, { prefix: '/api' });

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('✓ Server running on http://localhost:3001');
    console.log('✓ Health check: http://localhost:3001/health');
    console.log('✓ API endpoints: http://localhost:3001/api/*');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
