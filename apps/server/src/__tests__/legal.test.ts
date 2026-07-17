import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

const tmp = mkdtempSync(path.join(tmpdir(), 'serietime-legal-'));
process.env.DATABASE_URL = `file:${path.join(tmp, 'legal.sqlite')}`;
process.env.NODE_ENV = 'test';
process.env.TMDB_API_KEY = '';
process.env.TVMAZE_ENABLED = 'false';
process.env.TVDB_ENABLED = 'false';

let app: FastifyInstance;

beforeAll(async () => {
  execSync('pnpm exec prisma migrate deploy', {
    cwd: path.resolve(import.meta.dirname, '../..'),
    env: process.env,
    stdio: 'pipe',
  });
  const { buildApp } = await import('../app.js');
  app = await buildApp();
}, 120_000);

afterAll(async () => {
  await app?.close();
});

// Pages légales : publiques (AUCUN token), HTML, avec les mentions clés
// exigées par les stores (privacy policy, CGU/règles de communauté, page de
// suppression de compte pour le formulaire Data Safety de Google).
describe('Pages légales — /legal/*', () => {
  it('GET /legal/privacy est public et contient la politique de confidentialité', async () => {
    const res = await app.inject({ method: 'GET', url: '/legal/privacy' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('Politique de confidentialité');
    expect(res.body).toContain('non affilié');
    expect(res.body).toContain('RGPD');
  });

  it('GET /legal/terms est public et contient CGU + règles de communauté', async () => {
    const res = await app.inject({ method: 'GET', url: '/legal/terms' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain("Conditions d'utilisation");
    expect(res.body).toContain('Règles de communauté');
    expect(res.body).toContain('non affilié');
    // Attribution TMDb obligatoire, texte exact en anglais.
    expect(res.body).toContain('This product uses the TMDB API but is not endorsed or certified by TMDB');
  });

  it('GET /legal/delete-account est public et explique la suppression in-app', async () => {
    const res = await app.inject({ method: 'GET', url: '/legal/delete-account' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('Supprimer le compte');
    expect(res.body).toContain('immédiate et définitive');
    expect(res.body).toContain('non affilié');
  });
});
