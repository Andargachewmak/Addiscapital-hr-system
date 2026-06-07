// Local development entry point.
// On Vercel the app is served via api/index.js (serverless); this file is only used
// when running the API as a standalone Node server (npm start / npm run dev).
const { createApp } = require('./app')

const port = process.env.PORT || 4000
createApp()
  .then((app) => app.listen(port, () => console.log(`ACGF HR API on http://localhost:${port}/api`)))
  .catch((e) => { console.error(e); process.exit(1) })
