# Déclarations de confidentialité — PlotTime

> **Portée et méthode.** Ce document mappe les données réellement traitées par PlotTime (constatées dans le code : schéma Prisma, routes serveur, `mobile/`) vers les formulaires **App Privacy** (Apple) et **Data Safety** (Google). Il ne déclare que ce que les faits fournis démontrent. Chaque point ambigu porte la mention **[à vérifier dans la console]**. Les données strictement transitoires (jamais persistées) et les données purement dérivées sont traitées à part.
>
> **Constat transversal (à connaître avant de remplir les deux formulaires) :** aucun SDK d'analytics, de crash-reporting, de mesure d'audience ni de publicité n'est embarqué (pas de Sentry / Firebase / GA / Amplitude / Segment / Mixpanel / Crashlytics / AppsFlyer / Adjust / Facebook Pixel), et aucun service de push. Le SSO Facebook (traceur connu) existe dans le code mais est **désactivé par défaut** (identifiants vides). Tout le trafic applicatif passe en HTTPS.

---

## 1. Apple — App Privacy

### 1.1 Données utilisées pour vous suivre (App Tracking) → **AUCUNE**

**Ne cocher aucune donnée dans « Data Used to Track You ».** Le code ne montre aucun tracking publicitaire : pas de SDK pub/analytics, pas d'App Tracking Transparency requis, aucun identifiant publicitaire (IDFA) lu, aucun partage avec un courtier de données, aucun recoupement des données de l'app avec des données tierces à des fins de ciblage.

Deux surfaces tierces à documenter mais **hors « tracking » au sens Apple selon les faits** — **[à vérifier dans la console]** :
- **YouTube (bandes-annonces).** Sur le **web uniquement**, appuyer sur « Lecture » intègre un `iframe youtube.com/embed` (cookies YouTube/Google). En natif, la vidéo s'ouvre dans l'app YouTube externe. C'est un embed déclenché par l'utilisateur, pas une collecte par PlotTime ; à confirmer au regard de la définition Apple du tracking si l'app iOS peut afficher cet embed.
- **Facebook Login.** Le SDK FB est un traceur, mais **inactif** (identifiants vides). Tant qu'il reste désactivé, rien ne transite ; s'il est un jour activé, réévaluer la section Tracking.

### 1.2 Données liées à l'utilisateur (Data Linked to You)

Toutes les données ci-dessous sont **stockées côté serveur et rattachées au compte → « Data Linked to You »**. Aucune n'est utilisée pour le tracking. Finalité quasi unique : **App Functionality** (fonctionnement de l'app) ; **Product Personalization** ajoutée là où le code personnalise (recommandations, flux Explorer, langue).

