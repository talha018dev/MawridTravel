import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import http from 'node:http';
import https from 'node:https';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.set('trust proxy', true);
const angularApp = new AngularNodeAppEngine();
const apiBaseUrl = process.env['API_BASE_URL'];

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy' });
});

if (apiBaseUrl) {
  const apiTarget = new URL(apiBaseUrl);
  const apiClient = apiTarget.protocol === 'https:' ? https : http;

  app.use('/api', (req, res) => {
    const targetUrl = new URL(req.originalUrl, apiTarget);
    const proxyRequest = apiClient.request(
      targetUrl,
      {
        method: req.method,
        headers: {
          ...req.headers,
          host: apiTarget.host,
          'x-forwarded-host': req.get('host') ?? '',
          'x-forwarded-proto': req.protocol,
        },
      },
      (proxyResponse) => {
        res.writeHead(proxyResponse.statusCode ?? 502, proxyResponse.headers);
        proxyResponse.pipe(res);
      },
    );

    proxyRequest.on('error', () => {
      if (res.headersSent) {
        res.destroy();
        return;
      }

      res.status(502).json({ error: 'The API service is unavailable.' });
    });

    req.pipe(proxyRequest);
  });
}

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
