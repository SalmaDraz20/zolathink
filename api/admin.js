'use strict';
const { createHandler } = require('../lib/server/admin.cjs');
let handler;
module.exports = (req, res) => { handler = handler || createHandler(); return handler(req, res); };
