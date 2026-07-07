# Notes pour Claude — SerieTime

## Environnement local de l'utilisateur (Windows / PowerShell)

- **Chemin du projet sur la machine de l'utilisateur : `C:\Users\etien\SerieTime`**
  Toujours préfixer les commandes PowerShell par `cd C:\Users\etien\SerieTime`
  (l'utilisateur oublie souvent de s'y placer et se retrouve dans `C:\WINDOWS\system32`).
- Gestionnaires : **pnpm** pour le serveur/monorepo, **npm** pour `mobile/`.
- Node ≥ 20 requis. `corepack enable` une fois pour pnpm.

## Lancer le projet (deux fenêtres PowerShell)

Serveur :
```powershell
cd C:\Users\etien\SerieTime
pnpm install
pnpm --filter @serietime/server db:deploy   # applique les migrations
pnpm dev:server                              # http://0.0.0.0:4000
```

Mobile (QR code Expo Go) :
```powershell
cd C:\Users\etien\SerieTime\mobile
npm install
npx expo start -c
```
Dans l'app, URL serveur = `http://<IP-locale-du-PC>:4000` (jamais `localhost`).
IP : `ipconfig | Select-String "IPv4"`.

## Architecture (rappel)

- `mobile/` : app React Native + Expo (npm, autonome).
- `apps/server/` : Fastify + Prisma + SQLite (source de vérité).
- `packages/core` + `packages/types` : logique métier et types partagés.
- Auth multi-comptes e-mail/mot de passe ; SSO Google/Facebook prêt mais désactivé.
- Contenu via TheTVDB (clé dans `apps/server/.env`, `TVDB_ENABLED=true`) ; TMDb optionnel.
- Dimension sociale : abonnements, fil, commentaires/réponses, réactions, notifications.

## Branche de travail

Développer sur `claude/seriestime-repo-setup-3wyz3c` (PR #1 vers `main`).
