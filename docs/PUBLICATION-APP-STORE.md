# Publier PlotTime sur l'App Store — guide pas à pas

> Dernière mise à jour : **2026-07-24**. État du code : **prêt et fusionné sur
> `main`** (commit `d0ca6e4`). Ce qui reste est surtout **côté comptes / consoles**,
> que seul Benjamin peut faire (paiement, identité, acceptation des contrats).
>
> Légende : 🧑 = **toi** (Benjamin) · 🤖 = **Claude peut le faire** (demande-moi) ·
> ☁️ = **fait dans le cloud** (EAS / Apple).

---

## 0. Ce qui est DÉJÀ prêt — rien à faire ✅

Vérifié le 24/07 sur la config résolue et la prod :

- **Nom / version** : PlotTime · 1.0.0
- **Identifiant** iOS + Android : `com.plottime.app`
- **Sign in with Apple** câblé (`usesAppleSignIn: true`) → satisfait la règle Apple **4.8**
- **Permission photos iOS** (`NSPhotoLibraryUsageDescription`) présente → **plus de crash**
  au sélecteur d'avatar/bannière (sinon rejet **5.1.1**)
- **Chiffrement export** déclaré non concerné (`ITSAppUsesNonExemptEncryption: false`)
  → pas de question à chaque envoi
- **Modération** des signalements : outil serveur `pnpm --filter @serietime/server moderation`
  (tient le SLA 24 h d'Apple **1.2**)
- **Signalement + blocage** d'utilisateurs déjà dans l'app (UGC)
- **Pages légales en ligne** :
  - Confidentialité → `https://serietime.studio-vives.fr/legal/privacy`
  - Conditions → `https://serietime.studio-vives.fr/legal/terms`
- **Suppression de compte** dans l'app (exigence 5.1.1)
- **Serveur URL** bakée dans le build : `https://serietime.studio-vives.fr` (API live)
- **eas.json** prêt (profils `production` + `submit`)

---

## 1. Comptes à créer — 🧑 (je ne peux pas : paiement + identité)

### 1.1 Apple Developer Program — **99 $/an** ⏳ à lancer en premier (validation 24–48 h)

1. Va sur <https://developer.apple.com/programs/enroll/>
2. Connecte-toi avec ton **Apple ID** (active la double authentification si demandé).
3. Choisis **Individual** (ou Organization si tu as un SIRET/D-U-N-S — plus long).
4. Paie les **99 $**. Apple valide le compte sous **24–48 h** — lance-le maintenant,
   c'est le seul délai incompressible.

### 1.2 Compte Expo — **gratuit** (pour lancer les builds)

- Crée-le sur <https://expo.dev/signup> (juste email + mot de passe).

### 1.3 (Plus tard) Google Play Console — 25 $ une fois

- Optionnel aujourd'hui : la config Android est prête, on publiera Android quand tu voudras.

---

## 2. Installer les outils — 🧑 (sur ton Mac, une fois)

```bash
npm install -g eas-cli
```

Puis connecte-toi à Expo :

```bash
eas login
```

> Pas besoin d'installer Xcode : **EAS compile dans le cloud** ☁️. (Xcode sert
> seulement si tu veux un simulateur local — non requis pour publier.)

---

## 3. Lier le projet à EAS — 🧑 (2 min, une fois)

```bash
cd /Users/ben/Desktop/TVDB/mobile
eas init
```

Ça crée le projet côté Expo et écrit un `projectId` dans `app.json`.
**Commite ce changement** (je peux le faire à ta place ensuite) :

```bash
git add app.json && git commit -m "chore(eas): lier le projet EAS (projectId)"
```

---

## 4. Lancer le build iOS de production — 🧑 lance, ☁️ compile (~20–30 min)

```bash
cd /Users/ben/Desktop/TVDB/mobile
eas build --platform ios --profile production
```

Pendant l'exécution, EAS te demande :
- de te **connecter à ton compte Apple** (celui du 1.1) ;
- il **gère tout seul** les certificats et profils de provisioning (dis « oui »
  quand il propose de les générer).

À la fin, tu obtiens un **`.ipa`** hébergé chez Expo. Rien à télécharger.

---

## 5. Créer la fiche dans App Store Connect — 🧑

Sur <https://appstoreconnect.apple.com> → **Mes apps** → **+** → **Nouvelle app** :

| Champ | Valeur |
|---|---|
| Plateforme | iOS |
| Nom | **PlotTime** |
| Langue principale | Français |
| Bundle ID | **com.plottime.app** (apparaît une fois le build reçu) |
| SKU | `plottime` (identifiant libre) |

