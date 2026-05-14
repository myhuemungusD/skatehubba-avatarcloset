import { z } from 'zod';

// Username regex is lowercase-only here. The DB column is citext with a
// matching ^[a-z0-9_]{3,24}$ CHECK and a belt-and-suspenders
// `username::text = lower(username::text)` CHECK (see
// 0005_constraint_hardening.sql), so both client validation and the
// database agree: only lowercase letters, digits, and underscores; 3–24
// chars; case-insensitive uniqueness. The form normalizes to lowercase
// before submit so users typing "FooBar" land as "foobar".
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
