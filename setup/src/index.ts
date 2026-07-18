import { config as loadEnv } from 'dotenv';
import { createSetupApp } from './app.js';
import { isDemoEnvironment } from './env.js';

loadEnv();

if (!isDemoEnvironment()) {
  // eslint-disable-next-line no-console
  console.error(
    'Refusing to start: DB_STRING is set, so this environment is already in production. ' +
      'The setup tool is only for the demo→production cutover (docs/ASSUMPTIONS.md §13).',
  );
  process.exit(1);
}

const port = Number(process.env.SETUP_PORT ?? 4100);
const app = createSetupApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `Onboarding Diary setup tool listening on :${port}. ` +
      'Run this only during the demo→production cutover, then stop it.',
  );
});