| Donnée (PlotTime) | Catégorie Apple | Sous-type | Finalité(s) |
|---|---|---|---|
| Adresse e-mail (inscription ou renvoyée par SSO) | **Contact Info** | Email Address | App Functionality |
| Nom d'affichage / pseudo public | **Contact Info** | Name | App Functionality |
| Avatar (URL ou data URI) | **User Content** | Photos or Videos | App Functionality |
| Bannière de couverture | **User Content** | Photos or Videos | App Functionality |
| Identifiants SSO (googleId/appleId/discordId/facebookId, providerId) | **Identifiers** | User ID | App Functionality |
| Bibliothèque & statuts (séries/films/jeux : statut, favori, masqué, possédé, note, temps de jeu, dates) | **User Content** | Other User Content | App Functionality |
| Statuts d'épisodes vus (watchedAt, note, réaction) | **User Content** | Other User Content | App Functionality |
| Notes personnelles sur œuvre/épisode (personalNote) | **User Content** | Other User Content | App Functionality |
| Notes / ratings | **User Content** | Other User Content | App Functionality, Product Personalization |
| Listes personnelles et leur contenu | **User Content** | Other User Content | App Functionality |
| Commentaires et réponses (UGC texte) | **User Content** | Other User Content | App Functionality |
| Signalements de contenu (raison, note libre) | **User Content** | Other User Content | App Functionality |
| Fichiers d'import TV Time (nom de fichier, hash) | **User Content** | Other User Content | App Functionality |
| Historique de visionnage importé (mappings TV Time, rawJson) | **User Content** | Other User Content | App Functionality |
| Historique d'activité (WatchEvent) | **Usage Data** | Product Interaction | App Functionality |
| Réactions emoji (commentaires, fil) | **Usage Data** | Product Interaction | App Functionality |
| Graphe social (abonnements / follow) | **Usage Data** | Product Interaction | App Functionality |
| Blocages d'utilisateurs | **Usage Data** | Product Interaction | App Functionality |
| Adhésions aux clubs | **Usage Data** | Product Interaction | App Functionality |
| Gamification (XP, niveau, streak, badges, défis — dérivé de l'activité) | **Usage Data** | Product Interaction | App Functionality |
| Mémoire du flux Explorer (ExploreImpression) | **Usage Data** | Product Interaction | Product Personalization, App Functionality |
| Préférence de langue de contenu | **Usage Data** *(ou Other Data)* | Other Usage Data | App Functionality, Product Personalization |
| Année de naissance | **Other Data** | — (démographique) | App Functionality |
| Pays (code ISO, saisi par l'utilisateur) | **Other Data** | — (régionalisation) | App Functionality, Product Personalization |
| Genre | **Other Data** *(voir §1.4 : possible « Sensitive Info »)* | — | App Functionality |
| Réglage de confidentialité du profil (isPrivate) | **Other Data** | — | App Functionality |
| Réglages applicatifs (thème, notifs, langues de commentaires, **allowAdultContent**, autoplay…) | **Other Data** *(voir §1.4 : allowAdultContent possiblement « Sensitive Info »)* | — | App Functionality |

> **Note sur le pays :** il s'agit d'un pays **saisi** par l'utilisateur (code ISO à 2 lettres, défaut FR), **pas** d'une géolocalisation de l'appareil. À ne **pas** déclarer sous « Location » (aucune localisation précise/approximative de device n'est captée). **[à vérifier dans la console]**

### 1.3 Cas particuliers (à ne pas déclarer, ou à trancher)

- **Mot de passe haché (bcrypt).** Apple ne fournit pas de catégorie dédiée aux identifiants d'authentification. Usage strictement d'authentification, jamais exporté. Option prudente : ne pas le déclarer comme type de donnée collectée, ou le rattacher à « Other Data ». **[à vérifier dans la console]**
- **Jetons de session / jetons de réinitialisation de mot de passe.** Générés par le serveur pour l'authentification et la sécurité, non fournis par l'utilisateur. Non déclarés en tant que type de donnée collectée (usage sécurité). **[à vérifier dans la console]**
- **Notifications reçues (stockées en base).** Données **dérivées** générées par l'app (peuvent contenir un extrait de commentaire) ; l'activité sous-jacente est déjà couverte par « Usage Data » / « User Content ». Pas de jeton push (aucun APNs/FCM/Expo dans le code).
- **Steam ID / pseudo Steam (transitoire, NON stocké).** Envoyé à Steam le temps de l'appel pour importer la ludothèque de l'utilisateur, puis jeté (seuls `playtimeMinutes` et `steamAppId` sont conservés). Import déclenché par l'utilisateur, sur son propre compte Steam. **[à vérifier dans la console]** — évaluer s'il constitue une collecte à déclarer ; il n'est pas persisté.
- **Jetons OAuth des fournisseurs (transitoire, NON stocké).** Vérifiés côté serveur puis jetés ; seul le `providerId` (« sub ») extrait est conservé (déjà déclaré en Identifiers). Non déclaré séparément.

### 1.4 Points à vérifier dans App Store Connect

1. **`allowAdultContent`** (interrupteur « Contenu 18+ ») révèle une préférence potentiellement **sensible**. Trancher : déclarer les réglages sous « Sensitive Info » plutôt que « Other Data », et/ou masquer l'interrupteur sur iOS (cf. STORES.md A7). Cadrer aussi l'âge minimum (recommandation interne 17+).
2. **Genre** : selon la formulation retenue dans l'app (identité de genre libre jusqu'à 120 caractères), Apple peut l'attendre en « Sensitive Info ». À arbitrer.
3. **Embed YouTube sur web** : confirmer qu'il n'entre pas dans la définition Apple du tracking (embed classique déclenché par l'utilisateur, pas `youtube-nocookie`).
4. **Bibliothèque de visionnage** : classée ici en « User Content » (contenu délibéré de l'utilisateur) ; Apple pourrait aussi l'accepter en « Usage Data » (Product Interaction). Choisir une classification et s'y tenir.

---

## 2. Google — Data Safety

### 2.1 Sécurité et gestion des données (en-tête du formulaire)

- **Chiffrement en transit : OUI.** Tout le trafic vers le serveur (`https://serietime.studio-vives.fr`) et vers les CDN d'images tierces (thetvdb, tmdb, igdb, steamstatic, youtube) passe en HTTPS.
- **L'utilisateur peut demander la suppression de ses données : OUI (déjà implémenté).** L'app expose `DELETE /api/auth/account` (`apps/server/src/modules/auth/routes.ts:599`) qui supprime **en cascade** toutes les données de l'utilisateur (commentaires, réactions, notes, statuts séries/films/jeux, statuts d'épisodes, listes, follows, notifications, imports, sessions) **puis le compte**. Déclenché depuis **Réglages → « SUPPRIMER LE COMPTE »** avec confirmation « taper SUPPRIMER ». → cocher **« suppression possible dans l'app »**. Un **export/sauvegarde** (JSON + format TV Time) existe aussi.
- **Données traitées de façon éphémère :** oui pour le Steam ID et les jetons OAuth (voir §2.3).

### 2.2 Données collectées (Data collected)

Toutes collectées, **non partagées** (voir §2.3), chiffrées en transit. Finalité principale : **App functionality** ; **Account management** pour l'identité/connexion ; **Personalization** pour les recommandations et le flux ; **Fraud prevention, security & compliance** pour la modération.

| Donnée (PlotTime) | Catégorie Data Safety | Type | Requise / Optionnelle | Finalité(s) |
|---|---|---|---|---|
| Adresse e-mail | **Personal info** | Email address | Requise (compte) | Account management, App functionality |
| Nom d'affichage / pseudo | **Personal info** | Name | Requise | App functionality, Account management |
| Identifiants SSO (providerId, google/apple/discord/facebook Id) | **Personal info** *(ou Device or other IDs)* | User IDs | Requise (si SSO) | Account management, App functionality |
| Avatar | **Photos and videos** | Photos | Optionnelle | App functionality |
| Bannière de couverture | **Photos and videos** | Photos | Optionnelle | App functionality |
| Année de naissance | **Personal info** | Other info | Optionnelle | App functionality, Personalization |
| Genre | **Personal info** | Other info *(voir §2.4)* | Optionnelle | App functionality |
| Pays (saisi) | **Personal info** | Other info | Optionnelle | App functionality, Personalization |
| Bibliothèque, statuts, notes, temps de jeu | **App activity** | Other user-generated content | Requise (usage) | App functionality |
| Statuts d'épisodes, notes personnelles | **App activity** | Other user-generated content | Requise (usage) | App functionality |
| Notes / ratings | **App activity** | Other user-generated content | Optionnelle | App functionality, Personalization |
| Listes personnelles | **App activity** | Other user-generated content | Optionnelle | App functionality |
| Commentaires et réponses (UGC) | **App activity** | Other user-generated content | Optionnelle | App functionality |
| Signalements de contenu | **App activity** | Other user-generated content | Optionnelle | Fraud prevention, security & compliance |
| Historique de visionnage importé (TV Time) | **App activity** | Other user-generated content | Optionnelle | App functionality |
| Historique d'activité (WatchEvent) | **App activity** | App interactions | Requise (usage) | App functionality |
| Réactions, follows, blocages, clubs, gamification | **App activity** | App interactions | Requise (usage) | App functionality |
| Mémoire du flux Explorer | **App activity** | App interactions | Requise (usage) | Personalization, App functionality |
| Préférence de langue, isPrivate, réglages (dont allowAdultContent) | **App activity** | Other actions *(voir §2.4)* | Optionnelle | App functionality |
| Fichiers d'import TV Time (nom, hash) | **Files and docs** | — | Optionnelle | App functionality |

> **À ne pas déclarer sous « Location » :** le pays est saisi, pas issu de la géoloc de l'appareil. Aucune localisation approximative/précise de device n'est collectée. **[à vérifier dans la console]**

### 2.3 Données partagées (Data shared) → **AUCUNE (selon les faits)**

Les API de catalogue **TheTVDB, TMDb, IGDB, Twitch** ne reçoivent **aucune donnée utilisateur** : uniquement du texte de recherche, des IDs de contenu et les clés de l'app (jamais un identifiant d'utilisateur). Les images de ces CDN sont chargées directement par l'appareil (seules l'IP et l'ID de contenu transitent, ce qui n'est pas du « partage » de donnée utilisateur au sens Data Safety).

