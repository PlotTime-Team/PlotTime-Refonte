import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

const tmp = mkdtempSync(path.join(tmpdir(), 'serietime-searchtype-'));
process.env.DATABASE_URL = `file:${path.join(tmp, 'searchtype.sqlite')}`;
process.env.NODE_ENV = 'test';
process.env.TMDB_API_KEY = '';
process.env.TVMAZE_ENABLED = 'false';
process.env.TVDB_ENABLED = 'false';

let app: FastifyInstance;
let token = '';

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
    payload: { displayName: 'Search', email: 'search@example.com', password: 'secret123' },
  });
  expect(res.statusCode).toBe(200);
  token = res.json().token;

  const { prisma } = await import('../db/client.js');
  // Même préfixe de titre sur les trois types : seul le jeu doit être exclu
  // de la recherche « séries et films » (régression Clair Obscur: le jeu IGDB
  // importé ressortait étiqueté « Film »).
  await prisma.media.create({ data: { type: 'show', title: 'Clairtest la série', year: 2020 } });
  await prisma.media.create({ data: { type: 'movie', title: 'Clairtest le film', year: 2021 } });
  await prisma.media.create({ data: { type: 'game', title: 'Clairtest: Expedition 33', year: 2025 } });
}, 120_000);

afterAll(async () => {
  await app?.close();
});

describe('Recherche « séries et films » : les jeux restent dans leur onglet', () => {
  it('type=media ne renvoie jamais un media de type game', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/search?q=Clairtest&type=media',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const { results } = res.json() as { results: { title: string; type: string }[] };
    const titles = results.map((r) => r.title).sort();
    expect(titles).toEqual(['Clairtest la série', 'Clairtest le film']);
    expect(results.every((r) => r.type === 'show' || r.type === 'movie')).toBe(true);
  });
});
