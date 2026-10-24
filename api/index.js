// Vercel Function for the TNV API. vercel.json rewrites every /api/... request here;
// req.url keeps the original path, so the existing server routes it as it does locally.
module.exports = require('../server/server.js');
