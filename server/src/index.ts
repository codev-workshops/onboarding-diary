import { createApp } from './app.js';
import { config, activeDatasource } from './config/env.js';

const app = createApp();

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `Onboarding Diary API listening on :${config.port} (datasource: ${activeDatasource()}, demoMode: ${config.demoMode})`,
  );
});
