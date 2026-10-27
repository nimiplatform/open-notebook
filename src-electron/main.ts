import path from 'node:path';
import { startNotebookRenderer } from './next-server.js';
import { NotebookWorker } from './notebook-worker.js';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, session, shell, webContents } from 'electron';
import { configureNimiElectronAppHostProfile } from '@nimiplatform/kit/shell/electron/host-profile';

declare const __NIMI_ELECTRON_PRODUCTION__: boolean;

// Bind user data, session data and temp to the Host profile Nimi Desktop
// prepared under the selected data root, before any session or window and
// before the rest of Kit loads: a module that failed to load first would
// leave Electron on its default paths in the OS user's profile.
try {
  configureNimiElectronAppHostProfile(app);
} catch (error) {
  process.stderr.write(`[nimi-app-host-profile] ${error instanceof Error ? error.message : String(error)}\n`);
  app.exit(78);
  throw error;
}

const {
  isAllowedElectronRendererUrl,
  registerNimiElectronAppAssetProtocolScheme,
  registerNimiElectronAppBridge,
} = await import('@nimiplatform/kit/shell/electron/main');

const APP_ID = 'io.github.nimiplatform.open-notebook';
const NATIVE_BUNDLE_IDENTIFIER = "ai.nimi.apps.io.github.nimiplatform.open-notebook";
const IS_PRODUCTION_BUNDLE = typeof __NIMI_ELECTRON_PRODUCTION__ !== 'undefined'
  && __NIMI_ELECTRON_PRODUCTION__;
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(currentDir, '..');
// Native presentation is separate from metadata.icon artwork shown in Nimi Home.
const nativeAppIconPath = path.join(appRoot, 'assets', 'native', process.platform === 'win32' ? 'windows.ico' : process.platform === 'darwin' ? 'macos.png' : 'app.png');
const preloadPath = path.join(currentDir, 'preload.cjs');
let stopRenderer: (() => void) | null = null;
const developmentRendererUrl = readDevelopmentRendererUrl();
let rendererUrl = developmentRendererUrl;
const allowedRendererUrls: string[] = [];
let worker: NotebookWorker | null = null;
let starting: Promise<{ apiUrl: string }> | null = null;
let resettingRenderer = false;
let quitting = false;

app.setName("Open Notebook");
app.setAppUserModelId(NATIVE_BUNDLE_IDENTIFIER);
Menu.setApplicationMenu(null);
registerNimiElectronAppAssetProtocolScheme(protocol);

