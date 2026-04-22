// SWA Managed Function entry point.
// Wraps the Express app defined in ./app.js so one HTTP-triggered Function
// handles every /api/* route. SWA strips the "/api" prefix before routing
// to the Function, so we prepend it here — Express's routes are defined
// with the full /api/... path to stay consistent with the local-dev flow
// where the browser also calls /api/*.

const { createHandler } = require('azure-function-express');
const app = require('./app');

const expressHandler = createHandler(app);

module.exports = function (context, req) {
  // SWA forwards /api/foo → Function sees "/foo". Re-add the prefix so
  // Express's /api/* route definitions match.
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/health')) {
    req.url = '/api' + req.url;
    if (req.originalUrl && !req.originalUrl.startsWith('/api')) {
      req.originalUrl = '/api' + req.originalUrl;
    }
  }
  return expressHandler(context, req);
};
