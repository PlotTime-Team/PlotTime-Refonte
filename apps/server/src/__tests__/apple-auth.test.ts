import { execSync } from 'node:child_process';
import { generateKeyPairSync, sign as cryptoSign, type KeyObject } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Sign in with Apple : POST /api/auth/oauth { provider: 'apple', token } où
// token est l'identityToken JWT signé par Apple. Ici on rejoue le flux complet
// avec une paire RSA de TEST : la clé publique est publiée en JWK par le fetch
// mocké de https://appleid.apple.com/auth/keys, et les jetons sont signés avec
// la clé privée correspondante — la vérification serveur (signature RS256 +
// claims iss/exp/aud) s'exécute donc pour de vrai.

const tmp = mkdtempSync(path.join(tmpdir(), 'serietime-apple-'));
process.env.DATABASE_URL = `file:${path.join(tmp, 'apple.sqlite')}`;
process.env.NODE_ENV = 'test';
process.env.TMDB_API_KEY = '';
process.env.TVMAZE_ENABLED = 'false';
process.env.TVDB_ENABLED = 'false';
process.env.APPLE_BUNDLE_ID = 'com.plottime.app';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const KID = 'test-key-1';

// Clé RSA parasite : signe des jetons que le serveur doit REFUSER (elle n'est
// pas publiée dans le JWKS mocké — même kid, mauvaise clé).
const { privateKey: rogueKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function makeAppleToken(
  payloadOverrides: Record<string, unknown> = {},
  opts: { signWith?: KeyObject; kid?: string } = {},
): string {
  const header = { alg: 'RS256', kid: opts.kid ?? KID, typ: 'JWT' };
  const payload = {
    iss: 'https://appleid.apple.com',
    aud: 'com.plottime.app',
    exp: Math.floor(Date.now() / 1000) + 600,
    iat: Math.floor(Date.now() / 1000),
    sub: 'apple-sub-0001',
    email: 'prive@privaterelay.appleid.com',
    email_verified: 'true',
    ...payloadOverrides,
  };
  const signingInput = `${b64url(header)}.${b64url(payload)}`;
  const signature = cryptoSign('RSA-SHA256', Buffer.from(signingInput), opts.signWith ?? privateKey);
  return `${signingInput}.${signature.toString('base64url')}`;
}

let app: FastifyInstance;
let keysFetchCount = 0;

beforeAll(async () => {
  execSync('pnpm exec prisma migrate deploy', {
    cwd: path.resolve(import.meta.dirname, '../..'),
    env: process.env,
    stdio: 'pipe',
  });
  const { buildApp } = await import('../app.js');
  app = await buildApp();

  // JWKS d'Apple mocké : publie la clé publique de test (format JWK).
  const jwk = publicKey.export({ format: 'jwk' }) as { kty: string; n: string; e: string };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: unknown) => {
      if (String(url) === 'https://appleid.apple.com/auth/keys') {
        keysFetchCount += 1;
        return new Response(
          JSON.stringify({ keys: [{ ...jwk, kid: KID, alg: 'RS256', use: 'sig' }] }),
          { status: 200 },
        );
      }
      throw new Error(`fetch inattendu en test : ${String(url)}`);
    }),
  );
}, 120_000);

afterAll(async () => {
  vi.unstubAllGlobals();
  await app?.close();
});

describe('Sign in with Apple — vérification du jeton', () => {
  it('GET /api/auth/providers expose apple: true (APPLE_BUNDLE_ID configuré)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/providers' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.apple).toBe(true);
    // Nouveaux champs pour Google natif (vides tant que non configurés).
    expect(body.googleIosClientId).toBe('');
    expect(body.googleAndroidClientId).toBe('');
  });

  it('jeton valide → compte créé avec appleId + displayName fourni par le client', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/oauth',
      payload: { provider: 'apple', token: makeAppleToken(), displayName: 'Benjamin V.' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeTruthy();
    expect(body.user.displayName).toBe('Benjamin V.');
    expect(body.user.linkedProviders.apple).toBe(true);

    const { prisma } = await import('../db/client.js');
    const user = await prisma.user.findUnique({ where: { id: body.user.id } });
    expect(user?.appleId).toBe('apple-sub-0001');
    expect(user?.email).toBe('prive@privaterelay.appleid.com');
  });

  it('deuxième login avec le même sub → MÊME compte (sans re-créer), displayName inchangé', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/api/auth/oauth',
      // Comme dans la vraie vie : Apple n'envoie l'e-mail qu'au premier login.
      payload: { provider: 'apple', token: makeAppleToken({ email: undefined, email_verified: undefined }) },
    });
    expect(first.statusCode).toBe(200);
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/oauth',
      payload: { provider: 'apple', token: makeAppleToken({ email: undefined, email_verified: undefined }), displayName: 'Autre Nom' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const firstBody = first.json();
    expect(body.user.id).toBe(firstBody.user.id);
    // displayName transmis au 2e login : ignoré (compte déjà créé).
    expect(body.user.displayName).toBe('Benjamin V.');
  });

  it('les clés JWKS sont mises en cache (un seul fetch pour plusieurs logins)', async () => {
    expect(keysFetchCount).toBe(1);
  });

  it('mauvaise audience (jeton émis pour une autre app) → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/oauth',
      payload: { provider: 'apple', token: makeAppleToken({ aud: 'com.evil.other' }) },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('invalid_oauth_token');
  });

  it('mauvais émetteur → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/oauth',
      payload: { provider: 'apple', token: makeAppleToken({ iss: 'https://evil.example.com' }) },
    });
    expect(res.statusCode).toBe(401);
  });

  it('jeton expiré → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/oauth',
      payload: { provider: 'apple', token: makeAppleToken({ exp: Math.floor(Date.now() / 1000) - 60 }) },
    });
    expect(res.statusCode).toBe(401);
  });

  it('signature invalide (clé non publiée par Apple) → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/oauth',
      payload: { provider: 'apple', token: makeAppleToken({}, { signWith: rogueKey }) },
    });
    expect(res.statusCode).toBe(401);
  });

  it('jeton mal formé → 401 (pas de crash)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/oauth',
      payload: { provider: 'apple', token: 'pas-un-jwt' },
    });
    expect(res.statusCode).toBe(401);
  });
});
