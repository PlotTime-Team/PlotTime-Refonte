import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Image, Share, Platform, useWindowDimensions } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api, tmdbImage } from '@/lib/api';
import type { GamificationMeDto, MediaDto, ProfileStatsDto } from '@/lib/types';
import { watchTime } from '@/lib/format';
import { COLORS, FONTS, RADIUS, SHADOW, SIZES, SPACE } from '@/lib/theme';
import { Loading, LoadError, Poster } from '@/components/ui';
import { AppearItem } from '@/components/anim';
import { useTabResetSeq } from '@/lib/tabReset';
import { usePullRefresh } from '@/lib/usePullRefresh';
import { PullToRefresh } from '@/components/PullToRefresh';
import { sortFavorites } from '@/components/favorites';
import { useAppStore } from '@/lib/store';

export type ProfileUser = {
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  birthYear?: number | null;
  gender?: string | null;
  countryCode?: string;
};

type ProfileResponse = {
  user: ProfileUser;
  social?: { followingCount: number; followersCount: number; commentsCount: number };
  stats: ProfileStatsDto;
  lists: { id: string; title: string; posterPaths: string[] }[];
  shows: MediaDto[];
  favoriteShows: MediaDto[];
  movies: MediaDto[];
  favoriteMovies: MediaDto[];
  games: MediaDto[];
  favoriteGames: MediaDto[];
};

export default function ProfileScreen() {
  // Re-clic sur l'onglet « Profil » : remontage complet (scroll par défaut).
  const resetSeq = useTabResetSeq('profile');
  return <ProfileScreenInner key={resetSeq} />;
}

