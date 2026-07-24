# Fiches store — brouillons prêts à coller

> Document de travail ASO pour **PlotTime**. Ton honnête, sans superlatif mensonger. Les mentions **[À personnaliser]** signalent un choix humain à trancher avant publication. Les compteurs de caractères sont indiqués `(x/max)`.
>
> ⚠️ **Deux décisions produit conditionnent la fiche** (détail en fin de document) : (1) le sort de l'interrupteur « Contenu 18+ » sur iOS → il fait basculer la classification d'âge ; (2) la mention de « TV Time » (marque concurrente) dans les métadonnées.

---

## A. App Store (Apple)

### A.1 — Nom (≤ 30 caractères)

```
PlotTime
```
`(8/30)` — recommandé : marque seule, cohérent avec l'identité produit (cf. `STORES.md`).

Variante ASO optionnelle **[À personnaliser]** (ajoute des mots-clés indexés dans le nom, au prix de la pureté de marque) :
```
PlotTime — Séries & Jeux
```
`(24/30)`

### A.2 — Sous-titre (≤ 30 caractères)

```
Séries, animés, films et jeux
```
`(29/30)` — recommandé (couvre les 4 verticales, fort en recherche).

Alternatives **[À personnaliser]** :
```
Suivez séries, films & jeux
```
`(27/30)`
```
Votre tracker séries & jeux
```
`(27/30)`

### A.3 — Texte promotionnel (≤ 170 caractères, modifiable sans revue)

```
Suivez séries, animés, films et jeux au même endroit. Progression épisode par épisode, agenda des sorties et avis partagés avec vos amis.
```
`(137/170)`

### A.4 — Description complète

```
PlotTime est votre carnet tout-en-un pour tout ce que vous regardez et jouez. Séries, animés, films, jeux vidéo : un seul endroit pour savoir où vous en êtes, repérer les prochaines sorties et partager vos avis avec vos amis.

SUIVEZ, ÉPISODE PAR ÉPISODE
Marquez vos saisons et vos épisodes vus, gardez votre file « À voir » sous la main et estimez le temps qu'il vous reste. Films et jeux vidéo se suivent avec la même précision — jusqu'à l'import de votre bibliothèque Steam.

CE QUE VOUS POUVEZ FAIRE
• Séries & animés : statuts à voir / en cours / terminé, progression détaillée, temps restant estimé
• Films : watchlist, films vus, favoris et notes
• Jeux vidéo : bibliothèque par statut, temps de jeu, import Steam
• Agenda des sorties : épisodes, films et jeux suivis, regroupés par mois
• Explorer : recherche unifiée et flux de découverte personnalisé selon vos goûts
• Listes personnalisées, favoris, affiches et bannières à votre image
• Statistiques détaillées et progression : XP, niveaux, badges, séries de jours, défis mensuels
• Notifications dans l'app : nouvel épisode, réponse ou réaction d'un ami, sortie d'un jeu suivi

ENTRE AMIS
Abonnez-vous à vos amis, suivez leur activité, comparez vos avancées et vos classements. Commentez chaque œuvre et chaque épisode (avec protection anti-spoiler) et réagissez d'un emoji. Filtre anti-haine, signalement et blocage inclus.

VOS DONNÉES, VOS RÈGLES
Aucune publicité. Aucun traceur. Aucun outil d'analyse. Profil public ou privé, au choix, et export de votre bibliothèque quand vous voulez.

Contenu disponible en français, anglais, espagnol, allemand, italien et portugais. Vous venez de TV Time ? Importez votre historique en quelques secondes.

Données de contenu fournies par TheTVDB, The Movie Database (TMDb) et IGDB.

PlotTime est disponible en application et sur le web.
```

### A.5 — Mots-clés (≤ 100 caractères, séparés par des virgules, sans espace)

```
anime,manga,tracker,episode,watchlist,agenda,sortie,streaming,calendrier,cinema,stats,saison,binge
```
`(98/100)`

Notes :
- On **ne répète pas** `séries` / `films` / `jeux` / `suivi` : déjà indexés via le nom et le sous-titre (gain de place).
- Aucun espace après les virgules (chaque espace = un caractère perdu).
- Accents volontairement omis (`anime`, `episode`, `cinema`) pour élargir la correspondance ; **[À personnaliser]** si vous préférez les accents.
- **[À personnaliser]** N'ajoutez **pas** « TV Time » ni d'autres marques concurrentes ici (interdit par Apple, risque de rejet).

### A.6 — Catégories

- **Principale : Divertissement** (Entertainment).
- **Secondaire (facultative) : [À personnaliser]** — recommandation : **Réseaux sociaux** (couche sociale forte : fil, abonnements, commentaires) ou **Style de vie** (option plus neutre). La catégorie secondaire n'influence pas le classement, seulement la navigation.

