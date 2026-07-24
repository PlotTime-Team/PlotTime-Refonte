import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FavSortKey, MediaType } from '@/lib/types';

export type UserInfo = {
  id: string;
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
};

type AppState = {
  serverUrl: string | null;
  token: string | null;
  user: UserInfo | null;
  hydrated: boolean;
  // Couverture choisie dans /profile/cover, récupérée par /profile/edit.
  coverPick: string | null;
  // Tri choisi sur les pages « préférés » (persisté, comme TV Time).
  favSort: Record<MediaType, FavSortKey>;
  // Tri / filtres des bibliothèques du profil (Séries / Films / Jeux), PERSISTÉS
  // et INDÉPENDANTS par type (retour Étienne : trier ses séries en alpha sans
  // impacter le tri de ses jeux, et retrouver le réglage au redémarrage). Les
  // valeurs sont validées par chaque écran (il ne pose que ses propres options).
  libraryPrefs: LibraryPrefs;
  // Affichage cartes (false) / grille d'affiches (true), INDÉPENDANT par onglet
  // (Accueil et Agenda ont chacun leur réglage). Persisté.
  gridView: { home: boolean; agenda: boolean };
  // Dernier type de recherche utilisé dans Explorer (persisté) : on y revient
  // par défaut (ex. ajouter plein de jeux sans re-cliquer « Jeux » à chaque fois).
  searchType: SearchType;
  setServerUrl: (url: string) => void;
  setAuth: (token: string, user: UserInfo) => void;
  setCoverPick: (url: string | null) => void;
  setFavSort: (kind: MediaType, sort: FavSortKey) => void;
  setLibraryPref: <K extends keyof LibraryPrefs>(kind: K, patch: Partial<LibraryPrefs[K]>) => void;
  setGridView: (tab: 'home' | 'agenda', on: boolean) => void;
  setSearchType: (t: SearchType) => void;
  logout: () => void;
};

export type GridViewTab = 'home' | 'agenda';
export type SearchType = 'media' | 'games' | 'users';

// Réglages de bibliothèque persistés, indépendants par type. Valeurs libres
// (chaque écran ne pose que ses propres options) ; les jeux ont en plus un
// filtre `platform`.
export type LibraryPrefs = {
  show: { sort: string; filter: string };
  movie: { sort: string; filter: string };
  game: { sort: string; status: string; platform: string };
};
const DEFAULT_LIBRARY_PREFS: LibraryPrefs = {
  show: { sort: 'default', filter: 'all' },
  movie: { sort: 'last_watched', filter: 'all' },
  game: { sort: 'default', status: 'all', platform: 'all' },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      serverUrl: null,
      token: null,
      user: null,
      hydrated: false,
      coverPick: null,
      favSort: { show: 'user', movie: 'user', game: 'user' },
      libraryPrefs: DEFAULT_LIBRARY_PREFS,
      gridView: { home: false, agenda: false },
      searchType: 'media',
      setServerUrl: (url) => set({ serverUrl: url.replace(/\/+$/, '') }),
      setAuth: (token, user) => set({ token, user }),
      setCoverPick: (url) => set({ coverPick: url }),
      setFavSort: (kind, sort) => set((s) => ({ favSort: { ...s.favSort, [kind]: sort } })),
      setLibraryPref: (kind, patch) =>
        set((s) => ({ libraryPrefs: { ...s.libraryPrefs, [kind]: { ...s.libraryPrefs[kind], ...patch } } })),
      setGridView: (tab, on) =>
        set((s) => ({
          // Tolérant à un ancien réglage booléen persisté (auto-guérison).
          gridView: { ...(s.gridView && typeof s.gridView === 'object' ? s.gridView : { home: false, agenda: false }), [tab]: on },
        })),
      setSearchType: (t) => set({ searchType: t }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'serietime-app',
      // Export web statique : pas de `window` pendant le rendu Node → stockage
      // inerte le temps du SSR (le vrai AsyncStorage prend le relais au chargement).
      storage: createJSONStorage(() =>
        typeof window === 'undefined'
          ? { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }
          : AsyncStorage,
      ),
      partialize: (s) => ({ serverUrl: s.serverUrl, token: s.token, user: s.user, favSort: s.favSort, libraryPrefs: s.libraryPrefs, gridView: s.gridView, searchType: s.searchType }),
      // Fusion défensive : un état persisté d'une version antérieure n'a pas
      // (tout) `libraryPrefs` → on complète chaque type avec ses valeurs par
      // défaut pour qu'aucun écran ne lise `undefined`.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        const lp = (p.libraryPrefs ?? {}) as Partial<LibraryPrefs>;
        return {
          ...current,
          ...p,
          libraryPrefs: {
            show: { ...DEFAULT_LIBRARY_PREFS.show, ...lp.show },
            movie: { ...DEFAULT_LIBRARY_PREFS.movie, ...lp.movie },
            game: { ...DEFAULT_LIBRARY_PREFS.game, ...lp.game },
          },
        };
      },
      onRehydrateStorage: () => (state) => {
        useAppStore.setState({ hydrated: true });
      },
    },
  ),
);
