import 'server-only';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { env } from '@/lib/env';
import * as schema from '@/lib/schema';

const globalDatabase = globalThis as unknown as { edunetAdminPool?: Pool };

export const pool = globalDatabase.edunetAdminPool ?? new Pool({
  connectionString: env.databaseUrl,
  max: env.databasePoolMax,
  application_name: 'edunets-admin',
});

if (process.env.NODE_ENV !== 'production') globalDatabase.edunetAdminPool = pool;

pool.on('error', () => console.error('Unexpected idle database connection error.'));

export const db = drizzle(pool, { schema });