### A.7 — Questionnaire de classification d'âge (App Store Connect)

Réponses recommandées **dans l'hypothèse où l'interrupteur « Contenu 18+ » est masqué/désactivé sur iOS** (voir décision D1 en fin de document). Sinon, la fiche doit passer en **18+**.

| Descripteur Apple | Réponse | Justification |
|---|---|---|
| Violence de dessin animé ou fantastique | Aucune | L'app n'affiche pas de scènes ; uniquement des affiches/synopsis tiers |
| Violence réaliste | Aucune | Idem |
| Violence réaliste prolongée, graphique ou sadique | Aucune | — |
| Grossièreté ou humour vulgaire | Peu fréquent / léger | UGC : commentaires d'utilisateurs (filtre anti-injures actif mais contournable) |
| Thèmes matures ou suggestifs | **Fréquent / intense** | Fiches de séries/films/jeux pour adultes potentiellement suggérées + UGC social — **c'est le déclencheur 17+** |
| Thèmes d'horreur / de peur | Peu fréquent / léger | Catalogue horreur (métadonnées tierces) |
| Informations médicales / traitements | Aucune | — |
| Alcool, tabac ou drogues (usage/références) | Peu fréquent / léger | Via fiches de contenu tierces (TMDb / TheTVDB / IGDB) |
| Jeux d'argent simulés | Aucun | — |
| Contenu sexuel ou nudité | Aucun *(voir D1)* | Dépend du sort de l'interrupteur « Contenu 18+ » |
| Contenu sexuel explicite et nudité | Aucun *(voir D1)* | Vrai uniquement si l'interrupteur 18+ est masqué/désactivé sur iOS |
| Concours | Aucun | — |
| Accès web non restreint | **Non** | Pas de navigateur intégré sans restriction ; l'app ouvre seulement des liens externes ponctuels (bande-annonce YouTube, réseaux) |

**Capacités / informations sur l'app :**

| Question | Réponse | Justification |
|---|---|---|
| Contenu généré par les utilisateurs (UGC) | **Oui** | Commentaires, réponses, pseudos, profils publics. Outils requis présents : filtre, signalement, blocage, contact support |
| Messagerie / chat entre utilisateurs | Non **[À vérifier]** | Pas de messagerie privée (DM) dans le code ; interactions publiques uniquement |
| Conçue pour les enfants (Made for Kids) | Non | — |
| Achats intégrés | Non **[À personnaliser]** | À mettre à jour si une monétisation est ajoutée |

**Classification attendue : 17+** (système classique) ≈ **16+** dans le nouveau barème App Store 2025 — **ou 18+ si l'interrupteur « Contenu 18+ » reste actif sur iOS**. **[À personnaliser — décision produit D1, cf. `STORES.md` A7]**

---

## B. Google Play

### B.1 — Description courte (≤ 80 caractères)

```
Suivez séries, animés, films et jeux. Sorties, progression et avis entre amis.
```
`(78/80)`

### B.2 — Description complète (≤ 4000 caractères)

```
PlotTime est votre carnet tout-en-un pour tout ce que vous regardez et jouez. Séries, animés, films, jeux vidéo : un seul endroit pour savoir où vous en êtes, repérer les prochaines sorties et partager vos avis avec vos amis.

SUIVEZ, ÉPISODE PAR ÉPISODE
Marquez vos saisons et vos épisodes vus, gardez votre file « À voir » à portée de main et estimez le temps qu'il vous reste. Films et jeux vidéo se suivent avec la même précision — jusqu'à l'import de votre bibliothèque Steam.

CE QUE VOUS POUVEZ FAIRE
• Séries & animés : statuts à voir / en cours / terminé, progression détaillée, temps restant estimé
• Films : watchlist, films vus, favoris et notes
• Jeux vidéo : bibliothèque par statut, temps de jeu, import Steam
• Agenda des sorties : épisodes, films et jeux suivis, regroupés par mois
• Explorer : recherche unifiée (séries, films, jeux, utilisateurs) et flux de découverte personnalisé selon vos goûts
• Listes personnalisées, favoris, affiches et bannières à votre image
• Statistiques détaillées et progression : XP, niveaux, badges, séries de jours, défis mensuels
• Notifications dans l'app : nouvel épisode, réponse ou réaction d'un ami, sortie d'un jeu suivi

ENTRE AMIS
Abonnez-vous à vos amis, suivez leur activité, comparez vos avancées et vos classements. Commentez chaque œuvre et chaque épisode (avec protection anti-spoiler) et réagissez d'un emoji. Modération intégrée : filtre anti-haine, signalement des œuvres et des commentaires, blocage d'utilisateurs.

VOS DONNÉES, VOS RÈGLES
Aucune publicité. Aucun traceur. Aucun outil d'analyse. Choisissez un profil public ou privé, et exportez votre bibliothèque quand vous le souhaitez.

Contenu disponible en français, anglais, espagnol, allemand, italien et portugais. Vous venez de TV Time ? Importez votre historique en quelques secondes.

Données de contenu fournies par TheTVDB, The Movie Database (TMDb) et IGDB.

PlotTime est disponible en application et sur le web.
```
`(≈ 1 780 / 4000)`

