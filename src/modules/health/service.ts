import { prisma } from '@/src/shared/db/prisma';

/**
 * The probe query lives here rather than in the route so the boundary rule
 * ("no handler touches the database client") holds without an exemption. The
 * failure reason is logged, never returned (S14).
 */
export async function databaseIsUp(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Health check database probe failed', error);
    return false;
  }
}
