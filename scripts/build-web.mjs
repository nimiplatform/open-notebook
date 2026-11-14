import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { loadEnv } from 'vite';
import { readWebDevelopment } from '@nimiplatform/app-tools/web';
const root = process.cwd();
const flag = process.argv.indexOf('--realm');
const realm = flag >= 0 ? process.argv[flag + 1] : undefined;
const { config } = readWebDevelopment(parse(readFileSync('nimi.app.yaml', 'utf8')), { realm, env: { ...loadEnv('web', root, ''), ...process.env } });
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'build'], {
  cwd: `${root}/frontend`, windowsHide: true, stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_NIMI_WEB: '1', NEXT_PUBLIC_NIMI_WEB_CONFIG: JSON.stringify(config), NIMI_NEXT_DIST_DIR: '.next-web-build' },
});
child.once('exit', code => { process.exitCode = code ?? 1; });
