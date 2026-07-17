// Blocage d'un utilisateur (exigence stores UGC, Apple 1.2) — modèle « mute »
// unidirectionnel : les contenus du bloqué disparaissent des vues du bloqueur
// (commentaires, fil, recherche, classement) ; l'inverse n'est PAS filtré.
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

const tmp = mkdtempSync(path.join(tmpdir(), 'serietime-blocks-'));
process.env.DATABASE_URL = `file:${path.join(tmp, 'blocks.sqlite')}`;
process.env.NODE_ENV = 'test';
process.env.TMDB_API_KEY = '';
process.env.TVMAZE_ENABLED = 'false';
process.env.TVDB_ENABLED = 'false';

let app: FastifyInstance;
const users: Record<string, { token: string; id: string }> = {};
let movieId = '';
let carolCommentId = '';

function acc(name: string) {
  const u = users[name];
  if (!u) throw new Error(`utilisateur inconnu: ${name}`);
  return u;
}
const bearer = (name: string) => ({ authorization: `Bearer ${acc(name).token}` });
const uid = (name: string) => acc(name).id;

async function register(name: string, email: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { displayName: name, email, password: 'secret123' },
  });
  expect(res.statusCode).toBe(200);
  users[name] = { token: res.json().token, id: res.json().user.id };
}

async function commentAuthors(as: string): Promise<string[]> {
  const res = await app.inject({ method: 'GET', url: `/api/media/${movieId}/comments`, headers: bearer(as) });
  expect(res.statusCode).toBe(200);
  const roots = res.json().comments as { user: { id: string }; replies: { user: { id: string } }[] }[];
  return [...roots.map((c) => c.user.id), ...roots.flatMap((c) => c.replies.map((r) => r.user.id))];
}

beforeAll(async () => {
  execSync('pnpm exec prisma migrate deploy', {
    cwd: path.resolve(import.meta.dirname, '../..'),
    env: process.env,
    stdio: 'pipe',
  });
  const { buildApp } = await import('../app.js');
  app = await buildApp();

  await register('Alice', 'alice@example.com');
  await register('Bob', 'bob@example.com');
  await register('Carol', 'carol@example.com');

  const { prisma } = await import('../db/client.js');
  const media = await prisma.media.create({ data: { type: 'movie', title: 'Inception', year: 2010 } });
  movieId = media.id;

  // Activité : Bob regarde le film, commente ; Carol commente ; Bob répond à
  // Carol (pour vérifier que les RÉPONSES du bloqué sont filtrées aussi).
  await app.inject({ method: 'POST', url: `/api/movies/${movieId}/watched`, headers: bearer('Bob') });
  await app.inject({
    method: 'POST',
    url: `/api/media/${movieId}/comments`,
    payload: { body: 'Commentaire de Bob' },
    headers: bearer('Bob'),
  });
  const cc = await app.inject({
    method: 'POST',
    url: `/api/media/${movieId}/comments`,
    payload: { body: 'Commentaire de Carol' },
    headers: bearer('Carol'),
  });
  carolCommentId = cc.json().id;
  await app.inject({
    method: 'POST',
    url: `/api/media/${movieId}/comments`,
    payload: { body: 'Réponse de Bob à Carol', parentId: carolCommentId },
    headers: bearer('Bob'),
  });

  // Liens sociaux dans les deux sens (le blocage doit les couper tous les deux).
  await app.inject({ method: 'POST', url: `/api/social/follow/${uid('Bob')}`, headers: bearer('Alice') });
  await app.inject({ method: 'POST', url: `/api/social/follow/${uid('Alice')}`, headers: bearer('Bob') });
}, 120_000);

afterAll(async () => {
  await app?.close();
});