function ProfileScreenInner() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(220, Math.min(width, SIZES.contentMax) - SPACE.md * 2);
  // Affiches calibrées sur la maquette : ~5 par rangée (petites vignettes).
  // Largeur utile de la carte = contentWidth − padding (SPACE.sm×2) ; 4 gouttières.
  const posterW = Math.min(96, Math.max(54, Math.floor((contentWidth - SPACE.sm * 2 - 8 * 4) / 5)));
  const [activeListIndex, setActiveListIndex] = useState(0);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<ProfileResponse>('/api/profile'),
  });
  // Gamification (spec 2026-07-16 §10) : niveau + titre sur la bannière, streak.
  const { data: gamification } = useQuery({
    queryKey: ['gamification', 'me'],
    queryFn: () => api.get<GamificationMeDto>('/api/gamification/me'),
    staleTime: 30_000,
  });

  const { refreshing, onRefresh } = usePullRefresh([refetch]);
  // Tri choisi sur les pages « préférés » (persisté) : appliqué aussi ici.
  const favSort = useAppStore((s) => s.favSort);

  if (isLoading)
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Loading />
      </View>
    );
  if (!data)
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <LoadError onRetry={refetch} busy={isRefetching} />
      </View>
    );
  const { user, stats } = data;

  // Partage du profil (bouton de la cover, maquette). Web : Web Share API si
  // dispo, sinon copie ; natif : feuille de partage système.
  const shareProfile = async () => {
    const message = `${user.displayName} sur PlotTime`;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'share' in navigator) {
        await (navigator as unknown as { share: (d: { text: string }) => Promise<void> }).share({ text: message });
      } else if (Platform.OS !== 'web') {
        await Share.share({ message });
      }
    } catch {
      /* annulé */
    }
  };

  return (
    <View style={styles.screen}>
      {/* Tirer-pour-actualiser façon Instagram (ressort) — le RefreshControl RN
          ne fonctionne pas sur la web app, notre PullToRefresh oui (web + natif). */}
      <PullToRefresh
        refreshing={refreshing}
        onRefresh={onRefresh}
        style={{ flex: 1 }}
        contentContainerStyle={styles.screenContent}
      >
        <View style={styles.canvas}>
          {/* COVER pleine largeur (maquette) : couverture qui remonte sous la
              barre d'état, boutons partage + réglages, avatar rond à badge de
              niveau, nom + certification, niveau · titre. Coins bas arrondis ;
              la carte des compteurs vient chevaucher son bord inférieur. */}
          <View style={[styles.cover, { paddingTop: insets.top + SPACE.xs }]}>
            {user.coverUrl ? (
              <Image
                source={{ uri: tmdbImage(user.coverUrl, 'w780') ?? user.coverUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            ) : (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <View style={[styles.prismShape, styles.prismShapePrimary]} />
                <View style={[styles.prismShape, styles.prismShapeSecondary]} />
                <View style={[styles.prismShape, styles.prismShapeTertiary]} />
              </View>
            )}
            <LinearGradient colors={['rgba(20, 13, 39, 0.10)', 'rgba(20, 13, 39, 0.88)']} style={StyleSheet.absoluteFill} />
            <View style={styles.coverTopBar}>
              <Pressable
                style={({ pressed }) => [styles.coverBtn, pressed && styles.coverBtnPressed]}
                onPress={shareProfile}
                accessibilityRole="button"
                accessibilityLabel="Partager le profil"
              >
                <Feather name="share" size={17} color="#FFFFFF" />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.coverBtn, pressed && styles.coverBtnPressed]}
                onPress={() => router.push('/settings')}
                accessibilityRole="button"
                accessibilityLabel="Paramètres"
                accessibilityHint="Ouvre les paramètres du compte et de l’application"
              >
                <Feather name="settings" size={17} color="#FFFFFF" />
              </Pressable>
            </View>
            <View style={styles.coverBottom}>
              {/* Taper l'avatar ouvre l'édition du profil (le crayon de la maquette
                  a laissé place aux boutons partage/réglages). */}
              <Pressable
                style={styles.avatarWrap}
                onPress={() => router.push('/profile/edit')}
                accessibilityRole="button"
                accessibilityLabel="Modifier le profil"
              >
                {user.avatarUrl ? (
                  <Image
                    source={{ uri: tmdbImage(user.avatarUrl, 'w185') ?? user.avatarUrl }}
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarEmpty]}>
                    <Text style={styles.avatarInit}>{user.displayName.slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
                {gamification ? (
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelBadgeText}>{gamification.level}</Text>
                  </View>
                ) : null}
              </Pressable>
              <View style={styles.identityCopy}>
                <View style={styles.nameRow}>
                  <Text accessibilityRole="header" style={styles.name} numberOfLines={1}>
                    {user.displayName}
                  </Text>
                  <View style={styles.verifiedBadge}>
                    <Feather name="check" size={11} color="#FFFFFF" />
                  </View>
                </View>
                {gamification ? (
                  <Text style={styles.levelLine} numberOfLines={1}>
                    Niveau {gamification.level} · {gamification.levelTitle}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Compteurs sociaux — carte qui CHEVAUCHE le bas de la cover. */}
          <View style={styles.counters}>
            {/* Libellés fixes au pluriel (maquette) — pas de bascule singulier. */}
            <Counter
              icon="user-plus"
              n={data.social?.followingCount ?? 0}
              label="Abonnements"
              onPress={() => router.push('/social/connections?type=following')}
            />
            <Counter
              icon="users"
              n={data.social?.followersCount ?? 0}
              label="Abonnés"
              border
              onPress={() => router.push('/social/connections?type=followers')}
            />
            <Counter
              icon="message-circle"
              n={data.social?.commentsCount ?? 0}
              label="Commentaires"
              border
              onPress={() => router.push('/social/my-comments')}
            />
          </View>

          <View style={styles.body}>
            {/* Statistiques all-time en tuiles (maquette) — la page détaillée
                reste accessible via « Tout afficher ». */}
            <View style={styles.sectHead}>
              <View style={styles.sectTitleRow}>
                <View style={[styles.sectIcon, { backgroundColor: COLORS.primarySoft }]}>
                  <Feather name="bar-chart-2" size={15} color={COLORS.primary} />
                </View>
                <Text accessibilityRole="header" style={styles.sectTitle}>Statistiques</Text>
              </View>
              <Pressable
                onPress={() => router.push('/stats')}
                accessibilityRole="button"
                accessibilityLabel="Ouvrir les statistiques détaillées"
                hitSlop={4}
                style={({ pressed }) => [styles.sectAction, pressed && styles.sectActionPressed]}
              >
                <Text style={styles.sectActionText}>Tout afficher</Text>
                <Feather name="chevron-right" size={16} color={COLORS.primary} />
              </Pressable>
            </View>
            <StatsSummary stats={stats} />

            {/* Titre délimiteur : sépare les statistiques brutes de la zone
                gamifiée (trophées, badges, défis du mois, classement). */}
            <View style={[styles.sectHead, styles.rewardsHead]}>
              <View style={styles.sectTitleRow}>
                <View style={[styles.sectIcon, { backgroundColor: COLORS.yellowSoft }]}>
                  <Feather name="award" size={15} color={COLORS.yellow} />
                </View>
                <Text accessibilityRole="header" style={styles.sectTitle}>Récompenses</Text>
              </View>
            </View>

            {/* Streak (gamification) : accès aux Trophées, façon maquette. */}
            <Pressable
              style={({ pressed }) => [styles.streakCard, pressed && styles.cardPressed]}
              onPress={() => router.push('/trophies' as Href)}
              accessibilityRole="button"
              accessibilityLabel={
                gamification
                  ? gamification.currentStreak > 0
                    ? `Trophées — série de ${gamification.currentStreak} jour${gamification.currentStreak > 1 ? 's' : ''}, record ${gamification.bestStreak}`
                    : `Trophées — record ${gamification.bestStreak} jour${gamification.bestStreak > 1 ? 's' : ''}`
                  : 'Trophées'
              }
            >
              <View style={styles.streakIcon}>
                <Feather name="award" size={20} color={COLORS.onAccent} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.streakTitle}>
                  {gamification && gamification.currentStreak > 0
                    ? `Série de ${gamification.currentStreak} jour${gamification.currentStreak > 1 ? 's' : ''}`
                    : 'Trophées & défis'}
                </Text>
                <Text style={styles.streakSub} numberOfLines={1}>
                  {gamification
                    ? gamification.currentStreak > 0
                      ? `Record : ${gamification.bestStreak} jour${gamification.bestStreak > 1 ? 's' : ''}`
                      : `Niveau ${gamification.level} · ${gamification.levelTitle}`
                    : 'Badges, défis du mois et classement'}
                </Text>
              </View>
              <Feather name="chevron-right" size={22} color={COLORS.primary} />
            </Pressable>

            {/* Collections (ordre produit 2026-07-20) : chaque média puis ses favoris. */}
            <PosterRow title="Séries" items={data.shows} emptyLabel="Aucune série suivie" href="/library/shows" posterWidth={posterW} />
            <PosterRow title="Séries favorites" items={sortFavorites(data.favoriteShows, favSort.show)} heart emptyLabel="Aucune série en favori" href="/library/favorite-shows" posterWidth={posterW} />
            <PosterRow title="Films" items={data.movies} isMovie emptyLabel="Aucun film ajouté" href="/library/movies" posterWidth={posterW} />
            <PosterRow title="Films favoris" items={sortFavorites(data.favoriteMovies, favSort.movie)} isMovie heart emptyLabel="Aucun film en favori" href="/library/favorite-movies" posterWidth={posterW} />
            <PosterRow title="Jeux" items={data.games ?? []} isGame emptyLabel="Aucun jeu joué" href="/library/games" posterWidth={posterW} />
            <PosterRow title="Jeux favoris" items={sortFavorites(data.favoriteGames ?? [], favSort.game)} isGame heart emptyLabel="Aucun jeu en favori" href="/library/favorite-games" posterWidth={posterW} />

            {data.lists.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectHead}>
                  <Text accessibilityRole="header" style={styles.sectTitle}>Listes</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.listsContent}
                  snapToInterval={contentWidth + SPACE.sm}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  onMomentumScrollEnd={(event) => {
                    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / (contentWidth + SPACE.sm));
                    setActiveListIndex(Math.max(0, Math.min(data.lists.length - 1, nextIndex)));
                  }}
                >
                  {data.lists.map((l) => (
                    <ListCollageCard key={l.id} title={l.title} posterPaths={l.posterPaths} width={contentWidth} />
                  ))}
                </ScrollView>
                {data.lists.length > 1 ? (
                  <View style={styles.dotsRow}>
                    {data.lists.map((l, i) => (
                      <View key={l.id} style={[styles.dot, i === activeListIndex && styles.dotActive]} />
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

          </View>
        </View>
      </PullToRefresh>
    </View>
  );
}

type DurationPart = { value: number; unit: 'mois' | 'j' | 'h' };

// « 15 mois 10 j 21 h » — zéros de tête omis, heures toujours affichées.
function durationParts(minutes: number): DurationPart[] {
  const t = watchTime(minutes);
  const parts: DurationPart[] = [];
  if (t.months) parts.push({ value: t.months, unit: 'mois' });
  if (t.days || t.months) parts.push({ value: t.days, unit: 'j' });
  parts.push({ value: t.hours, unit: 'h' });
  return parts;
}

// Les statistiques all-time sont regroupées par univers : le total reste
// immédiatement scannable et les unités de durée peuvent se réorganiser sans
// être tronquées sur les petits écrans.
function StatsSummary({ stats }: { stats: ProfileStatsDto }) {
  const groups: {
    key: string;
    title: string;
    icon?: keyof typeof Feather.glyphMap;
    ionicon?: keyof typeof Ionicons.glyphMap;
    count: string;
    countLabel: string;
    minutes: number;
    durationLabel: string;
  }[] = [
    {
      key: 'episodes',
      title: 'Épisodes',
      icon: 'tv',
      count: stats.episodesWatched.toLocaleString('fr-FR'),
      countLabel: 'Vus',
      minutes: stats.showMinutes,
      durationLabel: 'Temps de visionnage',
    },
    {
      key: 'movies',
      title: 'Films',
      icon: 'film',
      count: stats.moviesWatched.toLocaleString('fr-FR'),
      countLabel: 'Vus',
      minutes: stats.movieMinutes,
      durationLabel: 'Temps de visionnage',
    },
    {
      key: 'games',
      title: 'Jeux',
      ionicon: 'game-controller-outline',
      count: stats.gamesPlayed.toLocaleString('fr-FR'),
      countLabel: 'Joués',
      minutes: stats.gamePlaytimeMinutes ?? 0,
      durationLabel: 'Temps de jeu',
    },
  ];

  return (
    <View style={styles.statsSummary}>
      {groups.map((group, index) => {
        const time = durationParts(group.minutes);
        const spokenDuration = time.map(({ value, unit }) => value + ' ' + unit).join(' ');
        return (
          <AppearItem key={group.key} index={index}>
            <View
              style={[styles.statRow, index > 0 && styles.statRowBorder]}
              accessible
              accessibilityLabel={
                group.title +
                '. ' +
                group.count +
                ' ' +
                group.countLabel.toLowerCase() +
                '. ' +
                group.durationLabel +
                ' : ' +
                spokenDuration +
                '.'
              }
            >
              {/* Bloc gauche : univers + total (icône, libellé, grand nombre, unité). */}
              <View style={styles.statBlock}>
                <View style={styles.statIcon}>
                  {group.ionicon ? (
                    <Ionicons name={group.ionicon} size={18} color={COLORS.primary} />
                  ) : (
                    <Feather name={group.icon ?? 'activity'} size={18} color={COLORS.primary} />
                  )}
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statTitle}>{group.title}</Text>
                  <Text style={styles.statCountValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {group.count}
                  </Text>
                  <Text style={styles.statMeta}>{group.countLabel}</Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              {/* Bloc droit : temps cumulé (icône horloge + durée + libellé). */}
              <View style={styles.statBlock}>
                <View style={styles.statClock}>
                  <Feather name="clock" size={16} color={COLORS.primary} />
                </View>
                <View style={styles.statCol}>
                  <View style={styles.durationParts}>
                    {time.map(({ value, unit }) => (
                      <View key={unit} style={styles.durationPart}>
                        <Text style={styles.durationValue}>{value}</Text>
                        <Text style={styles.durationUnit}>{unit}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.statMeta}>{group.durationLabel}</Text>
                </View>
              </View>
            </View>
          </AppearItem>
        );
      })}
    </View>
  );
}

function Counter({ icon, n, label, border, onPress }: { icon: keyof typeof Feather.glyphMap; n: number; label: string; border?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.counter, border && styles.counterBorder, pressed && styles.counterPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${n} ${label}`}
      accessibilityHint={'Ouvre le détail de cette activité sociale'}
    >
      <View style={styles.counterHead}>
        <Feather name={icon} size={13} color={COLORS.primary} />
        <Text style={styles.counterN}>{n}</Text>
      </View>
      <Text style={styles.counterL}>{label}</Text>
    </Pressable>
  );
}

// Carte « Listes » : collage des affiches + titre en surimpression.
function ListCollageCard({ title, posterPaths, width }: { title: string; posterPaths: string[]; width: number }) {
  return (
    <View style={[styles.listcard, { width }]} accessible accessibilityLabel={`Liste ${title}`}>
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {(posterPaths.length ? posterPaths.slice(0, 4) : [null]).map((p, i) => (
            <View key={i} style={styles.listPosterSlot}>
              {p ? <Image source={{ uri: tmdbImage(p, 'w342') ?? p }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
            </View>
          ))}
        </View>
      </View>
      <LinearGradient colors={['transparent', 'rgba(13, 8, 28, 0.88)']} style={StyleSheet.absoluteFill} />
      <Text style={styles.listTitle}>{title}</Text>
    </View>
  );
}

function PosterRow({
  title,
  items,
  heart,
  isMovie,
  isGame,
  emptyLabel,
  href,
  posterWidth,
}: {
  title: string;
  items: MediaDto[];
  heart?: boolean;
  isMovie?: boolean;
  isGame?: boolean;
  emptyLabel: string;
  href: string;
  posterWidth: number;
}) {
  const router = useRouter();
  return (
    <View style={styles.posterCard}>
      {/* Toute la ligne de titre ouvre la page dédiée. */}
      <Pressable
        style={({ pressed }) => [styles.sectHead, pressed && styles.sectHeadPressed]}
        onPress={() => router.push(href as Parameters<typeof router.push>[0])}
        accessibilityRole="button"
        accessibilityLabel={`Ouvrir ${title}`}
        accessibilityHint="Affiche toute la collection"
      >
        <View style={styles.posterTitleRow}>
          {/* Favoris → pastille cœur rose ; sinon icône colorée de l'univers. */}
          {heart ? (
            <View style={styles.heartBadge}>
              <Feather name="heart" size={13} color="#FFFFFF" />
            </View>
          ) : (
            <View style={[styles.sectIcon, { backgroundColor: COLORS.primarySoft }]}>
              {isGame ? (
                <Ionicons name="game-controller" size={14} color={COLORS.primary} />
              ) : (
                <Feather name={isMovie ? 'film' : 'tv'} size={14} color={COLORS.primary} />
              )}
            </View>
          )}
          <Text style={styles.sectTitle} numberOfLines={1}>{title}</Text>
        </View>
        <View style={styles.sectAction}>
          <Text style={styles.sectActionText}>Tout afficher</Text>
          <Feather name="chevron-right" size={16} color={COLORS.primary} />
        </View>
      </Pressable>
      {items.length === 0 ? (
        // Section toujours visible, avec un état vide.
        <View style={styles.emptyRow}>
          <View style={styles.emptyPoster}>
            {isGame ? (
              <Ionicons name="game-controller-outline" size={22} color={COLORS.primary} />
            ) : (
              <Feather name={isMovie ? 'film' : 'tv'} size={22} color={COLORS.primary} />
            )}
          </View>
          <Text style={styles.emptyRowText}>{emptyLabel}</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaContent}>
          {items.map((m) => (
            <Poster
              key={m.id}
              title={m.title}
              uri={tmdbImage(m.posterPath)}
              width={posterWidth}
              onPress={() => router.push((isGame ? `/game/${m.id}` : `/show/${m.id}${isMovie ? '?type=movie' : ''}`) as Href)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.pageMuted },
  screenContent: { flexGrow: 1, paddingBottom: SIZES.tabBar + SPACE.xl },
  canvas: { width: '100%', maxWidth: SIZES.contentMax, alignSelf: 'center' },
  body: { paddingHorizontal: SPACE.md, paddingTop: SPACE.md },
  // COVER pleine largeur (maquette) : remonte sous la barre d'état, coins bas
  // arrondis ; la carte des compteurs chevauche son bord inférieur.
  cover: {
    minHeight: 236,
    paddingHorizontal: SPACE.md,
    paddingBottom: SPACE.lg,
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: '#241B3D',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...SHADOW.card,
  },
  prismShape: { position: 'absolute', opacity: 0.8 },
  prismShapePrimary: { width: 210, height: 210, borderRadius: 105, backgroundColor: COLORS.primary, right: -50, top: -18 },
  prismShapeSecondary: { width: 150, height: 150, borderRadius: 40, backgroundColor: COLORS.secondary, right: 120, top: 60 },
  prismShapeTertiary: { width: 110, height: 110, borderRadius: 55, backgroundColor: COLORS.tertiary, left: -24, bottom: 30 },
  // Boutons ronds partage + réglages, calés en haut à droite de la cover.
  coverTopBar: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACE.xs },
  coverBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(17,11,35,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  coverBtnPressed: { backgroundColor: 'rgba(17,11,35,0.62)', transform: [{ scale: 0.97 }] },
  coverBottom: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  avatarWrap: { flexShrink: 0 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: COLORS.primary,
  },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  avatarInit: { color: '#FFFFFF', fontSize: 32, fontFamily: FONTS.extraBold },
  // Badge de niveau incrusté en bas à droite de l'avatar (maquette).
  levelBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    minWidth: 27,
    height: 27,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  levelBadgeText: { color: '#FFFFFF', fontSize: 12, lineHeight: 15, fontFamily: FONTS.extraBold },
  identityCopy: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, color: '#FFFFFF', fontSize: 24, lineHeight: 29, fontFamily: FONTS.extraBold },
  // Pastille de certification (décorative, alignée sur la maquette).
  verifiedBadge: {
    width: 18,
    height: 18,
    flexShrink: 0,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelLine: { color: 'rgba(255,255,255,0.86)', fontSize: 13.5, lineHeight: 18, fontFamily: FONTS.semiBold, marginTop: 3 },
  // Compteurs sociaux — carte qui CHEVAUCHE le bas de la cover.
  counters: {
    flexDirection: 'row',
    marginHorizontal: SPACE.md,
    marginTop: -26,
    zIndex: 2,
    overflow: 'hidden',
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
    ...SHADOW.card,
  },
  counter: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: SPACE.sm, paddingHorizontal: SPACE.xxs },
  counterPressed: { backgroundColor: COLORS.primarySoft },
  counterBorder: { borderLeftWidth: 1, borderLeftColor: COLORS.borderLight },
  counterHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  counterN: { color: COLORS.text, fontSize: 18, lineHeight: 22, fontFamily: FONTS.extraBold },
  counterL: { color: COLORS.textMuted, fontFamily: FONTS.medium, fontSize: 11, textAlign: 'center' },
  // Résumé des statistiques : une seule surface, trois univers lisibles.
  statsSummary: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
    ...SHADOW.card,
  },
  statRow: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.sm,
  },
  // Séparateur pointillé entre univers (maquette).
  statRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border, borderStyle: 'dashed' },
  statBlock: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.control,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statClock: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statCol: { flex: 1, minWidth: 0 },
  statTitle: { color: COLORS.textMuted, fontSize: 12.5, lineHeight: 16, fontFamily: FONTS.semiBold },
  statCountValue: { color: COLORS.text, fontSize: 20, lineHeight: 24, fontFamily: FONTS.extraBold },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: COLORS.borderLight, marginHorizontal: SPACE.sm },
  durationParts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', columnGap: SPACE.xs, rowGap: 0 },
  durationPart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  durationValue: { color: COLORS.text, fontSize: 16, lineHeight: 20, fontFamily: FONTS.extraBold },
  durationUnit: { color: COLORS.textMuted, fontSize: 11, lineHeight: 15, fontFamily: FONTS.semiBold },
  statMeta: { color: COLORS.textSoft, fontSize: 11, lineHeight: 15, fontFamily: FONTS.medium, marginTop: 1 },
  // Encart streak → Trophées.
  streakCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    padding: SPACE.md,
    marginTop: SPACE.sm,
    marginBottom: SPACE.xs,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
    ...SHADOW.card,
  },
  streakIcon: {
    width: 40, height: 40, flexShrink: 0, borderRadius: RADIUS.control, backgroundColor: COLORS.yellow,
    alignItems: 'center', justifyContent: 'center',
  },
  streakTitle: { fontSize: 16, lineHeight: 21, fontFamily: FONTS.extraBold, color: COLORS.text },
  streakSub: { fontSize: 13, lineHeight: 18, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 1 },
  cardPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  section: { paddingVertical: SPACE.sm },
  sectHead: { minHeight: SIZES.touch, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.xs },
  // Titre de section : petite icône colorée + libellé (maquette).
  sectTitleRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  sectIcon: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  // Titre délimiteur « Récompenses » : espace au-dessus (séparation d'avec les
  // statistiques) ; la carte Trophées qui suit apporte son propre marginTop.
  rewardsHead: { marginTop: SPACE.md, marginBottom: 0 },
  sectHeadPressed: { opacity: 0.8 },
  sectTitle: { flexShrink: 1, color: COLORS.text, fontSize: 16.5, lineHeight: 21, fontFamily: FONTS.bold },
  sectAction: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
  sectActionPressed: { opacity: 0.7 },
  sectActionText: { color: COLORS.primary, fontSize: 13, fontFamily: FONTS.bold },
  listsContent: { gap: SPACE.sm, paddingBottom: SPACE.xxs },
  listcard: { height: 148, borderRadius: RADIUS.card, backgroundColor: '#241B3D', justifyContent: 'flex-end', padding: SPACE.md, overflow: 'hidden', ...SHADOW.card },
  listPosterSlot: { flex: 1, backgroundColor: COLORS.imagePlaceholder },
  listTitle: { color: '#FFFFFF', fontSize: 19, lineHeight: 25, fontFamily: FONTS.extraBold },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: SPACE.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  dotActive: { width: 18, backgroundColor: COLORS.primary },
  // Sections de collection en carte (raccord avec le reste du profil).
  posterCard: {
    marginVertical: SPACE.xs,
    padding: SPACE.sm,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
    ...SHADOW.card,
  },
  posterTitleRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  heartBadge: { width: 27, height: 27, borderRadius: 9, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  mediaContent: { gap: 8, paddingBottom: SPACE.xxs },
  emptyRow: { minHeight: 104, flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.sm, borderRadius: RADIUS.control, backgroundColor: COLORS.surfaceMuted },
  emptyPoster: { width: 56, height: 78, flexShrink: 0, borderRadius: RADIUS.poster, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyRowText: { flex: 1, color: COLORS.textMuted, fontFamily: FONTS.regular, fontSize: 14, lineHeight: 20 },
});