Puis remplis la version **1.0** :

- **Description**, **mots-clés**, **catégorie** (Divertissement / Style de vie),
  **URL de support** (une page ou un mail), **URL marketing** (facultatif).
- **URL de politique de confidentialité** :
  `https://serietime.studio-vives.fr/legal/privacy`
- **Captures d'écran** iPhone 6,7" et 6,5" (obligatoires) → 🤖 **je peux te les
  générer** depuis l'app, demande-moi.
- **Confidentialité de l'app** (« nutrition label ») : déclare les données
  collectées (email, contenu utilisateur, identifiants). 🤖 je te prépare la liste
  exacte à cocher si tu veux.
- **Classification par âge** : réponds au questionnaire (l'app a du contenu
  utilisateur modéré → catégorie ado en général).
- **Connexion requise** → **Informations pour l'App Review** :
  - fournis un **compte de démo** (voir §7) : email + mot de passe ;
  - un **contact** (ton email) + une note « app de suivi de séries/films/jeux,
    connexion via Apple ou email ».

> **Sign in with Apple** est déjà proposé dans l'app → tu es en règle avec la 4.8
> (obligatoire dès qu'un autre SSO type Google est présent).

---

## 6. Envoyer le build et soumettre — 🧑

Quand le build du §4 est terminé :

```bash
cd /Users/ben/Desktop/TVDB/mobile
eas submit --platform ios --profile production
```

EAS téléverse le build vers App Store Connect. Ensuite, dans App Store Connect :
1. attache le build à la version **1.0** ;
2. clique **Ajouter pour examen** puis **Soumettre**.

Délai de review Apple : en général **24–48 h**.

---

## 7. Ce que je (Claude) fais dès que tu me donnes le feu vert — 🤖

Dis-moi et je m'en occupe (code déjà prêt) :

- **Compte de démo review** : le plus simple = **inscris-toi normalement** dans
  l'app (l'inscription email est ouverte en prod) avec p. ex.
  `review@plottime.app` / un mot de passe, et donne ces identifiants à Apple.
  *Alternative* si un jour l'inscription est coupée : je lance sur le serveur
  `pnpm --filter @serietime/server create-demo-user review@plottime.app <motdepasse>`.
- **Email de support** : donne-moi l'adresse → je pose `SUPPORT_EMAIL`, je
  redéploie le serveur, et les pages légales affichent le contact en `mailto:`.
- **Captures d'écran** App Store (6,7" / 6,5") : je les génère.
- **CI GitHub** (`.github/workflows/ci.yml`, déjà écrit) : à ajouter via
  l'interface GitHub (mon jeton n'a pas le droit `workflow`) — je te donne le
  contenu à coller.
- **SSO Google natif** (facultatif) : si tu crées les *client IDs* iOS/Android
  dans Google Cloud, donne-les-moi → je pose les variables et redéploie.

---

## 8. Après publication : corriger vite ? — **OUI** (ta question)

Deux niveaux :

- **Correctif JS / UI / textes / logique mobile** → **OTA instantané, sans review** :
  ```bash
  cd /Users/ben/Desktop/TVDB/mobile
  eas update --branch production --message "fix: ..."
  ```
  Les utilisateurs reçoivent le correctif au prochain lancement de l'app.
- **Correctif serveur** (API, modération, sécurité) → **redéploiement du VPS**,
  aucun passage par Apple. 🤖 je gère.
- **Changement natif** (nouvelle permission, nouveau module natif, icône) →
  **nouveau build + review** Apple (24–48 h). Rare.

Donc : la grande majorité des bugs/failles se corrigent **le jour même**, sans
attendre Apple.

---

## 9. Récap « qui fait quoi »

| Étape | Qui | Bloquant ? |
|---|---|---|
| Compte Apple Developer (99 $) | 🧑 | ⏳ **à lancer en 1er** (24–48 h) |
| Compte Expo | 🧑 | non |
| `eas-cli` + `eas login` + `eas init` | 🧑 | non |
| Build iOS (`eas build`) | 🧑 lance / ☁️ | non |
| Fiche App Store Connect + captures + confidentialité | 🧑 (🤖 aide) | non |
| Compte de démo + email support | 🤖 / 🧑 | non |
| `eas submit` + soumettre | 🧑 | non |
| Review Apple | ☁️ Apple | ⏳ 24–48 h |

**Chemin critique aujourd'hui** : lance le **compte Apple Developer** (§1.1)
tout de suite — pendant sa validation, on fait tout le reste (Expo, build,
fiche, captures) en parallèle.
