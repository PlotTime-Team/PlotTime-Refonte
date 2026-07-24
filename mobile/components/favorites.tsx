import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Modal, Image, TextInput,
  RefreshControl, Animated, Platform, Share,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, tmdbImage } from '@/lib/api';
import type { FavSortKey, MediaDto } from '@/lib/types';
// Page favoris drag & drop : séries/films uniquement (les jeux ont leur page dédiée).
type FavKind = 'show' | 'movie';
import { useAppStore } from '@/lib/store';
import { COLORS, FONTS, RADIUS, SHADOW, SIZES, SPACE } from '@/lib/theme';
import { LoadError, EmptyState, Poster } from '@/components/ui';
import { Grid, LibHeader, LibraryGridCell, type LibraryShow } from '@/components/library';
import { Pop, PopIn } from '@/components/anim';
import { useReduceMotion } from '@/lib/useReduceMotion';
import { GridSkeleton } from '@/components/skeletons';
import { usePullRefresh } from '@/lib/usePullRefresh';
import { useBackClose } from '@/lib/useBackClose';

const NATIVE = Platform.OS !== 'web';

// Libellés de la feuille « Trier par » (copie TV Time).
export const SORT_OPTIONS: { key: FavSortKey; label: string }[] = [
  { key: 'user', label: "Ordre de l'utilisateur" },
  { key: 'recent', label: 'Derniers ajouts' },
  { key: 'oldest', label: 'Premiers ajouts' },
  { key: 'az', label: 'Alphabétique (A-Z)' },
  { key: 'za', label: 'Alphabétique (Z-A)' },
];
const sortLabel = (key: FavSortKey) => SORT_OPTIONS.find((o) => o.key === key)?.label ?? '';

// Tri côté client : les champs favoriteOrder/favoritedAt viennent du serveur.
export function sortFavorites<T extends MediaDto>(items: T[], sort: FavSortKey): T[] {
  const arr = [...items];
  const byUser = (a: T, b: T) =>
    (a.favoriteOrder ?? Number.MAX_SAFE_INTEGER) - (b.favoriteOrder ?? Number.MAX_SAFE_INTEGER) ||
    (a.favoritedAt ?? '').localeCompare(b.favoritedAt ?? '') ||
    a.title.localeCompare(b.title, 'fr');
  switch (sort) {
    case 'recent': arr.sort((a, b) => (b.favoritedAt ?? '').localeCompare(a.favoritedAt ?? '')); break;
    case 'oldest': arr.sort((a, b) => (a.favoritedAt ?? '').localeCompare(b.favoritedAt ?? '')); break;
    case 'az': arr.sort((a, b) => a.title.localeCompare(b.title, 'fr')); break;
    case 'za': arr.sort((a, b) => b.title.localeCompare(a.title, 'fr')); break;
    default: arr.sort(byUser);
  }
  return arr;
}

// Données des deux pages : bibliothèque complète (pour Ajouter/Supprimer) dont
// on extrait les favoris. Les séries gardent leur progression (barres).
export function useFavoritesData(kind: FavKind) {
  const shows = useQuery({
    queryKey: ['shows', 'library'],
    queryFn: () => api.get<{ items: LibraryShow[] }>('/api/shows/library'),
    enabled: kind === 'show',
  });
  const movies = useQuery({
    queryKey: ['movies', 'library', 'all'],
    queryFn: () => api.get<{ seen: MediaDto[]; unseen: MediaDto[] }>('/api/movies/profile?filter=all'),
    enabled: kind === 'movie',
  });
  const q = kind === 'show' ? shows : movies;
  const all: MediaDto[] =
    kind === 'show' ? shows.data?.items ?? [] : [...(movies.data?.seen ?? []), ...(movies.data?.unseen ?? [])];
  return {
    all,
    favs: all.filter((m) => m.isFavorite),
    isLoading: q.isLoading,
    isError: q.isError,
    hasData: !!q.data,
    refetch: q.refetch,
    isRefetching: q.isRefetching,
  };
}

