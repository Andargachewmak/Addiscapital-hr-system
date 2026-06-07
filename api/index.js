// Vercel serverless entry. All /api/* requests are rewritten here (see vercel.json)
// and handled by the Express app. The app (and its DB) is created once per warm
// instance and reused across invocations.
const { createApp } = require('../server/app')

let appPromise
module.exports = async (req, res) => {
  if (!appPromise) appPromise = createApp()
  const app = await appPromise
  return app(req, res)
}
