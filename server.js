// Local-dev entry point. All Express logic lives in api/proxy/app.js so
// it's shared with the SWA Managed Function at api/proxy/index.js.
//
// Run with:   node server.js           (picks up .env via dotenv)
// Or:         npm run dev              (concurrent with React dev server)
//
// In Azure the Managed Function is the live entry point — this file is
// never invoked there.

try { require('dotenv').config(); } catch { /* dotenv optional */ }

// Fail fast in dev if .env is missing critical vars — saves chasing
// 503s later. In production (Azure Managed Function), the same check
// lives inside api/proxy/app.js as a runtime 503 so the Function
// worker doesn't crash-loop.
const missingCore = [];
if (!process.env.JWT_SECRET) missingCore.push('JWT_SECRET');
if (!process.env.USERS)      missingCore.push('USERS');
if (!process.env.API_HOST)   missingCore.push('API_HOST');
if (missingCore.length) {
  console.error(`❌ Missing critical env vars in .env: ${missingCore.join(', ')}`);
  console.error('   Generate a JWT secret:');
  console.error('     node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  process.exit(1);
}

const app = require('./api/proxy/app');
const PORT = process.env.PORT || process.env.PROXY_PORT || 4000;

app.listen(PORT, () => {
  console.log(`\n🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`   Host  : ${process.env.API_HOST}`);
  console.log(`   Auth  : stateless JWT (expires in ${process.env.JWT_EXPIRES_IN || '8h'})\n`);
});

module.exports = app;
