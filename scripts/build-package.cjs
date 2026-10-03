#!/usr/bin/env node
const { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, cpSync } = require('node:fs');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const internalFiles = ['runtime.js', 'client.js', 'compiler.js', 'parser.js', 'security.js', 'validateCssSyntax.js'];
const topLevelGeneratedFiles = ['build.cjs'];
const generatedBanner = '// Generated from core/. Edit core files, then run node scripts/build-package.cjs.\n';

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function writeIfChanged(target, content) {
  if (!existsSync(target) || readFileSync(target, 'utf8') !== content) writeFileSync(target, content);
}

function buildSharedConfig() {
  const configPath = join(root, 'profiles', 'shared', 'config');
  const runtime = JSON.parse(readFileSync(join(configPath, 'runtime.json'), 'utf8'));
  const groupNames = JSON.parse(readFileSync(join(configPath, 'groups.json'), 'utf8'));
  return { ...runtime, groups: groupNames };
}

function buildProfile(profileName) {
  const profile = JSON.parse(read(`profiles/${profileName}.json`));
  const substitutions = {
    '__DATA_CSS_RUNTIME_NAME__': profile.runtimeName,
    '__DATA_CSS_DEFAULT_ASSET_BASE__': profile.defaultAssetBaseCode,
    '__DATA_CSS_CLIENT_DEFAULT_ASSET_BASE__': profile.clientDefaultAssetBaseCode,
    '__DATA_CSS_INTERNAL_PATH__': './internal',
  };
  const outputPath = join(root, profile.outputDir);
  const sourcePath = join(root, 'templates', profileName);
  // Prefer a clean output. If Windows keeps a directory handle open (for
  // example, an editor preview), fall back to an in-place generation so a
  // harmless transient lock cannot block the whole build.
  if (existsSync(outputPath)) {
    try {
      rmSync(outputPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
    } catch (error) {
      if (!['EBUSY', 'EPERM'].includes(error?.code)) throw error;
      process.stderr.write(`Keeping locked output directory and rebuilding in place: ${profile.outputDir}\n`);
    }
  }
  mkdirSync(outputPath, { recursive: true });
  for (const fileName of ['package.json', 'index.js', 'index.d.ts', 'copy-assets.cjs', 'README.md']) {
    const sourceFile = join(sourcePath, fileName);
    if (existsSync(sourceFile)) cpSync(sourceFile, join(outputPath, fileName));
  }
  // Every package starts from the same default assets. A profile may add files
  // or replace individual assets later without forking the whole asset tree.
  const sharedAssetsPath = join(root, 'profiles', 'shared', 'assets');
  const profileAssetsPath = join(root, 'profiles', profileName, 'assets');
  const sharedGroupsPath = join(root, 'profiles', 'shared', 'config', 'groups');
  const profileGroupsPath = join(root, 'profiles', profileName, 'config', 'groups');
  cpSync(sharedAssetsPath, join(outputPath, 'assets'), { recursive: true });
  if (existsSync(profileAssetsPath)) {
    cpSync(profileAssetsPath, join(outputPath, 'assets'), { recursive: true, force: true });
  }
  cpSync(sharedGroupsPath, join(outputPath, 'assets', 'groups'), { recursive: true });
  if (existsSync(profileGroupsPath)) {
    cpSync(profileGroupsPath, join(outputPath, 'assets', 'groups'), { recursive: true, force: true });
  }
  // Ship a compact config for the browser; copy-assets expands it again for
  // application authors who want to customize their public configuration.
  writeIfChanged(join(outputPath, 'assets', 'config.json'), JSON.stringify(buildSharedConfig()));
  if (profileName === 'react') {
    for (const fileName of ['react.js', 'react.d.ts']) cpSync(join(sourcePath, fileName), join(outputPath, fileName));
  }
  mkdirSync(join(outputPath, 'internal'), { recursive: true });
  for (const fileName of [...internalFiles, ...topLevelGeneratedFiles]) {
    let content = read(`core/${fileName === 'runtime.js' || fileName === 'client.js' ? `${fileName}.template` : fileName}`);
    for (const [token, value] of Object.entries(substitutions)) content = content.replaceAll(token, value);
    const generatedContent = content.startsWith('#!')
      ? `${content.slice(0, content.indexOf('\n') + 1)}${generatedBanner}${content.slice(content.indexOf('\n') + 1)}`
      : `${generatedBanner}${content}`;
    const targetPath = internalFiles.includes(fileName)
      ? join(outputPath, 'internal', fileName)
      : join(outputPath, fileName);
    writeIfChanged(targetPath, generatedContent);
  }
  process.stdout.write(`Built ${profileName} from core to ${profile.outputDir}.\n`);
}

const target = process.argv[2] || 'all';
if (target === 'all') ['js', 'react'].forEach(buildProfile);
else if (target === 'js' || target === 'react') buildProfile(target);
else {
  process.stderr.write('Usage: node scripts/build-package.cjs <js|react|all>\n');
  process.exitCode = 1;
}
