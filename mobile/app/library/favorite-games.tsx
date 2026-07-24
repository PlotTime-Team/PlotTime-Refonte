import React from 'react';
import { FavoritesPage } from '@/components/favorites';

// Page « Jeux préférés » — même machinerie partagée que Séries/Films
// (components/favorites.tsx) : ajout/retrait (recherche + cœurs), tri,
// réordonnancement drag & drop, partage. Le pool et les favoris dérivent de
// /api/games (le jeu porte désormais son ordre de favori côté serveur).
export default function FavoriteGamesScreen() {
  return <FavoritesPage kind="game" />;
}