describe('Blocage — POST/DELETE /api/users/:id/block', () => {
  it('on ne peut pas se bloquer soi-même (400)', async () => {
    const res = await app.inject({ method: 'POST', url: `/api/users/${uid('Alice')}/block`, headers: bearer('Alice') });
    expect(res.statusCode).toBe(400);
  });

  it('bloquer un utilisateur inexistant renvoie 404', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/users/inexistant/block', headers: bearer('Alice') });
    expect(res.statusCode).toBe(404);
  });

  it('avant blocage : Alice voit les commentaires de Bob et son fil est peuplé', async () => {
    const authors = await commentAuthors('Alice');
    expect(authors).toContain(uid('Bob'));
    const feed = await app.inject({ method: 'GET', url: '/api/social/feed', headers: bearer('Alice') });
    expect(feed.json().items.length).toBeGreaterThan(0);
  });

  it('Alice bloque Bob : ok, idempotent, isBlocked exposé sur le profil', async () => {
    const res = await app.inject({ method: 'POST', url: `/api/users/${uid('Bob')}/block`, headers: bearer('Alice') });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, blocked: true });

    // Idempotent : re-bloquer ne casse rien.
    const again = await app.inject({ method: 'POST', url: `/api/users/${uid('Bob')}/block`, headers: bearer('Alice') });
    expect(again.statusCode).toBe(200);

    const profile = await app.inject({ method: 'GET', url: `/api/users/${uid('Bob')}`, headers: bearer('Alice') });
    expect(profile.json().isBlocked).toBe(true);
    // Vu par Carol (qui n'a bloqué personne) : isBlocked false.
    const asCarol = await app.inject({ method: 'GET', url: `/api/users/${uid('Bob')}`, headers: bearer('Carol') });
    expect(asCarol.json().isBlocked).toBe(false);
  });

  it('le blocage désabonne dans les deux sens', async () => {
    const following = await app.inject({ method: 'GET', url: '/api/social/following', headers: bearer('Alice') });
    expect(following.json().users.map((u: { id: string }) => u.id)).not.toContain(uid('Bob'));
    const followers = await app.inject({ method: 'GET', url: '/api/social/followers', headers: bearer('Alice') });
    expect(followers.json().users.map((u: { id: string }) => u.id)).not.toContain(uid('Bob'));
    const profile = await app.inject({ method: 'GET', url: `/api/users/${uid('Bob')}`, headers: bearer('Alice') });
    expect(profile.json().isFollowing).toBe(false);
  });

  it('les commentaires ET réponses de Bob disparaissent de la vue d’Alice (pas de celle de Carol)', async () => {
    const forAlice = await commentAuthors('Alice');
    expect(forAlice).not.toContain(uid('Bob'));
    expect(forAlice).toContain(uid('Carol'));
    // Carol, elle, voit toujours Bob (filtrage PAR bloqueur uniquement).
    const forCarol = await commentAuthors('Carol');
    expect(forCarol).toContain(uid('Bob'));
  });

  it('l’inverse n’est PAS filtré : Bob (bloqué) voit toujours les contenus d’Alice', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/media/${movieId}/comments`,
      payload: { body: 'Commentaire d’Alice' },
      headers: bearer('Alice'),
    });
    const forBob = await commentAuthors('Bob');
    expect(forBob).toContain(uid('Alice'));
  });

  it('le fil et le classement excluent Bob même si un follow résiduel existe', async () => {
    // Simule un follow recréé par un vieux client APRÈS le blocage : le
    // filtrage « ceinture-bretelles » doit quand même exclure Bob.
    const { prisma } = await import('../db/client.js');
    await prisma.follow.create({ data: { followerId: uid('Alice'), followingId: uid('Bob') } });

    const feed = await app.inject({ method: 'GET', url: '/api/social/feed', headers: bearer('Alice') });
    const feedUsers = (feed.json().items as { user: { id: string } }[]).map((i) => i.user.id);
    expect(feedUsers).not.toContain(uid('Bob'));

    const lb = await app.inject({ method: 'GET', url: '/api/gamification/leaderboard', headers: bearer('Alice') });
    const lbUsers = (lb.json().leaderboard as { user: { id: string } }[]).map((e) => e.user.id);
    expect(lbUsers).toContain(uid('Alice'));
    expect(lbUsers).not.toContain(uid('Bob'));
  });

  it('la recherche d’utilisateurs exclut les bloqués', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/users/search?q=Bob', headers: bearer('Alice') });
    expect(res.json().users.map((u: { id: string }) => u.id)).not.toContain(uid('Bob'));
    // Pour Carol, Bob reste trouvable.
    const asCarol = await app.inject({ method: 'GET', url: '/api/users/search?q=Bob', headers: bearer('Carol') });
    expect(asCarol.json().users.map((u: { id: string }) => u.id)).toContain(uid('Bob'));
  });

  it('débloquer restaure la visibilité (et reste idempotent)', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/api/users/${uid('Bob')}/block`, headers: bearer('Alice') });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, blocked: false });
    // Idempotent : re-débloquer renvoie aussi ok.
    const again = await app.inject({ method: 'DELETE', url: `/api/users/${uid('Bob')}/block`, headers: bearer('Alice') });
    expect(again.statusCode).toBe(200);

    const authors = await commentAuthors('Alice');
    expect(authors).toContain(uid('Bob'));
    const profile = await app.inject({ method: 'GET', url: `/api/users/${uid('Bob')}`, headers: bearer('Alice') });
    expect(profile.json().isBlocked).toBe(false);
    // Le désabonnement, lui, n'est PAS restauré automatiquement (sauf le
    // follow résiduel recréé au test précédent, qui redevient effectif).
    const search = await app.inject({ method: 'GET', url: '/api/users/search?q=Bob', headers: bearer('Alice') });
    expect(search.json().users.map((u: { id: string }) => u.id)).toContain(uid('Bob'));
  });
});
