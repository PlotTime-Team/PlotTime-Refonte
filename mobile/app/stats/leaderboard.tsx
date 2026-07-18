import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api, tmdbImage } from '@/lib/api';
import { watchTime } from '@/lib/format';
import { COLORS, FONTS, RADIUS, SIZES, SPACE } from '@/lib/theme';
import { PageHeader } from '@/components/PageHeader';
import { TopTabs, Loading, LoadError, EmptyState } from '@/components/ui';
import { AppearItem } from '@/components/anim';

type Entry = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  minutes: number;
  isMe: boolean;
};
type Leaderboard = { series: Entry[]; movies: Entry[] };

// « 15 mois 10 j 21 h » (les zéros de tête sont omis).
function fmt(minutes: number): string {
  const t = watchTime(minutes);
  const parts: string[] = [];
  if (t.months) parts.push(`${t.months} mois`);
  if (t.days || t.months) parts.push(`${t.days} j`);
  parts.push(`${t.hours} h`);
  return parts.join(' ');
}

// Médaille des trois premiers rangs (or / argent / bronze).
const MEDAL: Record<number, string> = { 1: '#D4A017', 2: '#9AA2AA', 3: '#CD7F32' };

// Classement entre amis (moi + mes abonnements) par temps de visionnage.
export default function LeaderboardScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const [tab, setTab] = useState(type === 'movies' ? 'FILMS' : 'SÉRIES');
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['stats', 'leaderboard'],
    queryFn: () => api.get<Leaderboard>('/api/stats/leaderboard'),
    staleTime: 5 * 60_000,
  });

  const entries = tab === 'FILMS' ? data?.movies : data?.series;

  return (
    <View style={styles.screen}>
      <PageHeader title={tab === 'FILMS' ? 'Temps passé devant des films' : 'Temps passé devant des séries'} />
      <View style={styles.tabsBar}>
        <View style={styles.canvas}>
          <TopTabs tabs={['SÉRIES', 'FILMS']} active={tab} onChange={setTab} />
        </View>
      </View>
      {isLoading ? (
        <Loading />
      ) : isError || !entries ? (
        <LoadError onRetry={refetch} busy={isRefetching} />
      ) : entries.length <= 1 ? (
        <EmptyState
          title="Personne à comparer"
          message="Abonne-toi à des amis depuis Explorer pour voir le classement."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.canvas}>
            <View style={styles.head}>
              <Text style={styles.headText}>CLASSEMENT</Text>
              <Text style={styles.headText}>TEMPS PASSÉ</Text>
            </View>
            {entries.map((e, i) => {
              const rank = i + 1;
              const medal = MEDAL[rank];
              return (
                <AppearItem key={e.userId} index={i}>
                  <View style={[styles.row, e.isMe && styles.rowMe]}>
                    <View style={[styles.rankWrap, medal ? { backgroundColor: medal } : null]}>
                      <Text style={[styles.rank, medal ? styles.rankMedal : null]}>{rank}</Text>
                    </View>
                    {e.avatarUrl ? (
                      <Image source={{ uri: tmdbImage(e.avatarUrl, 'w185') ?? e.avatarUrl }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarEmpty]}>
                        <Text style={styles.avatarInit}>{e.displayName.slice(0, 1).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>{e.displayName}</Text>
                      {e.isMe ? <Text style={styles.me}>vous</Text> : null}
                    </View>
                    <Text style={styles.time}>{fmt(e.minutes)}</Text>
                  </View>
                </AppearItem>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  tabsBar: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  canvas: { width: '100%', maxWidth: SIZES.contentMax, alignSelf: 'center' },
  scroll: { flexGrow: 1, paddingBottom: SPACE.xl },
  head: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm },
  headText: { fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 0.6, color: COLORS.textMuted },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
    marginHorizontal: SPACE.md, marginBottom: SPACE.xs,
    paddingHorizontal: SPACE.sm, paddingVertical: SPACE.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.card,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  rowMe: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  rankWrap: {
    width: 30, height: 30, borderRadius: RADIUS.pill, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceMuted,
  },
  rank: { color: COLORS.textMuted, fontSize: 15, fontFamily: FONTS.extraBold },
  rankMedal: { color: '#FFFFFF' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  avatarInit: { color: '#fff', fontSize: 19, fontFamily: FONTS.extraBold },
  name: { color: COLORS.text, fontSize: 16, fontFamily: FONTS.bold },
  me: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.primary, marginTop: 1 },
  time: { color: COLORS.text, fontSize: 15, fontFamily: FONTS.extraBold },
});
