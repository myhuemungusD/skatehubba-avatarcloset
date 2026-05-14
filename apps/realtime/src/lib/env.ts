import { z } from 'zod';

const schema = z.object({
  REALTIME_PORT: z
    .string()
    .default('2567')
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(65535)),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

export const env = schema.parse(process.env);
export type Env = typeof env;
