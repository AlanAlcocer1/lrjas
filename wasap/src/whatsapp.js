import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import wweb from 'whatsapp-web.js';

const { Client, LocalAuth } = wweb;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function resolveBrowserPath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const candidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  return candidates.find((p) => p && fs.existsSync(p));
}

/** Canal LRJAS (puede sobreescribirse con CHANNEL_ID en env). */
const DEFAULT_CHANNEL_ID = '120363360115210117@newsletter';

export function getChannelId() {
  return process.env.CHANNEL_ID?.trim() || DEFAULT_CHANNEL_ID;
}

function getAuthPath() {
  return (
    process.env.WWEBJS_AUTH_PATH?.trim() ||
    path.join(projectRoot, '.wwebjs_auth')
  );
}

/**
 * Coolify/redeploy cambia el container id; Chromium deja Singleton* del host viejo
 * y Puppeteer muere con Code 21 / "Can't open display".
 * No borra la sesión (LocalAuth); solo los locks.
 */
export function clearChromiumProfileLocks(authPath = getAuthPath()) {
  if (!fs.existsSync(authPath)) return;

  const lockNames = new Set([
    'SingletonLock',
    'SingletonCookie',
    'SingletonSocket',
  ]);

  const walk = (dir) => {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full);
        continue;
      }
      if (!lockNames.has(ent.name)) continue;
      try {
        fs.unlinkSync(full);
        console.log(`[wasap] lock removido: ${full}`);
      } catch (err) {
        console.warn(`[wasap] no se pudo borrar ${full}:`, err.message || err);
      }
    }
  };

  walk(authPath);
}

function isProfileLockError(err) {
  const msg = String(err?.message || err || '');
  return (
    msg.includes('Code: 21') ||
    msg.includes('profile appears to be in use') ||
    msg.includes("Can't open display") ||
    msg.includes('SingletonLock')
  );
}

export function createClient() {
  const executablePath = resolveBrowserPath();
  if (!executablePath) {
    throw new Error(
      'No se encontró Chrome/Chromium. Define CHROME_PATH o instala el navegador.',
    );
  }

  const authPath = getAuthPath();
  clearChromiumProfileLocks(authPath);

  return new Client({
    authStrategy: new LocalAuth({ dataPath: authPath }),
    puppeteer: {
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--headless=new',
      ],
    },
  });
}

/**
 * Estado compartido de la sesión WhatsApp (para el HTTP API).
 */
export function createSession() {
  const state = {
    client: null,
    connected: false,
    qr: null,
    lastError: null,
    readyPromise: null,
  };

  async function destroyClientQuiet() {
    const client = state.client;
    state.client = null;
    state.connected = false;
    state.readyPromise = null;
    if (!client) return;
    try {
      await client.destroy();
    } catch {
      /* ignore */
    }
  }

  function attachHandlers(client, resolve, reject) {
    client.on('qr', (qr) => {
      state.qr = qr;
      state.connected = false;
      state.lastError = null;
      console.log('[wasap] QR listo para escanear (GET /qr)');
    });

    client.on('authenticated', () => {
      console.log('[wasap] Autenticado. Guardando sesión…');
    });

    client.on('auth_failure', (msg) => {
      state.connected = false;
      state.lastError = `Fallo de autenticación: ${msg}`;
      console.error('[wasap]', state.lastError);
    });

    client.on('ready', async () => {
      try {
        await client.pupPage.evaluate(() => {
          const MsgClass = window.require('WAWebCollections').Msg.modelClass;
          if (typeof MsgClass.prototype.avParams === 'function') return;
          MsgClass.prototype.avParams = function avParams() {
            return window.require('WAWebMediaMetadata').mediaMetadata(this);
          };
        });
      } catch (err) {
        console.warn('[wasap] polyfill avParams:', err.message || err);
      }

      state.connected = true;
      state.qr = null;
      state.lastError = null;
      console.log('[wasap] WhatsApp listo.');
      resolve(client);
    });

    client.on('disconnected', (reason) => {
      state.connected = false;
      state.lastError = `Desconectado: ${reason}`;
      state.readyPromise = null;
      console.warn('[wasap]', state.lastError);
    });
  }

  function startOnce() {
    return new Promise((resolve, reject) => {
      let client;
      try {
        client = createClient();
      } catch (err) {
        state.lastError = err.message || String(err);
        state.readyPromise = null;
        reject(err);
        return;
      }

      state.client = client;
      attachHandlers(client, resolve, reject);

      client.initialize().catch((err) => {
        state.lastError = err.message || String(err);
        state.readyPromise = null;
        reject(err);
      });
    });
  }

  function start() {
    if (state.readyPromise) return state.readyPromise;

    state.readyPromise = (async () => {
      try {
        return await startOnce();
      } catch (err) {
        if (!isProfileLockError(err)) throw err;

        console.warn(
          '[wasap] lock de Chromium detectado; limpiando e reintentando…',
        );
        await destroyClientQuiet();
        clearChromiumProfileLocks();
        await new Promise((r) => setTimeout(r, 800));
        state.readyPromise = null;
        state.readyPromise = startOnce();
        return state.readyPromise;
      }
    })();

    state.readyPromise = state.readyPromise.catch((err) => {
      state.readyPromise = null;
      throw err;
    });

    return state.readyPromise;
  }

  /** Fuerza reinicio del cliente (limpia locks). Útil tras redeploy Coolify. */
  async function reconnect() {
    await destroyClientQuiet();
    clearChromiumProfileLocks();
    state.qr = null;
    state.lastError = null;
    return start();
  }

  async function sendToChannel(message) {
    const channelId = getChannelId();
    if (!channelId) {
      throw new Error('Falta CHANNEL_ID (debe terminar en @newsletter)');
    }
    if (!channelId.endsWith('@newsletter')) {
      throw new Error(
        `CHANNEL_ID inválido: ${channelId}. Debe terminar en @newsletter`,
      );
    }

    const client = await start();
    if (!state.connected) {
      throw new Error('WhatsApp aún no está conectado. Escanea el QR.');
    }

    const chat = await client.getChatById(channelId);
    if (chat && typeof chat.sendMessage === 'function') {
      return chat.sendMessage(message);
    }
    return client.sendMessage(channelId, message, { sendSeen: false });
  }

  return {
    state,
    start,
    reconnect,
    sendToChannel,
    getStatus: () => ({
      connected: state.connected,
      hasQr: Boolean(state.qr),
      lastError: state.lastError,
    }),
    getQr: () => state.qr,
  };
}
