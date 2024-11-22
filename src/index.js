import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config as dotenvConfig } from 'dotenv';
import { router } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { config } from './config/index.js';

dotenvConfig();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api', router);

// Error handling
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`AUDIOMAX server running on port ${config.port}`);
});import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [new Integrations.BrowserTracing()],
  tracesSampleRate: 1.0,
});
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: 'your_application_id',
  clientToken: 'your_client_token',
  site: 'datadoghq.com',
  service:'maxaudio',
  env:'production',
  version: '1.0.0',
  sampleRate: 100,
  trackInteractions: true,
});
datadogRum.startSessionReplayRecording();
