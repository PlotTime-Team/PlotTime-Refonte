import { prisma } from '../../db/client.js';

// Blocage (modération UGC) — modèle simple façon « mute » Twitter,
// UNIDIRECTIONNEL : les contenus des utilisateurs que J'AI bloqués
// disparaissent de MES vues (fil social, commentaires des médias, recherche
// d'utilisateurs, classement). L'inverse n'est volontairement PAS filtré :
// être bloqué ne cache rien au bloqué (pas de fuite d'information, pas de
// double filtrage coûteux).
//
// Charger le Set UNE fois par requête puis le passer aux filtres — jamais de
// lookup unitaire par item (N+1).
export async function blockedIdSet(userId: string): Promise<Set<string>> {
  const rows = await prisma.block.findMany({ where: { blockerId: userId }, select: { blockedId: true } });
  return new Set(rows.map((r) => r.blockedId));
}
