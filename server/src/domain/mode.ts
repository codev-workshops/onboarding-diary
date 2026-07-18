/**
 * The `Setting` row that latches a database into production mode. Written once by
 * the one-off setup tool during the demo→production cutover, and read (never
 * written) by the server's startup guards. Kept here as the single source of
 * truth shared by both (docs/ASSUMPTIONS.md §13).
 */
export const MODE_SETTING_KEY = 'mode';
export const PRODUCTION_MODE_VALUE = 'production';
