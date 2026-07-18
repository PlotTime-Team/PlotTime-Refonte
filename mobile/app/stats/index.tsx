import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { watchTime } from '@/lib/format';
import { COLORS, FONTS, RADIUS, SHADOW, SIZES, SPACE } from '@/lib/theme';
import { PageHeader } from '@/components/PageHeader';
import { TopTabs, Loading, LoadError } from '@/components/ui';
import { AppearItem } from '@/components/anim';

type Bar = { label: string };
type SeriesStats = {
  episodesWatched: number; episodesLast7d: number; minutes: number;
  showsAdded: number; showsInProduction: number;
  weekly: (Bar & { episodes: number; hours: number })[];
  genres: { name: string; count: number }[];
  networks: { name: string; count: number }[];
  marathons: { title: string; episodes: number; hours: number }[];
};
type MovieStats = {
  moviesWatched: number; moviesLast7d: number; minutes: number; moviesAdded: number;
  weekly: (Bar & { count: number; hours: number })[];
  genres: { name: string; count: number }[];
};
type Detailed = { series: SeriesStats; movies: MovieStats };

export default function StatsScreen() {
  const [tab, setTab] = useState('SÉRIES');
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['stats', 'detailed'],
    queryFn: () => api.get<Detailed>('/api/stats/detailed'),
    staleTime: 5 * 60_000,
  });

  return (
    <View style={styles.screen}>
      <PageHeader title="Statistiques" />
      <View style={styles.tabsBar}>
        <View style={styles.canvas}>
          <TopTabs tabs={['SÉRIES', 'FILMS']} active={tab} onChange={setTab} />
        </View>
      </View>
      {isLoading ? (
        <Loading />
      ) : isError || !data ? (
        <LoadError onRetry={refetch} busy={isRefetching} />
      ) : tab === 'SÉRIES' ? (
        <SeriesTab s={data.series} />
      ) : (
        <MoviesTab m={data.movies} />
      )}
    </View>
  );
}

function SeriesTab({ s }: { s: SeriesStats }) {
  const t = watchTime(s.minutes);
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.canvas}>
        <View style={styles.list}>
          <AppearItem index={0}>
            <BigCard
              eyebrow="Séries · Temps de visionnage"
              title="Temps passé devant des épisodes"
              bigParts={[[t.months, 'MOIS'], [t.days, 'JOURS'], [t.hours, 'HEURES']]}
              compareHref="/stats/leaderboard?type=series"
            />
          </AppearItem>
          <AppearItem index={1}>
            <Card title="Nombre total d'épisodes vus" icon="tv">
              <Text style={styles.huge}>{s.episodesWatched.toLocaleString('fr-FR')}</Text>
              <Text style={styles.sub}>{s.episodesLast7d} lors des 7 derniers jours</Text>
            </Card>
          </AppearItem>
          <AppearItem index={2}>
            <Card title="Épisodes vus (par semaine)" icon="bar-chart-2">
              <BarChart data={s.weekly.map((w) => ({ label: w.label, value: w.episodes }))} unit="ÉPISODES" />
            </Card>
          </AppearItem>
          <AppearItem index={3}>
            <Card title="Temps passé (par semaine)" icon="clock">
              <BarChart data={s.weekly.map((w) => ({ label: w.label, value: w.hours }))} unit="HEURES" />
            </Card>
          </AppearItem>
          <AppearItem index={4}>
            <Card title="Séries ajoutées" icon="plus-circle">
              <Text style={styles.huge}>{s.showsAdded}</Text>
              <Text style={styles.sub}>{s.showsInProduction} toujours en production</Text>
            </Card>
          </AppearItem>
          <AppearItem index={5}>
            <RankCard title="Meilleurs genres de séries" col="SÉRIES" rows={s.genres.map((g) => [g.name, g.count])} />
          </AppearItem>
          <AppearItem index={6}>
            <RankCard title="Meilleures chaînes de séries" col="SÉRIES" rows={s.networks.map((n) => [n.name, n.count])} />
          </AppearItem>
          {s.marathons.length ? (
            <AppearItem index={7}>
              <RankCard title="Plus longs marathons" col="ÉPISODES" rows={s.marathons.map((m) => [m.title, m.episodes])} />
            </AppearItem>
          ) : null}
          <AppearItem index={8}>
            <BadgesCard />
          </AppearItem>
        </View>
      </View>
    </ScrollView>
  );
}

