import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api, tmdbImage } from '@/lib/api';
import { shortDateFr } from '@/lib/format';
import { COLORS, FONTS, RADIUS, SHADOW, SPACE, SIZES } from '@/lib/theme';
import { EmptyState, LoadError, Poster } from '@/components/ui';
import { ScreenShell, SectionHeader } from '@/components/prisme';
import { LibHeader } from '@/components/library';
import { AppearItem } from '@/components/anim';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useFloatingSection, FloatingSectionPill } from '@/components/FloatingSection';
import { GridSkeleton } from '@/components/skeletons';
import { usePullRefresh } from '@/lib/usePullRefresh';
import { useBackClose } from '@/lib/useBackClose';
import { useAppStore } from '@/lib/store';
import { platformRank, shortPlatform } from '@/lib/platforms';

// Miroir de MediaDto (packages/types) pour les jeux : le serveur ne renvoie
// pas encore ce type dans lib/types.ts (endpoints ajoutés en tâche 4/5).
type GameDto = {
  id: string;
  title: string;
  posterPath: string | null;
  year: number | null;
  voteAverage: number | null;
  platforms: string | null;
  userStatus: string | null;
  playtimeMinutes: number | null;
  // Date d'ajout à la bibliothèque (tri « Dernier ajout »).
  addedAt: string | null;
};

type GamesLibraryResponse = {
  wishlist: GameDto[];
  owned: GameDto[];
  playing: GameDto[];
  completed: GameDto[];
  abandoned: GameDto[];
};

// Sorties (+ DLC) à venir des jeux suivis, groupées par mois — miroir de
// UpcomingItemDto (shows) mais à plat (pas de `media` imbriqué).
type GameUpcomingItemDto = { id: string; title: string; posterPath: string | null; releaseDate: string };
type GamesUpcomingResponse = { groups: { label: string; items: GameUpcomingItemDto[] }[] };

// « POSSÉDÉS » n'est plus un statut : c'est la vue « collection » (toutes les
// lignes isOwned côté serveur) — un jeu peut apparaître dans POSSÉDÉS ET dans
// son groupe de statut (ex. EN COURS), c'est voulu.
type StatusKey = keyof GamesLibraryResponse;
const SECTIONS: { key: StatusKey; label: string }[] = [
  { key: 'wishlist', label: 'Voulus' },
  { key: 'owned', label: 'Possédés' },
  { key: 'playing', label: 'En cours' },
  { key: 'completed', label: 'Terminés' },
  { key: 'abandoned', label: 'Abandonnés' },
];

// Tri / filtres — INDÉPENDANTS de Séries/Films et persistés (lib/store).
type GameSort = 'default' | 'added' | 'alpha';
type StatusFilter = 'all' | StatusKey;
const SORT_OPTS: { key: GameSort; label: string }[] = [
  { key: 'default', label: 'Ordre personnalisé' },
  { key: 'added', label: 'Dernier ajout' },
  { key: 'alpha', label: 'Ordre alphabétique' },
];
const STATUS_OPTS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'wishlist', label: 'Voulus' },
  { key: 'owned', label: 'Possédés' },
  { key: 'playing', label: 'En cours' },
  { key: 'completed', label: 'Terminés' },
  { key: 'abandoned', label: 'Abandonnés' },
];

const platformsOf = (g: GameDto): string[] =>
  g.platforms ? g.platforms.split(',').map((p) => p.trim()).filter(Boolean) : [];

