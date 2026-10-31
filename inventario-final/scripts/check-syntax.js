const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const directories = ['src', 'public', 'scripts', 'tests'];
let checked = 0;

function inspect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) inspect(filename);
    if (entry.isFile() && filename.endsWith('.js')) {
      const result = spawnSync(process.execPath, ['--check', filename], { encoding: 'utf8' });
      if (result.status !== 0) {
        process.stderr.write(result.stderr);
        process.exitCode = 1;
      }
      checked++;
    }
  }
}

for (const directory of directories) inspect(path.join(root, directory));
console.log(`Sintaxis revisada en ${checked} archivos JavaScript.`);