function MoviesTab({ m }: { m: MovieStats }) {
  const t = watchTime(m.minutes);
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.canvas}>
        <View style={styles.list}>
          <AppearItem index={0}>
            <BigCard
              eyebrow="Films · Temps de visionnage"
              title="Temps passé à regarder des films"
              bigParts={[[t.months, 'MOIS'], [t.days, 'JOURS'], [t.hours, 'HEURES']]}
              compareHref="/stats/leaderboard?type=movies"
            />
          </AppearItem>
          <AppearItem index={1}>
            <Card title="Nombre total de films vus" icon="film">
              <Text style={styles.huge}>{m.moviesWatched.toLocaleString('fr-FR')}</Text>
              <Text style={styles.sub}>{m.moviesLast7d} lors des 7 derniers jours</Text>
            </Card>
          </AppearItem>
          <AppearItem index={2}>
            <Card title="Films vus (par semaine)" icon="bar-chart-2">
              <BarChart data={m.weekly.map((w) => ({ label: w.label, value: w.count }))} unit="FILMS" />
            </Card>
          </AppearItem>
          <AppearItem index={3}>
            <Card title="Films ajoutés" icon="plus-circle">
              <Text style={styles.huge}>{m.moviesAdded}</Text>
            </Card>
          </AppearItem>
          <AppearItem index={4}>
            <RankCard title="Meilleurs genres de films" col="FILMS" rows={m.genres.map((g) => [g.name, g.count])} />
          </AppearItem>
        </View>
      </View>
    </ScrollView>
  );
}

// --- Composants ---

