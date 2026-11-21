'use strict';
const { createHandler, fromEnv } = require('../lib/server/projects.cjs');
let handler;
module.exports = (req, res) => { handler = handler || createHandler(fromEnv()); return handler(req, res); };
