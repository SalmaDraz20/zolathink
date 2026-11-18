'use strict';
const { createHandlers, fromEnv } = require('../lib/server/notion-cards.cjs');
let handlers;
module.exports = (req, res) => { handlers = handlers || createHandlers(fromEnv()); return handlers.card(req, res); };