function Card({ title, icon, children }: { title: string; icon?: keyof typeof Feather.glyphMap; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        {icon ? (
          <View style={styles.cardIcon}>
            <Feather name={icon} size={16} color={COLORS.primary} />
          </View>
        ) : null}
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function BigCard({ eyebrow, title, bigParts, compareHref }: { eyebrow: string; title: string; bigParts: [number, string][]; compareHref?: string }) {
  const router = useRouter();
  return (
    <View style={[styles.card, styles.bigCard]}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.bigCardTitle}>{title}</Text>
      <View style={styles.bigRow}>
        {bigParts.map(([v, l], i) => (
          <View key={i} style={styles.bigPart}>
            <Text style={styles.big}>{v}</Text>
            <Text style={styles.bigUnit}>{l.toLowerCase()}</Text>
          </View>
        ))}
      </View>
      {compareHref ? (
        <Pressable
          style={({ pressed }) => [styles.compare, pressed && styles.comparePressed]}
          onPress={() => router.push(compareHref as Parameters<typeof router.push>[0])}
          accessibilityRole="button"
          accessibilityLabel="Comparer avec les personnes que vous suivez"
        >
          <Text style={styles.compareText}>COMPARER AVEC LES PERSONNES QUE VOUS SUIVEZ</Text>
          <Feather name="chevron-right" size={16} color={COLORS.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

// Carte « Badges » : nombre débloqué + accès à la page des succès.
function BadgesCard() {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ['stats', 'badges'],
    queryFn: () => api.get<{ earned: number; total: number }>('/api/stats/badges'),
    staleTime: 60_000,
  });
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push('/stats/badges')}
      accessibilityRole="button"
      accessibilityLabel="Badges, ouvrir la page des succès"
    >
      <View style={styles.cardHead}>
        <View style={styles.cardIcon}>
          <Feather name="award" size={16} color={COLORS.primary} />
        </View>
        <Text style={styles.cardTitle}>Badges</Text>
        <Feather name="chevron-right" size={22} color={COLORS.primary} />
      </View>
      <Text style={styles.huge}>{data ? data.earned : '…'}</Text>
      {data ? <Text style={styles.sub}>sur {data.total} badges</Text> : null}
    </Pressable>
  );
}

// Graphique en barres maison (pas de lib) — dernière barre en violet (semaine courante).
function BarChart({ data, unit }: { data: { label: string; value: number }[]; unit: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const H = 130;
  return (
    <View style={{ marginTop: SPACE.sm }}>
      <Text style={styles.axis}>{unit}</Text>
      <View style={styles.chartRow}>
        {data.map((d, i) => {
          const last = i === data.length - 1;
          return (
            <View key={i} style={styles.barCol}>
              <Text style={styles.barVal}>{d.value || ''}</Text>
              <View style={[styles.bar, { height: Math.max(2, (d.value / max) * H), backgroundColor: last ? COLORS.primary : COLORS.border }]} />
              <Text style={styles.barLabel}>{d.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function RankCard({ title, col, rows }: { title: string; col: string; rows: [string, number][] }) {
  if (rows.length === 0) return null;
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.cardIcon}>
          <Feather name={title.includes('genre') ? 'tag' : title.includes('chaîne') ? 'radio' : 'zap'} size={16} color={COLORS.primary} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.rankHead}>
        <Text style={styles.rankHeadText}>{title.includes('genre') ? 'GENRE' : title.includes('chaîne') ? 'CHAÎNE' : 'SÉRIE'}</Text>
        <Text style={styles.rankHeadText}>{col}</Text>
      </View>
      {rows.map(([name, count], i) => (
        <View key={i} style={styles.rankRow}>
          <Text style={styles.rankName} numberOfLines={1}>{name}</Text>
          <Text style={styles.rankVal}>{count}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  tabsBar: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  canvas: { width: '100%', maxWidth: SIZES.contentMax, alignSelf: 'center' },
  scroll: { flexGrow: 1, paddingBottom: SPACE.xl },
  list: { padding: SPACE.md, gap: SPACE.sm },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    padding: SPACE.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs, marginBottom: SPACE.xs },
  cardIcon: {
    width: 32, height: 32, flexShrink: 0, borderRadius: RADIUS.control,
    backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { flex: 1, color: COLORS.text, fontSize: 17, lineHeight: 22, fontFamily: FONTS.extraBold },
  bigCard: { backgroundColor: COLORS.surface },
  bigCardTitle: { color: COLORS.text, fontSize: 18, lineHeight: 24, fontFamily: FONTS.extraBold, marginTop: 2 },
  eyebrow: { color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: SPACE.xxs },
  huge: { color: COLORS.text, fontSize: 40, lineHeight: 46, fontFamily: FONTS.extraBold, marginTop: SPACE.xxs },
  bigRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.sm, marginTop: SPACE.xs },
  bigPart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  big: { color: COLORS.text, fontSize: 34, lineHeight: 38, fontFamily: FONTS.extraBold },
  bigUnit: { fontSize: 15, fontFamily: FONTS.regular, color: COLORS.textMuted, marginBottom: 4 },
  sub: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textMuted, textTransform: 'uppercase', marginTop: 2 },
  compare: {
    minHeight: SIZES.touch,
    marginTop: SPACE.md,
    paddingTop: SPACE.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.sm,
  },
  comparePressed: { opacity: 0.7 },
  compareText: { flex: 1, color: COLORS.primary, fontSize: 12.5, fontFamily: FONTS.bold, letterSpacing: 0.3 },
  axis: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: 6 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 165, gap: 3 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barVal: { fontSize: 11, fontFamily: FONTS.bold, marginBottom: 3, color: COLORS.textMuted, height: 14 },
  bar: { width: '72%', borderRadius: RADIUS.small },
  barLabel: { fontSize: 10, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 5 },
  rankHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACE.xs, marginBottom: 4 },
  rankHeadText: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 0.5 },
  rankRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderTopColor: COLORS.borderLight, gap: SPACE.sm },
  rankName: { color: COLORS.text, flex: 1, fontSize: 16, fontFamily: FONTS.regular },
  rankVal: { color: COLORS.text, fontSize: 16, fontFamily: FONTS.bold },
});
