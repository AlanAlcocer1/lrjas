import { Html5Qrcode, type Html5QrcodeCameraScanConfig } from 'html5-qrcode';

const BACK_CAMERA_RE = /back|rear|environment|trasera|posterior|ultra\s*wide|wide\s*angle/i;
const FRONT_CAMERA_RE = /front|user|facing|frontal|selfie/i;
const noop = () => {};

/** iPhone/iPad (incl. iPadOS que reporta MacIntel). */
function isAppleTouchDevice() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Cuadro grande: en iOS Safari un qrbox chico + video cropeado hace que el QR
 * “se vea” en pantalla pero fuera de la región que html5-qrcode decodifica.
 */
const SCAN_CONFIG: Html5QrcodeCameraScanConfig = {
  fps: 15,
  aspectRatio: 1.333334,
  qrbox: (viewfinderWidth, viewfinderHeight) => {
    const edge = Math.min(viewfinderWidth, viewfinderHeight);
    const size = Math.max(Math.floor(edge * 0.88), 220);
    return {
      width: Math.min(size, viewfinderWidth),
      height: Math.min(size, viewfinderHeight),
    };
  },
};

function clearContainer(elementId: string) {
  const container = document.getElementById(elementId);
  if (container) container.innerHTML = '';
}

async function safeStop(scanner: Html5Qrcode) {
  try {
    if (scanner.isScanning) await scanner.stop();
  } catch {
    /* ignore */
  }
  try {
    scanner.clear();
  } catch {
    /* ignore */
  }
}

async function tryStart(
  scanner: Html5Qrcode,
  camera: string | MediaTrackConstraints,
  onScan: (decoded: string) => void,
) {
  await scanner.start(camera, SCAN_CONFIG, onScan, noop);
}

function pickBackCamera(
  cameras: { id: string; label: string }[],
): { id: string; label: string } | undefined {
  const labeledBack = cameras.find(({ label }) => BACK_CAMERA_RE.test(label));
  if (labeledBack) return labeledBack;

  const notFront = cameras.find(({ label }) => label && !FRONT_CAMERA_RE.test(label));
  if (notFront) return notFront;

  // En muchos Android/iOS la trasera no es la [0] (frontal). Preferir la última no-frontal.
  const fromEnd = [...cameras].reverse().find(({ label }) => !FRONT_CAMERA_RE.test(label));
  return fromEnd ?? cameras.at(-1) ?? cameras[0];
}

export async function startQrScanner(
  elementId: string,
  onScan: (decoded: string) => void,
): Promise<Html5Qrcode> {
  clearContainer(elementId);

  let lastError: unknown;
  const apple = isAppleTouchDevice();

  // Safari iOS: facingMode es más fiable que deviceId de getCameras().
  const constraintAttempts: MediaTrackConstraints[] = apple
    ? [
        { facingMode: { exact: 'environment' } },
        { facingMode: { ideal: 'environment' } },
        { facingMode: 'environment' },
        { facingMode: { ideal: 'user' } },
      ]
    : [
        { facingMode: { ideal: 'environment' } },
        { facingMode: 'user' },
      ];

  const attempts: Array<string | MediaTrackConstraints> = [...constraintAttempts];

  try {
    const cameras = await Html5Qrcode.getCameras();
    if (cameras.length) {
      const preferred = pickBackCamera(cameras);
      if (preferred) {
        // En iOS: facingMode primero; deviceId como respaldo.
        if (apple) attempts.push(preferred.id);
        else attempts.unshift(preferred.id);
      }
    }
  } catch (error) {
    lastError = error;
  }

  for (const camera of attempts) {
    clearContainer(elementId);
    const scanner = new Html5Qrcode(elementId);
    try {
      await tryStart(scanner, camera, onScan);
      return scanner;
    } catch (error) {
      lastError = error;
      await safeStop(scanner);
    }
  }

  clearContainer(elementId);
  throw lastError ?? new Error('No se pudo acceder a la cámara');
}

export function describeCameraError(error: unknown): string {
  if (!window.isSecureContext) {
    return 'La cámara requiere HTTPS. Abre el sitio con https://';
  }

  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (name === 'NotAllowedError' || message.includes('permission') || message.includes('denied')) {
    return 'Permiso de cámara denegado. Actívalo en ajustes del navegador.';
  }
  if (name === 'NotFoundError' || message.includes('not found') || message.includes('no camera')) {
    return 'No se encontró ninguna cámara en este dispositivo.';
  }
  if (name === 'NotReadableError' || message.includes('in use') || message.includes('could not start')) {
    return 'La cámara está en uso. Cierra otras apps que la usen e intenta de nuevo.';
  }
  if (name === 'OverconstrainedError' || message.includes('overconstrained')) {
    return 'No se pudo configurar la cámara. Intenta con otro navegador o dispositivo.';
  }

  return 'No se pudo iniciar la cámara. Pulsa Iniciar cámara e intenta de nuevo.';
}

export async function stopQrScanner(scanner: Html5Qrcode | null, elementId?: string) {
  if (scanner) await safeStop(scanner);
  if (elementId) clearContainer(elementId);
}
