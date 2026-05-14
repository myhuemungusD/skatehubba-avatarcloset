import { randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_TEST_URL;
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const skipReason = 'requires SUPABASE_TEST_URL + SUPABASE_TEST_SERVICE_ROLE_KEY (staging Supabase)';

test.describe('auth golden path', () => {
  test.skip(!supabaseUrl || !serviceRoleKey, skipReason);

  test('admin-created user can sign in and lands on their closet', async ({ page }) => {
    // The skip guard above ensures these are set at runtime.
    const admin = createClient(supabaseUrl as string, serviceRoleKey as string, {
      auth: { persistSession: false },
    });

    // randomBytes (not Math.random) because this suffix lands in a security
    // context — passwords + auth-user emails. CodeQL flags Math.random here.
    const suffix = randomBytes(6).toString('hex');
    const email = `e2e_${suffix}@skatehubba.test`;
    const password = `kickflip_${suffix}_pw`;
    const username = `e2e_${suffix}`;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, display_name: username },
    });
    if (createError) throw createError;
    const userId = created.user?.id;
    if (!userId) throw new Error('admin.createUser returned no user');

    try {
      await page.goto('/auth/sign-in');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/\/closet\/.+/);
      await expect(page.getByRole('heading', { name: new RegExp(`@${username}`) })).toBeVisible();
    } finally {
      await admin.auth.admin.deleteUser(userId);
    }
  });
});
