import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Parche para enviar media a canales (@newsletter).
 * Reemplaza msg.avParams() por WAWebMediaMetadata.mediaMetadata(msg).
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(
  root,
  'node_modules',
  'whatsapp-web.js',
  'src',
  'util',
  'Injected',
  'Utils.js',
);

if (!fs.existsSync(target)) {
  console.warn('patch-wwebjs: no se encontró Utils.js (¿npm install?)');
  process.exit(0);
}

let src = fs.readFileSync(target, 'utf8');

const already =
  src.includes("require('WAWebMediaMetadata')") &&
  src.includes('.mediaMetadata(msg)') &&
  !src.includes('mediaMetadata: msg.avParams()');

if (already) {
  console.log('patch-wwebjs: ya aplicado');
  process.exit(0);
}

const needle = 'mediaMetadata: msg.avParams(),';
const replacement = `mediaMetadata: window
                                  .require('WAWebMediaMetadata')
                                  .mediaMetadata(msg),`;

if (!src.includes(needle)) {
  console.warn('patch-wwebjs: patrón no encontrado; la lib pudo cambiar');
  process.exit(0);
}

src = src.replace(needle, replacement);
fs.writeFileSync(target, src);
console.log('patch-wwebjs: parche aplicado (media a canales)');
