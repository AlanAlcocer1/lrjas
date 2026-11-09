import 'dotenv/config';
import express from 'express';
import QRCode from 'qrcode';
import { createSession } from './whatsapp.js';

const PORT = Number(process.env.PORT || 3100);
const TOKEN = process.env.WASAP_INTERNAL_TOKEN?.trim() || '';

if (!TOKEN) {
  console.error('Falta WASAP_INTERNAL_TOKEN en el entorno.');
  process.exit(1);
}

const session = createSession();
const app = express();
app.use(express.json({ limit: '100kb' }));

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const queryToken = typeof req.query.token === 'string' ? req.query.token : '';
  if (bearer !== TOKEN && queryToken !== TOKEN) {
    return res.status(401).json({ message: 'No autorizado' });
  }
  return next();
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/status', auth, (_req, res) => {
  res.json(session.getStatus());
});

app.get('/qr', auth, async (_req, res) => {
  const qr = session.getQr();
  if (!qr) {
    return res.json({ qr: null, dataUrl: null });
  }
  try {
    const dataUrl = await QRCode.toDataURL(qr, {
      margin: 2,
      width: 320,
      errorCorrectionLevel: 'M',
    });
    return res.json({ qr, dataUrl });
  } catch (err) {
    return res.status(500).json({ message: err.message || String(err) });
  }
});

app.post('/send', auth, async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) {
    return res.status(400).json({ message: 'Falta message' });
  }
  try {
    await session.sendToChannel(message);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(503).json({ message: err.message || String(err) });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`lrjas-wasap listening on 0.0.0.0:${PORT}`);
  session.start().catch((err) => {
    console.error('[wasap] init error:', err.message || err);
  });
});
