import { z } from 'zod';

// Public env: bundled into the browser. Validated lazily — Next 15.5+
// statically analyzes route handlers at build time and would trip eager
// `parse()` calls when the build environment doesn't have Supabase env
// set. The Proxy preserves the `publicEnv.X` access pattern while
// deferring validation until first runtime access on each lambda invocation.
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_REALTIME_URL: z.string().url().optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;

let cached: PublicEnv | undefined;

function load(): PublicEnv {
  if (cached) return cached;
  cached = publicSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_REALTIME_URL: process.env.NEXT_PUBLIC_REALTIME_URL,
  });
  return cached;
}

export const publicEnv = new Proxy({} as PublicEnv, {
  get(_, prop: string | symbol) {
    return load()[prop as keyof PublicEnv];
  },
}) as PublicEnv;
