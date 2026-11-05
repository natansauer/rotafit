import type { SpotifyTrack } from '@/types';

const BASE = 'https://api.spotify.com/v1';

export class SpotifyApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call(accessToken: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...(init.headers ?? {}) },
  });
  if (res.status === 204 || res.status === 202) return null;
  if (res.status === 404) {
    // Sem dispositivo ativo: o usuário precisa abrir o Spotify e tocar algo antes.
    throw new SpotifyApiError(
      404,
      'Abra o Spotify e toque uma música antes de controlar por aqui.',
    );
  }
  // CORREÇÃO: os comandos do player às vezes respondem 200 com corpo VAZIO; o
  // guia chamava res.json() direto e estourava "JSON Parse error". Lemos como
  // texto e só convertemos se houver conteúdo.
  const text = await res.text().catch(() => '');
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  if (!res.ok) {
    if (res.status === 401)
      throw new SpotifyApiError(401, 'Sessão do Spotify expirada. Conecte de novo no Perfil.');
    if (res.status === 403)
      throw new SpotifyApiError(
        403,
        body?.error?.message ?? 'O controle de reprodução exige uma conta Spotify Premium.',
      );
    if (res.status === 429)
      throw new SpotifyApiError(429, 'Muitas requisições ao Spotify. Aguarde alguns segundos.');
    throw new SpotifyApiError(
      res.status,
      body?.error?.message ?? 'Não foi possível falar com o Spotify.',
    );
  }
  return body;
}

// O que está tocando agora (ou null se nada estiver tocando).
export async function getNowPlaying(accessToken: string): Promise<SpotifyTrack | null> {
  // additional_types=episode: sem isso, podcasts vêm com item = null.
  const data = await call(
    accessToken,
    '/me/player/currently-playing?additional_types=track,episode',
  );
  if (!data || !data.item) return null;
  const item = data.item;
  const artists: { name: string }[] = item.artists ?? [];
  const images = item.album?.images ?? item.images ?? item.show?.images ?? [];
  return {
    id: item.id,
    name: item.name,
    artist: artists.length
      ? artists.map((a) => a.name).join(', ')
      : (item.show?.name ?? ''),
    albumArt: images[0]?.url ?? null,
    isPlaying: Boolean(data.is_playing),
    progressMs: data.progress_ms ?? 0,
    durationMs: item.duration_ms ?? 0,
  };
}

export const pausePlayback = (accessToken: string) =>
  call(accessToken, '/me/player/pause', { method: 'PUT' });
export const resumePlayback = (accessToken: string) =>
  call(accessToken, '/me/player/play', { method: 'PUT' });
export const skipNext = (accessToken: string) =>
  call(accessToken, '/me/player/next', { method: 'POST' });
export const skipPrevious = (accessToken: string) =>
  call(accessToken, '/me/player/previous', { method: 'POST' });
