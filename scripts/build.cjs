'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'dist');
fs.mkdirSync(destination, { recursive: true });
// Clear only obsolete top-level public assets after frontend file moves.
for (const file of fs.readdirSync(destination)) {
  if (/\.(html|css|js|svg|png)$/.test(file) && fs.statSync(path.join(destination,file)).isFile()) {
    fs.unlinkSync(path.join(destination,file));
  }
}
// Only frontend assets enter the public output. No env, API/server source, records,
// dependencies, or documentation is copied into the client deployment.
for (const file of fs.readdirSync(root)) {
  if (/\.(html|css|js|svg|png)$/.test(file) && fs.statSync(path.join(root, file)).isFile()) {
    fs.copyFileSync(path.join(root, file), path.join(destination, file));
  }
}
fs.cpSync(path.join(root, 'assets'), path.join(destination, 'assets'), { recursive: true });
console.log('Static frontend built in dist; API remains server-only.');
