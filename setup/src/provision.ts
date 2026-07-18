import bcrypt from 'bcryptjs';
import type { Db } from './db.js';
import { seedReferenceData } from './referenceData.js';
import { passwordPolicy } from '../../server/src/auth/passwordPolicy.js';
import { DEFAULT_TIMEZONE, isValidTimezone } from '../../server/src/domain/timezone.js';
import { MODE_SETTING_KEY, PRODUCTION_MODE_VALUE } from '../../server/src/domain/mode.js';

/** Must match the server's bcrypt cost so the admin can authenticate. */
const SALT_ROUNDS = 10;

export interface ProvisionInput {
  adminEmail: string;
  adminName: string;
  adminPassword: string;
  timezone?: string;
}

export interface ProvisionResult {
  categoriesCreated: number;
  adminCreated: boolean;
  adminEmail: string;
}

/**
 * Provisions a production database: seeds reference data, creates the first Admin
 * (only if none exists — an existing admin's password is never reset), and sets
 * the one-way `Setting.mode=production` latch (docs/ASSUMPTIONS.md §13, §16).
 *
 * Strictly additive and idempotent: it never deletes data, and re-running it is
 * safe. The caller must have applied the schema (migrations) first. Assumes `db`
 * targets the production datasource.
 */
export async function provisionProduction(db: Db, input: ProvisionInput): Promise<ProvisionResult> {
  const email = input.adminEmail.trim().toLowerCase();
  const name = input.adminName.trim();
  if (!email) throw new Error('Admin email is required');
  if (!name) throw new Error('Admin name is required');
  if (email.endsWith('@demo.local')) {
    throw new Error('The production admin must not use a demo (@demo.local) email');
  }

  const timezone = input.timezone?.trim() || DEFAULT_TIMEZONE;
  if (!isValidTimezone(timezone)) throw new Error(`Invalid IANA timezone: ${timezone}`);

  const policy = passwordPolicy.validate(input.adminPassword);
  if (!policy.valid) throw new Error(policy.errors.join(' '));

  const categoriesCreated = await seedReferenceData(db);

  let adminCreated = false;
  const existingAdmin = await db.user.findFirst({ where: { role: 'Admin' } });
  if (!existingAdmin) {
    const existingEmail = await db.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new Error(`A user with email ${email} already exists but is not an Admin`);
    }
    const passwordHash = await bcrypt.hash(input.adminPassword, SALT_ROUNDS);
    await db.user.create({
      data: { email, passwordHash, name, role: 'Admin', startDate: new Date(), timezone },
    });
    adminCreated = true;
  }

  await db.setting.upsert({
    where: { key: MODE_SETTING_KEY },
    create: { key: MODE_SETTING_KEY, value: PRODUCTION_MODE_VALUE },
    update: { value: PRODUCTION_MODE_VALUE },
  });

  return { categoriesCreated, adminCreated, adminEmail: email };
}
