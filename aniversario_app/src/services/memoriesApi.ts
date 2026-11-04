import { API_URL } from '@/config/api';

export type ApiMemory = {
  id: string;
  authorName: string;
  memoryDate: string;
  caption: string;
  imageUrl: string;
  createdAt: string;
  side: 'odd' | 'even';
  isCover?: boolean;
};

export async function fetchMemories(limit = 100, offset = 0): Promise<ApiMemory[]> {
  const res = await fetch(
    `${API_URL}/anniversary-memories?limit=${limit}&offset=${offset}`,
  );
  if (!res.ok) {
    throw new Error(await readError(res, 'No se pudieron cargar los recuerdos'));
  }
  return res.json();
}

/** Trae todos los recuerdos de capítulos (sin portada). */
export async function fetchAllMemories(pageSize = 200): Promise<ApiMemory[]> {
  const all: ApiMemory[] = [];
  let offset = 0;
  for (;;) {
    const batch = await fetchMemories(pageSize, offset);
    all.push(...batch);
    if (batch.length < pageSize) break;
    offset += batch.length;
    if (offset > 5000) break;
  }
  return all;
}

export async function fetchCover(): Promise<ApiMemory | null> {
  const res = await fetch(`${API_URL}/anniversary-memories/cover`);
  if (!res.ok) {
    throw new Error(await readError(res, 'No se pudo cargar la portada'));
  }
  const data = (await res.json()) as ApiMemory | null;
  return data;
}

export async function createMemory(input: {
  authorName: string;
  memoryDate: string;
  caption: string;
  photo: File;
}): Promise<ApiMemory> {
  const body = new FormData();
  body.append('authorName', input.authorName);
  body.append('memoryDate', input.memoryDate);
  body.append('caption', input.caption);
  body.append('photo', input.photo);

  const res = await fetch(`${API_URL}/anniversary-memories`, {
    method: 'POST',
    body,
  });
  if (!res.ok) {
    throw new Error(await readError(res, 'No se pudo subir el recuerdo'));
  }
  return res.json();
}

export async function unlockModeration(password: string): Promise<void> {
  const res = await fetch(`${API_URL}/anniversary-memories/moderation/unlock`, {
    method: 'POST',
    headers: { 'x-moderation-password': password },
  });
  if (!res.ok) {
    throw new Error(await readError(res, 'Contraseña incorrecta'));
  }
}

export async function uploadCover(password: string, photo: File): Promise<ApiMemory> {
  const body = new FormData();
  body.append('photo', photo);
  const res = await fetch(`${API_URL}/anniversary-memories/cover`, {
    method: 'POST',
    headers: { 'x-moderation-password': password },
    body,
  });
  if (!res.ok) {
    throw new Error(await readError(res, 'No se pudo subir la portada'));
  }
  return res.json();
}

export async function deleteMemory(id: string, password: string): Promise<void> {
  const res = await fetch(`${API_URL}/anniversary-memories/${id}`, {
    method: 'DELETE',
    headers: { 'x-moderation-password': password },
  });
  if (!res.ok) {
    throw new Error(await readError(res, 'No se pudo eliminar'));
  }
}

async function readError(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) return data.message.join(', ');
    if (typeof data.message === 'string') return data.message;
  } catch {
    /* ignore */
  }
  return fallback;
}
