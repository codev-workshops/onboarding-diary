import { PrismaClient } from '@prisma/client';

/**
 * Shared PrismaClient instance for the SQLite (demo/default) datasource.
 * Services accept a `PrismaClient` so tests can inject an isolated client.
 */
export const prisma = new PrismaClient();

export type Db = PrismaClient;
