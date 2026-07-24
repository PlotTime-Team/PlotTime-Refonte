// Ordre canonique des plateformes de jeu : de la plus récente à la plus
// ancienne (retour Étienne). Noms tels que renvoyés par IGDB ; toute plateforme
// absente de cette liste est reléguée après, par ordre alphabétique
// (dégradation gracieuse). Partagé par le filtre de la recherche Explorer et
// par la bibliothèque Jeux — une seule source de vérité pour l'ordre.
export const PLATFORM_ORDER: string[] = [
  'Nintendo Switch 2',
  'PlayStation 5',
  'Xbox Series X|S',
  'PC (Microsoft Windows)',
  'Mac',
  'Linux',
  'iOS',
  'Android',
  'Nintendo Switch',
  'PlayStation 4',
  'Xbox One',
  'Wii U',
  'PlayStation Vita',
  'New Nintendo 3DS',
  'Nintendo 3DS',
  'PlayStation 3',
  'Xbox 360',
  'Wii',
  'Nintendo DS',
  'PlayStation Portable',
  'PlayStation 2',
  'Xbox',
  'Nintendo GameCube',
  'Game Boy Advance',
  'Dreamcast',
  '64DD',
  'Nintendo 64',
  'PlayStation',
  'Sega Saturn',
  'Virtual Boy',
  'Super Nintendo Entertainment System',
  'Super Famicom',
  'Game Boy Color',
  'Sega Mega Drive/Genesis',
  'Sega Game Gear',
  'Game Boy',
  'Sega Master System/Mark III',
  'Nintendo Entertainment System',
  'Family Computer Disk System',
  'Family Computer',
  'Arcade',
];

export const platformRank = (p: string): number => {
  const i = PLATFORM_ORDER.indexOf(p);
  return i === -1 ? PLATFORM_ORDER.length : i;
};

// « PC (Microsoft Windows) » → « PC » pour un affichage compact (badges / puces
// de filtre). La valeur de filtre reste le nom complet (correspondance exacte).
export const shortPlatform = (p: string): string => p.replace(/\s*\(.+\)\s*$/, '');
