import { mkdir, writeFile, chmod } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, '.nimi/local/bin');
await mkdir(folder, { recursive: true });
const target = process.platform === 'darwin' && process.arch === 'arm64' ? 'darwin-arm64' : process.platform === 'win32' && process.arch === 'x64' ? 'windows-amd64' : null;
if (!target) throw new Error('Notebook backend build supports macOS arm64 and Windows x64');
const version = '2.6.5';
const extension = target.startsWith('windows') ? 'exe' : 'tgz';
const digests = {
  'darwin-arm64': '71d031be990d59ed57e41e147fda7463660a2b449ae91868c83eb0888d07fade',
  'windows-amd64': 'dd9b6fa15edacbde96d490dd5727b49b5cf40df80f29074c7dc17acb974f509f',
};
const filename = `surreal-v${version}.${target}.${extension}`;
const url = `https://github.com/surrealdb/surrealdb/releases/download/v${version}/${filename}`;
const download = await fetch(url);
if (!download.ok) throw new Error(`SurrealDB download failed: ${download.status}`);
const bytes = Buffer.from(await download.arrayBuffer());
if (createHash('sha256').update(bytes).digest('hex') !== digests[target]) throw new Error('SurrealDB archive digest mismatch');
const archive = path.join(folder, filename);
await writeFile(archive, bytes);
if (extension === 'tgz') {
  const result = spawnSync('tar', ['-xzf', archive, '-C', folder], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Cannot extract SurrealDB');
} else await writeFile(path.join(folder, 'surreal.exe'), bytes);
const binary = path.join(folder, target.startsWith('windows') ? 'surreal.exe' : 'surreal');
await chmod(binary, 0o755);
const result = spawnSync(binary, ['version'], { encoding: 'utf8' });
if (result.status !== 0 || !result.stdout.startsWith(version + ' ')) throw new Error('Unexpected SurrealDB version');
await writeFile(path.join(folder, 'surreal-source.json'), JSON.stringify({ version, url, sha256: createHash('sha256').update(bytes).digest('hex') }, null, 2) + '\n');
console.log(result.stdout.trim());