### B.3 — Visuels requis pour la fiche Play Console

| Visuel | Spéc. Google | État |
|---|---|---|
| **Icône haute résolution** | 512 × 512 px, PNG 32 bits, ≤ 1 Mo | ✅ Présente — `assets/branding/icon-google-play-512.png` |
| **Feature graphic (bandeau)** | 1024 × 500 px, PNG/JPG 24 bits, ≤ 1 Mo, **obligatoire** | ✅ **Créé** — `mobile/assets/branding/feature-graphic-1024x500.png` (162 Ko). Régénérable : `python3 mobile/scripts/feature-graphic.py` |
| **Captures téléphone** | **min. 2** (jusqu'à 8), PNG/JPG, côté 320–3840 px, ratio 16:9 ou 9:16 | ⏳ **À produire [À personnaliser]** — recommandé : 5–8 (Accueil « À voir », fiche série + progression, Agenda des sorties, Explorer, Profil/stats, Social/commentaires) |
| Captures tablette 7" et 10" | mêmes contraintes | Optionnel — **[À personnaliser]** requis seulement si vous ciblez explicitement les tablettes |
| Vidéo promo (YouTube) | URL YouTube publique | Optionnel — **[À personnaliser]** |

Rappels (déjà OK côté build, pour mémoire) : l'icône adaptive in-app (`foreground` + `background #0B075A` + `monochrome`) est distincte de l'icône 512 de la fiche et est déjà présente.

### B.4 — Rappels formulaires Play Console (hors copie, mais requis pour publier)

- **Data Safety** : données collectées = e-mail, contenu utilisateur (commentaires/pseudos), identifiants ; **non partagées** avec des tiers, **chiffrées en transit**, **suppression possible**. Ne pas déclarer de push (aucun jeton push dans le code). **[À personnaliser]** revalider avant soumission.
- **Classification IARC** : cible **16–18** (cf. `docs/STORES.md`) — à obtenir via le questionnaire de contenu (UGC + thèmes matures). Cohérent avec la décision D1 ci-dessous.
- Catégorie : **Divertissement**. URL politique de confidentialité + contact support obligatoires.

---

## Notes & points à trancher (avant publication)

- **D1 — Interrupteur « Contenu 18+ » sur iOS [À personnaliser / bloquant classification].** Tant qu'il est actif, il débraye le filtrage des suggestions adultes → Apple exigera vraisemblablement **18+** et le descripteur « contenu sexuel/nudité » devient positif. Recommandation (cf. `STORES.md` A7) : **masquer l'interrupteur sur iOS** pour rester à **17+/16+**. Les réponses au questionnaire A.7 supposent cette option.
- **D2 — Mention « TV Time » [À personnaliser].** Présente dans les deux descriptions comme interopérabilité factuelle (import). C'est généralement toléré, mais citer une marque concurrente dans les métadonnées comporte un risque (surtout Apple). À valider ; en cas de doute, remplacer par « importez votre historique de visionnage ». **Ne jamais** mettre « TV Time » dans les mots-clés Apple.
- **D3 — SSO à annoncer [À personnaliser].** Les faits indiquent la connexion e-mail/mot de passe + Google/Discord/Apple « préparés » et config-gated. Les brouillons **n'affirment pas** la présence des SSO pour rester honnêtes. Ajouter « Connexion avec Google, Discord et Apple » **uniquement** si ces fournisseurs sont réellement activés dans le build soumis.
- **D4 — « Aucun traceur » (honnêteté fine).** Vrai pour l'app native (aucun SDK analytics/pub/crash). Nuance web : appuyer sur une bande-annonce charge un iframe YouTube classique (cookies Google) ; le SDK Facebook est un traceur mais **désactivé par défaut**. Sans incidence sur la copie native, mais à refléter dans le label de confidentialité Apple / Data Safety Google si ces surfaces sont actives.
- **D5 — Feature graphic manquant** (voir B.3) : à produire avant toute soumission Play, sinon la fiche est bloquée.