import { z } from 'zod';

// Public env: bundled into the browser. Validated at module import time so the
// app refuses to boot with a misconfigured Supabase URL or anon key.
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_REALTIME_URL: z.string().url().optional(),
});

const rawPublic = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_REALTIME_URL: process.env.NEXT_PUBLIC_REALTIME_URL,
};

export const publicEnv = publicSchema.parse(rawPublic);
export type PublicEnv = z.infer<typeof publicSchema>;