void app.whenReady().then(async () => {
  if (process.platform === 'darwin' && !app.isPackaged) app.dock?.setIcon(nativeAppIconPath);
  if (!rendererUrl) {
    const renderer = await startNotebookRenderer(path.join(process.resourcesPath, 'notebook-renderer', 'frontend'));
    rendererUrl = renderer.url;
    stopRenderer = renderer.stop;
  }
  allowedRendererUrls.push(rendererUrl);
  const bridge = registerNimiElectronAppBridge({
    appId: APP_ID,
    allowedRendererUrls,
    assetMediaPlatform: { protocol, webRequest: session.defaultSession.webRequest, webContents },
    ipcMain,
    appCommandHandlers: {
      'notebook.workspace': async ({ payload }) => {
        if (Object.keys(payload).length) throw new Error('Notebook workspace takes no identity or path input');
        if (worker?.controller.signal.aborted) { worker = null; starting = null; }
        if (!starting) {
          const candidate = new NotebookWorker(bridge.services, appRoot, path.join(app.getPath('appData'), 'Open Notebook — Nimi'), new URL(rendererUrl).origin, app.isPackaged);
          worker = candidate;
          starting = candidate.start().catch(error => {
            candidate.stop();
            if (worker === candidate) { worker = null; starting = null; }
            throw error;
          });
        }
        return starting;
      },
    },
    onSessionInvalidated: () => { worker?.stop(); worker = null; starting = null; resetAccountScopedRenderer(); },
  });
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };
    if (worker && !worker.controller.signal.aborted && details.url.startsWith(worker.apiUrl + '/')
      && details.frame && isAllowedElectronRendererUrl(details.frame.url, allowedRendererUrls)
      && BrowserWindow.getAllWindows().some(window => window.webContents.id === details.webContentsId)) {
      // Embedded source pages (for example YouTube) share the webContents but
      // must not receive access to the notebook's private HTTP transport.
      headers['X-Notebook-Process'] = worker.token;
    }
    callback({ requestHeaders: headers });
  });
  await createMainWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createMainWindow();
  });
}).catch((error: unknown) => {
  worker?.stop();
  stopRenderer?.();
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[notebook-startup] ${message}\n`);
  dialog.showErrorBox('Open Notebook could not start', message);
  app.exit(1);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !resettingRenderer && BrowserWindow.getAllWindows().length === 0) app.quit();
});
app.on('before-quit', () => { quitting = true; worker?.stop(); stopRenderer?.(); });

// A revoked/account-changed scope must not leave renderer timers or queued
// promises alive to use the rebound Host. This does not run on normal renewal.
function resetAccountScopedRenderer(): void {
  const windows = BrowserWindow.getAllWindows();
  if (quitting || windows.length === 0) return;
  resettingRenderer = true;
  try {
    for (const window of windows) window.destroy();
    void createMainWindow().catch((error: unknown) => {
      process.stderr.write(`[nimi-app-session-reset] ${error instanceof Error ? error.message : String(error)}\n`);
    });
  } finally { resettingRenderer = false; }
}

async function createMainWindow(): Promise<void> {
  const window = new BrowserWindow({
    icon: nativeAppIconPath,
    width: 1180,
    height: 780,
    minWidth: 360,
    minHeight: 560,
    title: "Open Notebook",
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    const target = new URL(url);
    if (['http:', 'https:'].includes(target.protocol) && !target.username && !target.password
      && !isAllowedElectronRendererUrl(url, allowedRendererUrls)) {
      // Source links belong in the system browser. Keep the protected App
      // renderer on its own origin, as in the draw.io desktop adaptation.
      void shell.openExternal(target.href).catch(error => {
        process.stderr.write(`[notebook-source-link] ${String(error)}\n`);
      });
    }
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedElectronRendererUrl(url, allowedRendererUrls)) event.preventDefault();
  });
  try {
    await window.loadURL(rendererUrl);
  } catch (error) {
    if (!window.isDestroyed()) throw error;
  }
}

function readDevelopmentRendererUrl(): string {
  const flag = '--nimi-dev-renderer-url';
  const prefix = '--nimi-dev-renderer-url=';
  const hasDevelopmentRendererArgument = process.argv.some((value) => value === flag || value.startsWith(prefix));
  if (IS_PRODUCTION_BUNDLE && hasDevelopmentRendererArgument) {
    throw new Error('The production Electron bundle rejects --nimi-dev-renderer-url.');
  }
  if (process.argv.includes(flag)) throw new Error('Nimi development renderer URL is missing.');
  const values = process.argv.filter((value) => value.startsWith(prefix));
  if (values.length === 0) return '';
  if (values.length !== 1) throw new Error('Nimi development renderer URL must be singular.');
  const selected = values[0];
  if (!selected) throw new Error('Nimi development renderer URL is missing.');
  const raw = selected.slice(prefix.length);
  const parsed = new URL(raw);
  if (
    parsed.protocol !== 'http:'
    || !['127.0.0.1', 'localhost', '[::1]', '::1'].includes(parsed.hostname.toLowerCase())
    || !parsed.port
    || parsed.username
    || parsed.password
    || (parsed.pathname !== '/' && parsed.pathname !== '')
    || parsed.search
    || parsed.hash
  ) {
    throw new Error('Nimi development renderer URL must be exact loopback.');
  }
  return parsed.origin;
}

// Business workers share this Host lifetime.
