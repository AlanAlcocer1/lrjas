import { Html5Qrcode } from 'html5-qrcode';

const BACK_CAMERA_RE = /back|rear|environment|trasera|posterior|wide/i;
const SCAN_CONFIG = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
const noop = () => {};

async function pickCameraId(): Promise<string | undefined> {
  try {
    const cameras = await Html5Qrcode.getCameras();
    if (!cameras.length) return undefined;
    const back = cameras.find(({ label }) => BACK_CAMERA_RE.test(label));
    return back?.id ?? cameras.at(-1)?.id ?? cameras[0].id;
  } catch {
    return undefined;
  }
}

async function tryStart(
  scanner: Html5Qrcode,
  camera: string | MediaTrackConstraints,
  onScan: (decoded: string) => void,
) {
  await scanner.start(camera, SCAN_CONFIG, onScan, noop);
}

export async function startQrScanner(
  elementId: string,
  onScan: (decoded: string) => void,
): Promise<Html5Qrcode> {
  const scanner = new Html5Qrcode(elementId);
  let lastError: unknown;

  const cameraAttempts: (string | MediaTrackConstraints)[] = [
    { facingMode: { ideal: 'environment' } },
    { facingMode: 'user' },
  ];

  for (const camera of cameraAttempts) {
    try {
      await tryStart(scanner, camera, onScan);
      return scanner;
    } catch (error) {
      lastError = error;
      try {
        await scanner.stop();
      } catch {
        scanner.clear();
      }
    }
  }

  const cameraId = await pickCameraId();
  if (cameraId) {
    try {
      await tryStart(scanner, cameraId, onScan);
      return scanner;
    } catch (error) {
      lastError = error;
    }
  }

  scanner.clear();
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
  if (name === 'NotReadableError' || message.includes('in use')) {
    return 'La cámara está en uso por otra aplicación.';
  }

  return 'No se pudo iniciar la cámara. Pulsa Iniciar cámara y acepta el permiso.';
}

export async function stopQrScanner(scanner: Html5Qrcode | null) {
  if (!scanner) return;
  try {
    if (scanner.isScanning) await scanner.stop();
    scanner.clear();
  } catch {
    /* ignore */
  }
}