// Bibliothèque de jeux : écran de PILE ouvert depuis le Profil (« voir tout »),
// comme Séries/Films (app/library/*). Écran de pile — et non onglet caché —
// pour que le retour (bouton ET swipe) revienne proprement ici depuis une
// fiche jeu, au lieu de retomber sur l'onglet voisin (Explorer).
export default function GamesLibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [sheet, setSheet] = useState(false);
  // Tri / statut / plateforme PERSISTÉS et indépendants (cf. lib/store).
  const sort = useAppStore((s) => s.libraryPrefs.game.sort) as GameSort;
  const status = useAppStore((s) => s.libraryPrefs.game.status) as StatusFilter;
  const platform = useAppStore((s) => s.libraryPrefs.game.platform);
  const setLibraryPref = useAppStore((s) => s.setLibraryPref);

  const library = useQuery({
    queryKey: ['games', 'library'],
    queryFn: () => api.get<GamesLibraryResponse>('/api/games'),
  });
  const isEmpty =
    !!library.data &&
    library.data.wishlist.length === 0 &&
    library.data.owned.length === 0 &&
    library.data.playing.length === 0 &&
    library.data.completed.length === 0 &&
    library.data.abandoned.length === 0;
  // Sorties à venir des jeux suivis (miroir de « À voir » côté séries).
  const upcoming = useQuery({
    queryKey: ['games', 'upcoming'],
    queryFn: () => api.get<GamesUpcomingResponse>('/api/games/upcoming'),
  });

  const { refreshing, onRefresh } = usePullRefresh([library.refetch, upcoming.refetch]);
  // Pastille de statut FLOTTANTE (VOULUS, EN COURS…) : suit le défilement,
  // comme l'onglet Séries et les bibliothèques du profil.
  const { registerSection, onListScroll, floatLabel } = useFloatingSection();

  // Grille responsive (comme l'onglet Films) : 3 colonnes sur téléphone,
  // 4/5 sur tablette et desktop, contenu centré à `contentMax`.
  const availableWidth = Math.min(width, SIZES.contentMax) - SPACE.md * 2;
  const columns = availableWidth >= 640 ? 5 : availableWidth >= 480 ? 4 : 3;
  const posterWidth = Math.max(76, (availableWidth - SPACE.sm * (columns - 1)) / columns);

  // Plateformes proposées : union des plateformes des jeux en bibliothèque,
  // classées de la plus récente à la plus ancienne (comme la recherche jeux).
  const platformOpts = React.useMemo(() => {
    const set = new Set<string>();
    const d = library.data;
    if (d) for (const key of ['wishlist', 'owned', 'playing', 'completed', 'abandoned'] as StatusKey[])
      for (const g of d[key]) platformsOf(g).forEach((p) => set.add(p));
    return [...set].sort((a, b) => platformRank(a) - platformRank(b) || a.localeCompare(b, 'fr'));
  }, [library.data]);
  // Une plateforme mémorisée peut avoir disparu (jeu retiré) : on l'ignore.
  const platformActive = platform !== 'all' && platformOpts.includes(platform);
  const filtersActive = sort !== 'default' || status !== 'all' || platformActive;

  // Filtre plateforme + tri appliqués à une section.
  const processItems = React.useCallback((items: GameDto[]): GameDto[] => {
    let arr = platformActive ? items.filter((g) => platformsOf(g).includes(platform)) : items;
    arr = [...arr];
    if (sort === 'alpha') arr.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
    else if (sort === 'added') arr.sort((a, b) => new Date(b.addedAt ?? 0).getTime() - new Date(a.addedAt ?? 0).getTime());
    // 'default' : on garde l'ordre serveur (updatedAt desc).
    return arr;
  }, [platform, platformActive, sort]);

  const grid = (items: GameDto[], startIndex = 0) => (
    <View style={styles.grid}>
      {items.map((g, i) => (
        <AppearItem key={g.id} index={startIndex + i} style={{ width: posterWidth }}>
          <Poster title={g.title} uri={tmdbImage(g.posterPath)} width={posterWidth} onPress={() => router.push(`/game/${g.id}` as Href)} />
        </AppearItem>
      ))}
    </View>
  );

  // Sorties à venir (jeux déjà suivis) : même gabarit que les autres sections
  // de la bibliothèque (grille d'affiches), avec la DATE de sortie sous chaque
  // jaquette — cohérent avec les catégories voisines et l'Agenda. Taper ouvre
  // la fiche. Masqué dès qu'un filtre statut/plateforme est actif (hors taxo).
  const upcomingGrid = (items: GameUpcomingItemDto[]) => (
    <View style={styles.grid}>
      {items.map((it) => (
        <View key={it.id} style={{ width: posterWidth }}>
          <Poster title={it.title} uri={tmdbImage(it.posterPath)} width={posterWidth} onPress={() => router.push(`/game/${it.id}` as Href)} />
          <Text style={styles.upcomingDate} numberOfLines={1}>{shortDateFr(it.releaseDate)}</Text>
        </View>
      ))}
    </View>
  );

  const shownSections = status === 'all' ? SECTIONS : SECTIONS.filter((s) => s.key === status);
  const showUpcoming = status === 'all' && !platformActive;
  const filterLabel = status === 'all' ? 'Tous les statuts' : (STATUS_OPTS.find((o) => o.key === status)?.label ?? '');
  const filterA11y = `Filtres. Tri : ${SORT_OPTS.find((o) => o.key === sort)?.label}. Statut : ${filterLabel}.${platformActive ? ` Plateforme : ${shortPlatform(platform)}.` : ''}`;

  return (
    <ScreenShell safeTop={false} contentContainerStyle={styles.content}>
      {/* En-tête de pile compact avec retour + bouton filtres (comme Séries). */}
      <LibHeader
        title="Jeux"
        right={
          <Pressable
            style={({ pressed }) => [styles.headerFilter, pressed && styles.controlPressed]}
            onPress={() => setSheet(true)}
            accessibilityRole="button"
            accessibilityLabel={filterA11y}
            accessibilityHint="Ouvre les options de tri, statut et plateforme"
            accessibilityState={{ selected: filtersActive }}
          >
            <Feather name="sliders" size={19} color={COLORS.primary} />
            {filtersActive ? <View style={styles.activeDot} /> : null}
          </Pressable>
        }
      />

      {library.isLoading ? (
        <GridSkeleton />
      ) : library.isError && !library.data ? (
        <LoadError onRetry={library.refetch} busy={library.isRefetching} />
      ) : (
        <View style={styles.body}>
          <PullToRefresh
            refreshing={refreshing}
            onRefresh={onRefresh}
            contentContainerStyle={styles.scrollContent}
            onScroll={onListScroll}
          >
            {library.data ? (
              isEmpty ? (
                <EmptyState title="Aucun jeu suivi" message="Ajoutez des jeux depuis l'Explorer." />
              ) : (
                (() => {
                  const data = library.data;
                  let n = -1;
                  const sections = shownSections
                    .map(({ key, label }) => ({ key, label, items: processItems(data[key]) }))
                    .filter((s) => s.items.length > 0);
                  if (sections.length === 0) {
                    return (
                      <View style={styles.emptyFilter}>
                        <EmptyState
                          title="Aucun jeu pour ce filtre"
                          message="Choisissez un autre statut ou une autre plateforme pour retrouver votre collection."
                        />
                      </View>
                    );
                  }
                  return (
                    <>
                      {sections.map(({ key, label, items }) => {
                        const start = n + 1;
                        n += items.length;
                        return (
                          <View key={key} onLayout={registerSection(label)}>
                            <SectionHeader title={label} />
                            {grid(items, start)}
                          </View>
                        );
                      })}

                      {showUpcoming && upcoming.data && upcoming.data.groups.length > 0 ? (
                        <View onLayout={registerSection('Sorties à venir')}>
                          <SectionHeader title="Sorties à venir" />
                          {upcoming.data.groups.map((g) => (
                            <View key={g.label} style={styles.upcomingGroup}>
                              <Text style={styles.groupLabel}>{g.label.toUpperCase()}</Text>
                              {upcomingGrid(g.items)}
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </>
                  );
                })()
              )
            ) : null}
          </PullToRefresh>
          <FloatingSectionPill label={floatLabel} />
          {/* Bouton FILTRER flottant (comme Séries/Films). */}
          {!isEmpty ? (
            <Pressable
              style={({ pressed }) => [styles.filtersBtn, { bottom: Math.max(insets.bottom, SPACE.md) }, pressed && styles.filtersPressed]}
              onPress={() => setSheet(true)}
              accessibilityRole="button"
              accessibilityLabel={filterA11y}
              accessibilityHint="Ouvre les options de tri, statut et plateforme"
              accessibilityState={{ selected: filtersActive }}
            >
              <Feather name="sliders" size={18} color={COLORS.onPrimary} />
              <Text style={styles.filtersText}>{filtersActive ? 'FILTRES ACTIFS' : 'FILTRER'}</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <GamesFilterSheet
        visible={sheet}
        sort={sort}
        status={status}
        platform={platform}
        platformOpts={platformOpts}
        onClose={() => setSheet(false)}
        onApply={(s, st, pl) => { setLibraryPref('game', { sort: s, status: st, platform: pl }); setSheet(false); }}
      />
    </ScreenShell>
  );
}

// Feuille « Organiser les jeux » — même structure visuelle que Séries/Films,
// avec en plus le filtre PLATEFORME (spécifique aux jeux).
function GamesFilterSheet({
  visible, sort, status, platform, platformOpts, onClose, onApply,
}: {
  visible: boolean;
  sort: GameSort;
  status: StatusFilter;
  platform: string;
  platformOpts: string[];
  onClose: () => void;
  onApply: (sort: GameSort, status: StatusFilter, platform: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [s, setS] = useState<GameSort>(sort);
  const [st, setSt] = useState<StatusFilter>(status);
  const [pl, setPl] = useState<string>(platform);
  React.useEffect(() => { if (visible) { setS(sort); setSt(status); setPl(platform); } }, [visible, sort, status, platform]);
  useBackClose(visible, onClose);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer les filtres" />
      <View style={styles.sheetDock} pointerEvents="box-none">
        <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACE.sm }]} accessibilityViewIsModal>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text accessibilityRole="header" style={styles.sheetTitle}>Organiser les jeux</Text>
            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.controlPressed]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fermer les filtres"
            >
              <Feather name="x" size={20} color={COLORS.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.sheetSectionTitle}>Trier par</Text>
            <View style={styles.chipRow}>
              {SORT_OPTS.map((option) => {
                const selected = s === option.key;
                return (
                  <Pressable
                    key={option.key}
                    style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && styles.optionPressed]}
                    onPress={() => setS(option.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextOn]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sheetSectionTitle}>Statut</Text>
            <View style={styles.chipRow}>
              {STATUS_OPTS.map((option) => {
                const selected = st === option.key;
                return (
                  <Pressable
                    key={option.key}
                    style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && styles.optionPressed]}
                    onPress={() => setSt(option.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextOn]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Plateforme : n'apparaît que si la bibliothèque expose au moins
                une console (dégradation gracieuse sinon). */}
            {platformOpts.length > 0 ? (
              <>
                <Text style={styles.sheetSectionTitle}>Plateforme</Text>
                {[{ key: 'all', label: 'Toutes les plateformes' }, ...platformOpts.map((p) => ({ key: p, label: shortPlatform(p) }))].map((option) => {
                  const selected = pl === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      style={({ pressed }) => [styles.radioRow, pressed && styles.optionPressed]}
                      onPress={() => setPl(option.key)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                    >
                      <Text style={styles.radioLabel}>{option.label}</Text>
                      <View style={[styles.radio, selected && styles.radioOn]}>
                        {selected ? <Feather name="check" size={15} color={COLORS.onPrimary} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </>
            ) : null}
          </ScrollView>

          <View style={styles.sheetBtns}>
            <Pressable
              style={({ pressed }) => [styles.resetBtn, pressed && styles.optionPressed]}
              onPress={() => { setS('default'); setSt('all'); setPl('all'); }}
              accessibilityRole="button"
              accessibilityLabel="Réinitialiser les filtres"
            >
              <Text style={styles.resetText}>RÉINITIALISER</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.applyBtn, pressed && styles.filtersPressed]}
              onPress={() => onApply(s, st, pl)}
              accessibilityRole="button"
            >
              <Text style={styles.applyText}>APPLIQUER</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 0 },
  body: { flex: 1 },
  scrollContent: { paddingTop: SPACE.xs, paddingBottom: SIZES.tabBar + SPACE.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  upcomingGroup: { paddingBottom: SPACE.xs },
  groupLabel: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.textMuted, marginBottom: 6, letterSpacing: 0.4 },
  upcomingDate: { fontFamily: FONTS.semiBold, fontSize: 11.5, color: COLORS.textMuted, marginTop: 4 },
  emptyFilter: { width: '100%', maxWidth: SIZES.contentMax, alignSelf: 'center', paddingTop: SPACE.xl },
  // Bouton filtres de l'en-tête (miroir Séries/Films).
  headerFilter: {
    width: SIZES.touch,
    height: SIZES.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.control,
    backgroundColor: COLORS.primarySoft,
  },
  activeDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderWidth: 2,
    borderColor: COLORS.primarySoft,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.secondary,
  },
  controlPressed: { opacity: 0.76, transform: [{ scale: 0.96 }] },
  filtersBtn: {
    position: 'absolute',
    alignSelf: 'center',
    minHeight: SIZES.touchComfortable,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    paddingHorizontal: SPACE.lg,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    ...SHADOW.card,
  },
  filtersPressed: { opacity: 0.84, transform: [{ scale: 0.97 }] },
  filtersText: { color: COLORS.onPrimary, fontSize: 13, fontFamily: FONTS.extraBold, letterSpacing: 0.6 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.overlay },
  sheetDock: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '92%',
    paddingHorizontal: SPACE.md,
    paddingTop: SPACE.xs,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    backgroundColor: COLORS.sheet,
    ...SHADOW.card,
  },
  sheetScroll: { flexShrink: 1 },
  sheetHandle: { width: 42, height: 4, alignSelf: 'center', marginBottom: SPACE.sm, borderRadius: RADIUS.pill, backgroundColor: COLORS.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm },
  sheetTitle: { flex: 1, minWidth: 0, color: COLORS.text, fontSize: 19, lineHeight: 25, fontFamily: FONTS.bold },
  closeBtn: {
    width: SIZES.touch,
    height: SIZES.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.control,
    backgroundColor: COLORS.surfaceMuted,
  },
  sheetSectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: FONTS.extraBold,
    marginTop: SPACE.md,
    marginBottom: SPACE.xs,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs },
  chip: {
    minHeight: SIZES.touch,
    justifyContent: 'center',
    paddingHorizontal: SPACE.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceMuted,
  },
  chipOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  chipText: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.text },
  chipTextOn: { color: COLORS.onPrimary, fontFamily: FONTS.bold },
  radioRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
    borderRadius: RADIUS.small,
  },
  optionPressed: { backgroundColor: COLORS.primarySoft },
  radioLabel: { flex: 1, color: COLORS.text, fontSize: 15, lineHeight: 20, fontFamily: FONTS.regular },
  radio: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 13,
  },
  radioOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  sheetBtns: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md },
  resetBtn: {
    flex: 1,
    minHeight: SIZES.touchComfortable,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
  },
  resetText: { color: COLORS.text, fontSize: 12, fontFamily: FONTS.extraBold, letterSpacing: 0.45 },
  applyBtn: {
    flex: 1,
    minHeight: SIZES.touchComfortable,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
  },
  applyText: { color: COLORS.onPrimary, fontSize: 12, fontFamily: FONTS.extraBold, letterSpacing: 0.45 },
});
