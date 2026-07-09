import { create } from 'zustand';

// Re-clic sur l'onglet déjà actif (barre du bas) : chaque écran d'onglet
// écoute son compteur et se remonte (position/état par défaut), façon TV Time.
type TabResetState = {
  seq: Record<string, number>;
  bump: (route: string) => void;
};

export const useTabResetStore = create<TabResetState>((set) => ({
  seq: {},
  bump: (route) => set((s) => ({ seq: { ...s.seq, [route]: (s.seq[route] ?? 0) + 1 } })),
}));

// Compteur de reset pour un onglet : à utiliser comme `key` du contenu de
// l'écran — l'incrément force un remontage complet (retour à l'état initial).
export function useTabResetSeq(route: string): number {
  return useTabResetStore((s) => s.seq[route] ?? 0);
}
