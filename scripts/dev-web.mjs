import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { loadEnv, createServer, mergeConfig } from 'vite';
import { nimiWebViteConfig } from '@nimiplatform/app-tools/web';
const root = process.cwd();
const env = { ...loadEnv('web', root, ''), ...process.env };
const config = nimiWebViteConfig({ root, env, serve: true });
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '6087'], {
  cwd: `${root}/frontend`, windowsHide: true, stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_NIMI_WEB: '1', NEXT_PUBLIC_NIMI_WEB_CONFIG: config.define.__NIMI_APP_WEB_CONFIG__, NIMI_NEXT_DIST_DIR: '.next-web' },
});
const server = await createServer(mergeConfig(config, { configFile: false, appType: 'custom', server: { proxy: { '^/(?!api/(?:runtime-access/|auth/runtime-clients/))': { target: 'http://127.0.0.1:6087', ws: true } } } }));
await server.listen(); server.printUrls();
const stop = async () => { child.kill(); await server.close(); };
process.once('SIGINT', () => void stop()); process.once('SIGTERM', () => void stop());
child.once('exit', code => { void server.close(); process.exitCode = code ?? 1; });
