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
 * Tras recrear el contenedor, Chromium deja SingletonLock del hostname viejo
 * y Puppeteer falla con "profile appears to be in use" / "Can't open display".
 */
export function clearChromiumProfileLocks(authPath = getAuthPath()) {
  const roots = [
    authPath,
    path.join(authPath, 'session'),
    path.join(authPath, 'session', 'Default'),
  ];
  const lockNames = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
  for (const root of roots) {
    for (const name of lockNames) {
      const file = path.join(root, name);
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          console.log(`[wasap] lock removido: ${file}`);
        }
      } catch (err) {
        console.warn(`[wasap] no se pudo borrar ${file}:`, err.message || err);
      }
    }
  }
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
        '--no-zygote',
        '--single-process',
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

  function start() {
    if (state.readyPromise) return state.readyPromise;

    state.readyPromise = new Promise((resolve, reject) => {
      let client;
      try {
        client = createClient();
      } catch (err) {
        state.lastError = err.message || String(err);
        reject(err);
        return;
      }

      state.client = client;

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

      client.initialize().catch((err) => {
        state.lastError = err.message || String(err);
        state.readyPromise = null;
        reject(err);
      });
    });

    return state.readyPromise;
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
    sendToChannel,
    getStatus: () => ({
      connected: state.connected,
      hasQr: Boolean(state.qr),
      lastError: state.lastError,
    }),
    getQr: () => state.qr,
  };
}
