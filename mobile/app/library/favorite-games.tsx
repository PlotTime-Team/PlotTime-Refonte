import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api, tmdbImage } from '@/lib/api';
import type { MediaDto } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { COLORS, RADIUS, SIZES, SPACE } from '@/lib/theme';
import { EmptyState, LoadError, Poster } from '@/components/ui';
import { FavSortControl, SORT_OPTIONS, SortSheet, sortFavorites } from '@/components/favorites';
import { Grid, LibHeader, LibraryGridCell } from '@/components/library';
import { Pop } from '@/components/anim';
import { GridSkeleton } from '@/components/skeletons';
import { usePullRefresh } from '@/lib/usePullRefresh';

// Jeux préférés (profil → « Jeux préférés ») : grille, tap = fiche jeu.
// Le favori se bascule depuis le menu « ⋯ » de la fiche ; pas de drag & drop
// ici en V1 (contrairement aux séries/films). La rangée de tri reprend les
// pages séries/films — le tri choisi est persisté et repris sur le profil.
export default function FavoriteGamesScreen() {
  const router = useRouter();
  const [sortOpen, setSortOpen] = useState(false);
  const sort = useAppStore((s) => s.favSort.game);
  const setFavSort = useAppStore((s) => s.setFavSort);
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['profile', 'favorites', 'game'],
    queryFn: () => api.get<{ favorites: MediaDto[] }>('/api/profile/favorites?type=game'),
  });
  const favs = useMemo(() => sortFavorites(data?.favorites ?? [], sort), [data, sort]);
  const { refreshing, onRefresh } = usePullRefresh([refetch]);
  const sortLabel = SORT_OPTIONS.find((option) => option.key === sort)?.label ?? '';
  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={COLORS.primary}
      colors={[COLORS.primary]}
    />
  );

  return (
    <Pop style={styles.screen}>
      <LibHeader
        title="Jeux préférés"
        right={
          <View style={styles.gameIcon} accessible={false}>
            <Ionicons name="game-controller-outline" size={20} color={COLORS.primary} />
          </View>
        }
      />
      {isLoading ? (
        <GridSkeleton />
      ) : isError && !data ? (
        <LoadError onRetry={refetch} busy={isRefetching} />
      ) : favs.length === 0 ? (
        <ScrollView
          refreshControl={refreshControl}
          contentContainerStyle={styles.emptyScroll}
          showsVerticalScrollIndicator={false}
        >
          <EmptyState
            title="Aucun jeu en favori"
            message="Ajoutez vos jeux préférés depuis le menu d'une fiche jeu."
          />
        </ScrollView>
      ) : (
        <View style={styles.body}>
          <FavSortControl label={sortLabel} onPress={() => setSortOpen(true)} />
          <ScrollView
            refreshControl={refreshControl}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Grid>
            {favs.map((g) => (
              <LibraryGridCell key={g.id}>
                <Poster
                  title={g.title}
                  uri={tmdbImage(g.posterPath)}
                  onPress={() => router.push(`/game/${g.id}` as Href)}
                />
              </LibraryGridCell>
            ))}
            </Grid>
          </ScrollView>
        </View>
      )}

      <SortSheet
        visible={sortOpen}
        current={sort}
        onClose={() => setSortOpen(false)}
        onApply={(key) => { setFavSort('game', key); setSortOpen(false); }}
      />
    </Pop>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.bg },
  body: { flex: 1 },
  emptyScroll: { flexGrow: 1, justifyContent: 'center' },
  scrollContent: { paddingTop: SPACE.md, paddingBottom: SPACE.xl },
  gameIcon: {
    width: SIZES.touch,
    height: SIZES.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.control,
    backgroundColor: COLORS.primarySoft,
  },
});
