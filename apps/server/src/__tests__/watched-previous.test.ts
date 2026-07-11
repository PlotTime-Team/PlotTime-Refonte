import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

const tmp = mkdtempSync(path.join(tmpdir(), 'serietime-prev-'));
process.env.DATABASE_URL = `file:${path.join(tmp, 'prev.sqlite')}`;
process.env.NODE_ENV = 'test';
process.env.TMDB_API_KEY = '';
process.env.TVMAZE_ENABLED = 'false';
process.env.TVDB_ENABLED = 'false';

let app: FastifyInstance;
let token = '';
let mediaId = '';
// id par code « S1E2 », « S0E1 »…
const eps = new Map<string, string>();

const bearer = () => ({ authorization: `Bearer ${token}` });

beforeAll(async () => {
  execSync('pnpm exec prisma migrate deploy', {
    cwd: path.resolve(import.meta.dirname, '../..'),
    env: process.env,
    stdio: 'pipe',
  });
  const { buildApp } = await import('../app.js');
  app = await buildApp();

  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { displayName: 'Prev', email: 'prev@example.com', password: 'secret123' },
  });
  expect(res.statusCode).toBe(200);
  token = res.json().token;

  const { prisma } = await import('../db/client.js');
  const media = await prisma.media.create({ data: { type: 'show', title: 'Longue', year: 2020, show: { create: {} } } });
  mediaId = media.id;
  const show = await prisma.show.findFirstOrThrow({ where: { mediaId } });
  // S1 : 2 épisodes diffusés ; S2 : E1-E2 diffusés + E3 diffusé + E4 À VENIR ;
  // S0 (spécial) : 1 épisode diffusé (ne doit jamais être coché automatiquement).
  const plan: [number, number, string][] = [
    [1, 1, '2020-01-01'], [1, 2, '2020-01-08'],
    [2, 1, '2021-01-01'], [2, 2, '2021-01-08'], [2, 3, '2021-01-15'], [2, 4, '2099-01-01'],
    [0, 1, '2020-06-01'],
  ];
  for (const [season, episode, date] of plan) {
    const ep = await prisma.episode.create({
      data: { showId: show.id, seasonNumber: season, episodeNumber: episode, title: `S${season}E${episode}`, airDate: new Date(date) },
    });
    eps.set(`S${season}E${episode}`, ep.id);
  }
  await prisma.userMediaStatus.create({ data: { userId: (await prisma.user.findFirstOrThrow()).id, mediaId, status: 'not_started' } });
}, 120_000);

afterAll(async () => {
  await app?.close();
});

const watchedSet = async () => {
  const res = await app.inject({ method: 'GET', url: `/api/shows/${mediaId}/episodes`, headers: bearer() });
  expect(res.statusCode).toBe(200);
  const out = new Set<string>();
  for (const s of res.json().seasons) for (const e of s.episodes) if (e.watched) out.add(`S${e.seasonNumber}E${e.episodeNumber}`);
  return out;
};

describe('Pop-up « cocher aussi les épisodes précédents » (endpoint watched-previous)', () => {
  it('coche S1 entière + S2E1-E2 quand on part de S2E3 (spéciaux et à venir exclus)', async () => {
    // L'utilisateur coche S2E3 lui-même (action directe)…
    const direct = await app.inject({ method: 'POST', url: `/api/episodes/${eps.get('S2E3')}/watched`, headers: bearer() });
    expect(direct.statusCode).toBe(200);
    // … puis répond OUI à la pop-up.
    const res = await app.inject({ method: 'POST', url: `/api/episodes/${eps.get('S2E3')}/watched-previous`, headers: bearer() });
    expect(res.statusCode).toBe(200);
    expect(res.json().count).toBe(4); // S1E1, S1E2, S2E1, S2E2

    const watched = await watchedSet();
    expect(watched).toEqual(new Set(['S1E1', 'S1E2', 'S2E1', 'S2E2', 'S2E3']));
    // Ni le spécial S0E1, ni S2E4 (pas encore diffusé).
    expect(watched.has('S0E1')).toBe(false);
    expect(watched.has('S2E4')).toBe(false);
  });

  it('le statut de la série est recalculé (En cours)', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/shows/${mediaId}`, headers: bearer() });
    expect(res.statusCode).toBe(200);
    expect(res.json().media.userStatus).toBe('watching');
  });

  it('404 pour un épisode inconnu', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/episodes/inconnu/watched-previous', headers: bearer() });
    expect(res.statusCode).toBe(404);
  });
});