const WORDING = {
  show: {
    pageTitle: 'Séries préférées',
    addBtn: 'AJOUTER/SUPPRIMER DES SÉRIES',
    pickerTitle: 'Séries',
    searchPlaceholder: 'Rechercher des séries',
    emptyTitle: 'Aucune série en favori',
    emptyMsg: 'Ajoute tes séries préférées avec le bouton ci-dessus.',
    pickerEmpty: 'Suis des séries pour pouvoir les ajouter aux favoris.',
    shareTitle: 'Mes séries préférées',
  },
  movie: {
    pageTitle: 'Films préférés',
    addBtn: 'AJOUTER/SUPPRIMER DES FILMS',
    pickerTitle: 'Films',
    searchPlaceholder: 'Rechercher des films',
    emptyTitle: 'Aucun film en favori',
    emptyMsg: 'Ajoute tes films préférés avec le bouton ci-dessus.',
    pickerEmpty: 'Ajoute des films pour pouvoir les mettre en favori.',
    shareTitle: 'Mes films préférés',
  },
} as const;

// Carte de tri Prisme partagée par les trois pages de favoris (séries / films /
// jeux) — une seule source de style pour garantir un rendu identique.
export function FavSortControl({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.sortCard, pressed && styles.controlPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Trier. Tri actuel : ${label}`}
      accessibilityHint="Ouvre les options de tri"
    >
      <View style={styles.sortIcon}>
        <Feather name="list" size={18} color={COLORS.primary} />
      </View>
      <Text style={styles.sortCardValue} numberOfLines={1}>Tri : {label}</Text>
      <Feather name="chevron-down" size={19} color={COLORS.primary} />
    </Pressable>
  );
}

// ============================================================================
// Page « Séries/Films préférés » — refonte Prisme (même coquille que « Jeux
// préférés ») : en-tête LibHeader + pastille de type, carte de tri partagée,
// bouton primaire « Ajouter ou retirer », menu « ⋯ » (réordonner / partager),
// grille d'affiches épurée. Les fonctionnalités sont inchangées.
// ============================================================================
export function FavoritesPage({ kind }: { kind: FavKind }) {
  const router = useRouter();
  const w = WORDING[kind];
  const [picker, setPicker] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const sort = useAppStore((s) => s.favSort[kind]);
  const setFavSort = useAppStore((s) => s.setFavSort);

  const { all, favs, isLoading, isError, hasData, refetch, isRefetching } = useFavoritesData(kind);
  const sorted = useMemo(() => sortFavorites(favs, sort), [favs, sort]);
  const { refreshing, onRefresh } = usePullRefresh([refetch]);

  const share = async () => {
    const lines = sortFavorites(favs, 'user').map((m, i) => `${i + 1}. ${m.title}`);
    const message = `${w.shareTitle} sur PlotTime :\n${lines.join('\n')}`;
    try {
      await Share.share({ message });
    } catch {
      // Web sans navigator.share : copie dans le presse-papiers, au mieux.
      try { await navigator.clipboard?.writeText(message); } catch { /* tant pis */ }
    }
  };

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
  );

  return (
    <Pop style={styles.screen}>
      <LibHeader
        title={w.pageTitle}
        right={
          <View style={styles.typeIcon} accessible={false}>
            <Feather name={kind === 'show' ? 'tv' : 'film'} size={19} color={COLORS.primary} />
          </View>
        }
      />

      {isLoading ? (
        <GridSkeleton />
      ) : isError && !hasData ? (
        <LoadError onRetry={refetch} busy={isRefetching} />
      ) : (
        <View style={styles.body}>
          <FavSortControl label={sortLabel(sort)} onPress={() => setSortOpen(true)} />
          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [styles.addPrimary, pressed && styles.addPrimaryPressed]}
              onPress={() => setPicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Ajouter ou retirer des favoris"
            >
              <Feather name="plus" size={18} color={COLORS.onPrimary} />
              <Text style={styles.addPrimaryText} numberOfLines={1}>Ajouter ou retirer des favoris</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.moreBtn, pressed && styles.controlPressed]}
              onPress={() => setMenuOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Plus d'options"
              accessibilityHint="Réordonner ou partager les favoris"
            >
              <Feather name="more-horizontal" size={22} color={COLORS.primary} />
            </Pressable>
          </View>
          <ScrollView
            refreshControl={refreshControl}
            contentContainerStyle={sorted.length === 0 ? styles.emptyScroll : styles.gridScroll}
            showsVerticalScrollIndicator={false}
          >
            {sorted.length === 0 ? (
              <EmptyState title={w.emptyTitle} message={w.emptyMsg} />
            ) : (
              <Grid>
                {sorted.map((m) => (
                  <LibraryGridCell key={m.id}>
                    <Poster
                      title={m.title}
                      uri={tmdbImage(m.posterPath)}
                      onPress={() => router.push(kind === 'movie' ? `/show/${m.id}?type=movie` : `/show/${m.id}`)}
                    />
                  </LibraryGridCell>
                ))}
              </Grid>
            )}
          </ScrollView>
        </View>
      )}

      <FavPicker kind={kind} visible={picker} items={all} onClose={() => setPicker(false)} />
      <SortSheet
        visible={sortOpen}
        current={sort}
        onClose={() => setSortOpen(false)}
        onApply={(key) => { setFavSort(kind, key); setSortOpen(false); }}
      />
      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)} floating>
        <Pressable
          style={styles.menuRow}
          onPress={() => { setMenuOpen(false); router.push(`/library/reorder-favorites?type=${kind}`); }}
        >
          <MaterialCommunityIcons name="swap-vertical" size={20} color={COLORS.text} />
          <Text style={styles.menuLabel}>Réordonner les éléments</Text>
        </Pressable>
        <View style={styles.sheetSep} />
        <Pressable style={styles.menuRow} onPress={() => { setMenuOpen(false); share(); }}>
          <Feather name="share" size={19} color={COLORS.text} />
          <Text style={styles.menuLabel}>Partager</Text>
        </Pressable>
      </BottomSheet>
    </Pop>
  );
}

// ============================================================================
// Feuille « Trier par » : 5 options, pastille jaune cochée, ANNULER/APPLIQUER
// (APPLIQUER grisé tant que rien ne change) — copie TV Time.
// ============================================================================
export function SortSheet({
  visible, current, onClose, onApply,
}: {
  visible: boolean;
  current: FavSortKey;
  onClose: () => void;
  onApply: (key: FavSortKey) => void;
}) {
  const [temp, setTemp] = useState<FavSortKey>(current);
  useEffect(() => { if (visible) setTemp(current); }, [visible, current]);
  const changed = temp !== current;
  useBackClose(visible, onClose);
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.sheetTitle}>Trier par</Text>
      {SORT_OPTIONS.map((o, i) => (
        <View key={o.key}>
          {i > 0 ? <View style={styles.sheetSep} /> : null}
          <Pressable style={styles.optionRow} onPress={() => setTemp(o.key)}>
            <Text style={styles.optionLabel}>{o.label}</Text>
            {temp === o.key ? (
              <PopIn style={styles.radioOn}>
                <Feather name="check" size={16} color={COLORS.onPrimary} />
              </PopIn>
            ) : (
              <View style={styles.radioOff} />
            )}
          </Pressable>
        </View>
      ))}
      <View style={styles.sheetFooter}>
        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>ANNULER</Text>
        </Pressable>
        <Pressable
          style={[styles.applyBtn, !changed && { opacity: 0.45 }]}
          disabled={!changed}
          onPress={() => onApply(temp)}
        >
          <Text style={styles.applyText}>APPLIQUER</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

// Feuille basse générique : fond assombri + panneau blanc qui remonte en
// ressort. `floating` = carte détachée des bords (menu « ... » de TV Time) ;
// sinon panneau pleine largeur arrondi en haut (feuille « Trier par »).
function BottomSheet({
  visible, onClose, children, floating,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  floating?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    if (reduce) { v.setValue(1); return; }
    v.setValue(0);
    Animated.spring(v, { toValue: 1, useNativeDriver: NATIVE, friction: 9, tension: 100 }).start();
  }, [visible, reduce, v]);
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={{
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
          }}
        >
          <Pressable
            style={
              floating
                ? [styles.sheetFloating, { marginBottom: insets.bottom + 14 }]
                : [styles.sheet, { paddingBottom: insets.bottom + 12 }]
            }
            onPress={(e) => e.stopPropagation()}
          >
            {children}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ============================================================================
// Page « Ajouter/Supprimer » — copie TV Time : chevron retour + titre centré,
// recherche filtrante, liste alphabétique, cœur rouge plein / gris au repos.
// ============================================================================
function FavPicker({
  kind, visible, items, onClose,
}: {
  kind: FavKind;
  visible: boolean;
  items: MediaDto[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const w = WORDING[kind];
  const [q, setQ] = useState('');
  useEffect(() => { if (visible) setQ(''); }, [visible]);
  useBackClose(visible, onClose);

  // Bascule OPTIMISTE : le cœur et la grille réagissent au doigt (un appui = un
  // favori), le serveur confirme derrière. Sans cela, l'UI attendait le refetch
  // complet de la bibliothèque (plusieurs secondes) et on tapait 4 fois.
  const libKey = kind === 'movie' ? ['movies', 'library', 'all'] : ['shows', 'library'];
  const toggle = useMutation({
    mutationKey: ['fav-toggle', kind],
    mutationFn: (id: string) => api.post(kind === 'movie' ? `/api/movies/${id}/favorite` : `/api/shows/${id}/favorite`),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: libKey });
      const prev = qc.getQueryData(libKey);
      const flip = <T extends MediaDto>(m: T): T =>
        m.id === id
          ? {
              ...m,
              isFavorite: !m.isFavorite,
              // Nouveau favori : va en fin d'ordre utilisateur (comme le serveur).
              favoriteOrder: null,
              favoritedAt: m.isFavorite ? null : new Date().toISOString(),
            }
          : m;
      if (kind === 'movie') {
        qc.setQueryData<{ seen: MediaDto[]; unseen: MediaDto[] }>(libKey, (d) =>
          d ? { seen: d.seen.map(flip), unseen: d.unseen.map(flip) } : d,
        );
      } else {
        qc.setQueryData<{ items: LibraryShow[] }>(libKey, (d) => (d ? { items: d.items.map(flip) } : d));
      }
      return { prev };
    },
    onError: (_e: unknown, _id: string, ctx?: { prev?: unknown }) => {
      if (ctx?.prev) qc.setQueryData(libKey, ctx.prev);
    },
    onSettled: () => {
      // N'invalide qu'à la DERNIÈRE mutation en vol : sinon le refetch d'un
      // appui précédent (parti avant le POST suivant) réécrit un état périmé.
      if (qc.isMutating({ mutationKey: ['fav-toggle', kind] }) === 1) {
        qc.invalidateQueries({ queryKey: [kind === 'movie' ? 'movies' : 'shows'] });
        qc.invalidateQueries({ queryKey: ['profile'] });
        // Fiche détaillée (clé singulier ['movie'|'show', id]) : le cœur de la
        // fiche doit refléter le favori basculé depuis cette grille.
        qc.invalidateQueries({ queryKey: [kind === 'movie' ? 'movie' : 'show'] });
      }
    },
  });

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...items]
      .filter((m) => !needle || m.title.toLowerCase().includes(needle))
      .sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  }, [items, q]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.white, paddingTop: insets.top }}>
        <View style={styles.pickerHead}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.pickerBtn} accessibilityRole="button" accessibilityLabel="Fermer">
            <Feather name="chevron-left" size={26} color={COLORS.text} />
          </Pressable>
          <Text style={styles.pickerTitle}>{w.pickerTitle}</Text>
          <View style={styles.pickerBtn} />
        </View>
        <View style={styles.searchbar}>
          <Feather name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={[styles.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as never)]}
            placeholder={w.searchPlaceholder}
            placeholderTextColor={COLORS.textMuted}
            value={q}
            onChangeText={setQ}
            autoCapitalize="none"
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Effacer la recherche">
              <Feather name="x" size={18} color={COLORS.textMuted} />
            </Pressable>
          ) : null}
        </View>
        {items.length === 0 ? (
          <EmptyState title={w.emptyTitle} message={w.pickerEmpty} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }} keyboardShouldPersistTaps="handled">
            {list.map((m) => (
              <Pressable key={m.id} style={styles.pickRow} onPress={() => toggle.mutate(m.id)}>
                <Image source={{ uri: tmdbImage(m.posterPath, 'w185') ?? undefined }} style={styles.pickPoster} resizeMode="cover" />
                <Text style={styles.pickName} numberOfLines={2}>{m.title}</Text>
                {m.isFavorite ? (
                  <PopIn style={styles.heartOn}>
                    <Ionicons name="heart" size={18} color="#fff" />
                  </PopIn>
                ) : (
                  <View style={styles.heartOff}>
                    <Ionicons name="heart-outline" size={18} color="#b4b4b4" />
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.bg },
  body: { flex: 1 },
  // Pastille de type (série / film) à droite de l'en-tête — même DA que la
  // pastille manette de « Jeux préférés ».
  typeIcon: {
    width: SIZES.touch,
    height: SIZES.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.control,
    backgroundColor: COLORS.primarySoft,
  },
  // Carte de tri (partagée avec « Jeux préférés » via FavSortControl).
  sortCard: {
    minHeight: 68,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginHorizontal: SPACE.md,
    marginTop: SPACE.md,
    paddingHorizontal: SPACE.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.surface,
    ...SHADOW.card,
  },
  sortIcon: {
    width: SIZES.touch,
    height: SIZES.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.control,
    backgroundColor: COLORS.primarySoft,
  },
  sortCardValue: { flex: 1, minWidth: 0, color: COLORS.text, fontSize: 15, lineHeight: 21, fontFamily: FONTS.bold },
  controlPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  // Rangée d'actions : bouton primaire « Ajouter ou retirer » + « ⋯ ».
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginHorizontal: SPACE.md, marginTop: SPACE.sm },
  addPrimary: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.primary,
    ...SHADOW.card,
  },
  addPrimaryPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  addPrimaryText: { color: COLORS.onPrimary, fontSize: 14, lineHeight: 19, fontFamily: FONTS.extraBold, letterSpacing: 0.2 },
  moreBtn: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.surface,
    ...SHADOW.card,
  },
  gridScroll: { paddingTop: SPACE.md, paddingBottom: SPACE.xl },
  emptyScroll: { flexGrow: 1, justifyContent: 'center', paddingBottom: SPACE.xl },
  // Feuilles basses
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.sheet, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 6 },
  sheetFloating: { backgroundColor: COLORS.sheet, borderRadius: 14, marginHorizontal: 14, paddingVertical: 2, overflow: 'hidden' },
  sheetTitle: { color: COLORS.text, fontSize: 18, fontFamily: FONTS.extraBold, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  sheetSep: { height: 1, backgroundColor: COLORS.borderLight, marginHorizontal: 20 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  optionLabel: { color: COLORS.text, fontSize: 15, fontFamily: FONTS.regular, flex: 1 },
  radioOn: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  radioOff: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border },
  sheetFooter: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight, marginTop: 6 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.pill, paddingVertical: 11, alignItems: 'center' },
  cancelText: { color: COLORS.text, fontSize: 13, fontFamily: FONTS.extraBold, letterSpacing: 0.5 },
  applyBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, paddingVertical: 11, alignItems: 'center' },
  applyText: { color: COLORS.onPrimary, fontSize: 13, fontFamily: FONTS.extraBold, letterSpacing: 0.5 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 13 },
  menuLabel: { color: COLORS.text, fontSize: 15, fontFamily: FONTS.regular },
  // Page Ajouter/Supprimer
  pickerHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  pickerBtn: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  pickerTitle: { color: COLORS.text, flex: 1, textAlign: 'center', fontSize: 18, fontFamily: FONTS.bold },
  searchbar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, height: 52, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchInput: { color: COLORS.text, flex: 1, fontFamily: FONTS.regular, fontSize: 16, borderWidth: 0, paddingVertical: 8 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.borderLight },
  pickPoster: { width: 40, height: 60, borderRadius: 3, backgroundColor: COLORS.imagePlaceholder },
  pickName: { color: COLORS.text, flex: 1, fontSize: 16, fontFamily: FONTS.semiBold },
  heartOn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.red, alignItems: 'center', justifyContent: 'center' },
  heartOff: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
});