Cas à documenter comme **actions initiées par l'utilisateur** (exception « sharing » de Google), **[à vérifier dans la console]** :
- **Steam** : l'utilisateur fournit lui-même son SteamID/pseudo pour importer **sa propre** ludothèque ; envoyé à Steam le temps de l'appel, **non persisté** → déclarable comme **traitement éphémère**, action initiée par l'utilisateur.
- **SSO Google / Discord / Apple** : le jeton que l'utilisateur obtient est renvoyé au fournisseur pour **vérification** de connexion (Apple : vérification locale, aucune donnée envoyée). Authentification initiée par l'utilisateur.
- **Facebook** : SSO **désactivé** → rien ne transite tant que les identifiants restent vides.

> **Conséquence pratique :** cocher **« No data shared with third parties »**, sous réserve de confirmer que les transferts Steam/SSO relèvent bien de l'exception « action initiée par l'utilisateur ». **[à vérifier dans la console]**

### 2.4 Points à vérifier dans la Play Console

1. **Suppression de compte** : ✅ **déjà implémentée** (`DELETE /api/auth/account`, cascade complète + écran Réglages). Rien à coder — déclarer simplement « suppression possible dans l'app ».
2. **`allowAdultContent`** : évaluer si les réglages doivent être signalés comme donnée sensible ; cohérence avec la classification IARC (cible 16-18) et l'interrupteur 18+.
3. **Genre** : selon la saisie, arbitrer entre « Other info » et une donnée sensible.
4. **Steam / SSO** : confirmer le classement en « action initiée par l'utilisateur » (sinon, déclarer comme donnée partagée).
5. Rappel non-conformité repo à corriger avant soumission : `docs/README_ANDROID.md` référence encore l'ancien package `com.serietime.app` au lieu de `com.plottime.app` (n'impacte pas le formulaire, mais évite la confusion).

---

## 3. Rappel réglementaire

**Une déclaration inexacte ou incomplète dans App Privacy (Apple) ou Data Safety (Google) est un motif de rejet — et de retrait après publication.** Les deux stores recoupent automatiquement les déclarations avec le comportement réel de l'app (trafic réseau, SDK présents, permissions). Ne déclarez que ce que le code fait réellement ; en cas de doute, **sur-déclarer** (par prudence) est préférable à omettre une collecte réelle. Toute évolution (activation du SSO Facebook, ajout d'un SDK analytics/push, ajout d'un endpoint de suppression) impose de **mettre à jour ces deux formulaires** avant la soumission concernée.