import { z } from 'zod';

// Username regex is lowercase-only here. The form normalizes user input to
// lowercase before submit, and the DB column allows mixed case
// (^[a-zA-Z0-9_]{3,24}$) — so any legacy mixed-case rows still validate
// server-side. New signups go through this schema and land lowercased.
export const usernameRegex = /^[a-z0-9_]{3,24}$/;

export const signUpInput = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    username: z.string().regex(usernameRegex, {
      message: 'username must be 3–24 chars: a–z, 0–9, underscore',
    }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'passwords do not match',
  });

export type SignUpInput = z.infer<typeof signUpInput>;

export const signInInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type SignInInput = z.infer<typeof signInInput>;
