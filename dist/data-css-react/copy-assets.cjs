const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'assets');

function copyAssets({ targetPath, cwd = process.cwd() } = {}) {
  // Default location used by the package runtime. This never alters the
  // package itself, including when it is installed under node_modules.
  const destinationDir = targetPath
    ? path.resolve(cwd, targetPath)
    : path.join(cwd, 'public', 'data-css-react');

  fs.mkdirSync(destinationDir, { recursive: true });
  const sourceConfigPath = path.join(sourceDir, 'config.json');
  fs.writeFileSync(
    path.join(destinationDir, 'config.json'),
    `${JSON.stringify(JSON.parse(fs.readFileSync(sourceConfigPath, 'utf8')), null, 2)}\n`,
  );
  for (const fileName of ['base.css']) {
    fs.copyFileSync(
      path.join(sourceDir, fileName),
      path.join(destinationDir, fileName),
    );
  }
  const overridesPath = path.join(sourceDir, 'overrides.css');
  if (fs.existsSync(overridesPath)) fs.copyFileSync(overridesPath, path.join(destinationDir, 'overrides.css'));
  fs.cpSync(path.join(sourceDir, 'groups'), path.join(destinationDir, 'groups'), { recursive: true });

  return destinationDir;
}

if (require.main === module) {
  const targetFlag = process.argv.indexOf('--target');
  const targetPath = targetFlag === -1 ? null : process.argv[targetFlag + 1];
  if (targetFlag !== -1 && !targetPath) {
    throw new Error('Missing path after --target');
  }

  console.log(`Copied data-css-react assets to ${copyAssets({ targetPath })}`);
}

module.exports = { copyAssets };
