import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Platform, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, FONTS, RADIUS, SHADOW, SIZES, SPACE } from '@/lib/theme';
import { PressableScale } from '@/components/anim';

// ============================================================================
// Primitives PARTAGÉES des fiches série / film / jeu (refonte maquettes
// 2026-07-23) : bannière défilante, boutons ronds épinglés, carte d'identité
// avec jaquette flottante à liseré, tuiles de stats, cartes de section à
// pastille d'icône, rangées libellé/valeur, anneau de progression, coche
// d'épisode. Un seul langage visuel pour les trois fiches — thémable (tokens).
// ============================================================================

// Boutons d'action ÉPINGLÉS au-dessus de la bannière (retour / cœur / menu) :
// hors du défilement, toujours accessibles. Verre sombre lisible sur bannière
// claire comme sur les cartes une fois la page défilée.
export function FicheTopActions({
  topInset,
  onBack,
  backLabel,
  favorite,
  onMenu,
}: {
  topInset: number;
  onBack: () => void;
  backLabel: string;
  favorite?: { on: boolean; busy?: boolean; onPress: () => void };
  onMenu: () => void;
}) {
  return (
    <View style={[styles.actionsRow, { top: topInset + SPACE.xs }]} pointerEvents="box-none">
      <PressableScale
        style={styles.actionBtn}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
      >
        <Feather name="arrow-left" size={22} color="#FFFFFF" />
      </PressableScale>
      <View style={styles.actionsGroup}>
        {favorite ? (
          <PressableScale
            style={styles.actionBtn}
            onPress={favorite.onPress}
            disabled={favorite.busy}
            accessibilityRole="button"
            accessibilityLabel={favorite.on ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            accessibilityState={{ selected: favorite.on, disabled: !!favorite.busy, busy: !!favorite.busy }}
          >
            <Feather name="heart" size={20} color={favorite.on ? '#FF77B8' : '#FFFFFF'} />
          </PressableScale>
        ) : null}
        <PressableScale
          style={styles.actionBtn}
          onPress={onMenu}
          accessibilityRole="button"
          accessibilityLabel="Options"
          accessibilityHint="Ouvre les actions de personnalisation et de suivi"
        >
          <Feather name="more-horizontal" size={22} color="#FFFFFF" />
        </PressableScale>
      </View>
    </View>
  );
}

// Bannière pleine largeur qui DÉFILE avec le contenu (plus d'en-tête
// rétractable). Léger voile en bas pour asseoir la carte d'identité qui la
// chevauche. Barre de progression optionnelle (séries) épinglée EN HAUT, juste
// sous la zone système (`topInset`) : la carte d'identité chevauchant le bas
// masquait la barre au ras du bas (on n'en voyait que les deux bouts) ; en haut
// elle est visible bord à bord d'un coup d'œil (retour Étienne 2026-07-24).
export function FicheBanner({
  uri,
  height,
  fallback,
  progress,
  topInset = 0,
}: {
  uri: string | null;
  height: number;
  fallback: React.ReactNode;
  progress?: { pct: number; fill: string; track: string } | null;
  topInset?: number;
}) {
  return (
    <View style={[styles.banner, { height }]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessible={false} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.bannerFallback]} accessible={false}>
          <View style={styles.bannerPrismOne} />
          <View style={styles.bannerPrismTwo} />
          {fallback}
        </View>
      )}
      <LinearGradient
        colors={['rgba(12,7,28,0.10)', 'rgba(12,7,28,0.02)', 'rgba(12,7,28,0.30)']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {progress ? (
        <View
          style={[styles.bannerProgressTrack, { top: topInset, backgroundColor: progress.track }]}
          accessible
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress.pct) }}
        >
          <View style={[styles.bannerProgressFill, { width: `${Math.min(100, Math.max(0, progress.pct))}%`, backgroundColor: progress.fill }]} />
        </View>
      ) : null}
    </View>
  );
}

// Carte d'identité : chevauche la bannière, jaquette flottante à liseré clair
// à gauche, badge de type + titre + méta à droite, puis la rangée de tuiles.
// La jaquette est PROPORTIONNELLE à la largeur (~33 %, cotes maquette) : à
// taille fixe, elle paraissait minuscule sur les écrans larges et toute la
// carte semblait « grossière » (retour Étienne 2026-07-24).
export function FicheIdentity({
  posterUri,
  posterFallback,
  posterLabel,
  badge,
  title,
  children,
  tiles,
}: {
  posterUri: string | null;
  posterFallback: React.ReactNode;
  posterLabel: string;
  badge: string;
  title: string;
  children?: React.ReactNode;
  tiles?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const frameW = Math.min(140, Math.max(104, Math.round(Math.min(width, SIZES.contentMax) * 0.305)));
  return (
    <View style={styles.identityCard}>
      <View style={styles.identityRow}>
        <View style={[styles.posterFrame, { width: frameW }]}>
          {posterUri ? (
            <Image source={{ uri: posterUri }} style={[styles.poster, { width: frameW - 8 }]} resizeMode="cover" accessibilityLabel={posterLabel} />
          ) : (
            <View style={[styles.poster, styles.posterEmpty, { width: frameW - 8 }]}>{posterFallback}</View>
          )}
        </View>
        <View style={styles.identityCopy}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText} maxFontSizeMultiplier={1.15}>{badge}</Text>
          </View>
          <Text accessibilityRole="header" style={styles.identityTitle} maxFontSizeMultiplier={1.15}>{title}</Text>
          {children}
        </View>
      </View>
      {tiles}
    </View>
  );
}

// Onglets « À propos / Épisodes » DANS la carte d'identité (maquette) :
// conteneur lavande, onglet actif en pilule claire à texte violet.
export function FicheTabs({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  accessibilityLabel: string;
}) {
  return (
    <View style={styles.tabsWrap} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={[styles.tab, selected && styles.tabOn]}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected }}
          >
            <Text style={[styles.tabText, selected && styles.tabTextOn]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Tuile de stat (rangée de 3 sous la carte d'identité) : icône + valeur en
// gras / sous-libellé, ou un texte multi-lignes (genres). `onPress` la rend
// interactive (bascule note joueurs / presse de la fiche jeu) — `corner`
// affiche alors le petit indicateur d'action dans le coin.
export function StatTile({
  icon,
  value,
  sub,
  text,
  a11y,
  onPress,
  corner,
}: {
  icon: React.ReactNode;
  value?: string;
  sub?: string;
  text?: string;
  a11y: string;
  onPress?: () => void;
  corner?: React.ReactNode;
}) {
  const body = (
    <>
      <View style={styles.statIcon} accessible={false}>{icon}</View>
      <View style={styles.statCopy}>
        {text != null ? (
          <Text style={styles.statText} numberOfLines={3} maxFontSizeMultiplier={1.2}>{text}</Text>
        ) : (
          <>
            <Text style={styles.statValue} numberOfLines={1} maxFontSizeMultiplier={1.2}>{value}</Text>
            {sub ? <Text style={styles.statSub} numberOfLines={2} maxFontSizeMultiplier={1.2}>{sub}</Text> : null}
          </>
        )}
      </View>
      {corner ? <View style={styles.statCorner} accessible={false}>{corner}</View> : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.statTile, pressed && styles.statTilePressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11y}
      >
        {body}
      </Pressable>
    );
  }
  return (
    <View style={styles.statTile} accessible accessibilityRole="text" accessibilityLabel={a11y}>
      {body}
    </View>
  );
}

export function StatTiles({ children }: { children: React.ReactNode }) {
  return <View style={styles.statRow}>{children}</View>;
}

// Carte de section : pastille d'icône ronde + titre + accessoire à droite.
// `flush` retire le padding horizontal du contenu (rails défilants).
export function FicheSection({
  icon,
  title,
  trailing,
  children,
  flush,
  style,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  flush?: boolean;
  style?: object;
}) {
  return (
    <View style={[styles.sectionCard, flush && styles.sectionFlush, style]}>
      <View style={[styles.sectionHead, flush && styles.sectionHeadFlush]}>
        <View style={styles.sectionChip} accessible={false}>
          <Feather name={icon} size={15} color={COLORS.primary} />
        </View>
        <Text accessibilityRole="header" style={styles.sectionTitle} numberOfLines={2} maxFontSizeMultiplier={1.2}>{title}</Text>
        {trailing}
      </View>
      {children}
    </View>
  );
}

// Rangée libellé / valeur des cartes « Informations ». `align="right"` :
// valeur alignée à droite (fiche jeu, maquette) ; sinon deux colonnes.
export function InfoRow({
  icon,
  label,
  value,
  align = 'left',
}: {
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  align?: 'left' | 'right';
}) {
  return (
    <View style={styles.infoRow} accessible accessibilityRole="text" accessibilityLabel={`${label} : ${value}`}>
      {icon ? (
        <View style={styles.infoIcon} accessible={false}>
          <Feather name={icon} size={13} color={COLORS.primary} />
        </View>
      ) : null}
      <Text style={[styles.infoLabel, icon ? null : styles.infoLabelWide]} maxFontSizeMultiplier={1.2}>{label}</Text>
      <Text style={[styles.infoValue, align === 'right' && styles.infoValueRight]} maxFontSizeMultiplier={1.2}>{value}</Text>
    </View>
  );
}

// Anneau de progression (carte « Ma progression ») : arc violet sur piste
// lavande, contenu libre au centre (pourcentage + libellé).
export function ProgressRing({
  size,
  stroke,
  pct,
  children,
}: {
  size: number;
  stroke: number;
  pct: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} accessible={false}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={COLORS.primarySoft} strokeWidth={stroke} fill="none" />
        {clamped > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={COLORS.primary}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${c}`}
            strokeDashoffset={c * (1 - clamped / 100)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      </View>
    </View>
  );
}

// Coche d'épisode (maquette) : vue = disque vert à coche blanche ; non vue =
// anneau lavande vide. `size` grand pour les coches de saison / maîtresse.
export function EpisodeCheck({
  checked,
  onPress,
  size = 30,
  disabled,
  label,
}: {
  checked: boolean;
  onPress?: () => void;
  size?: number;
  disabled?: boolean;
  label?: string;
}) {
  const inner = (
    <View
      style={[
        styles.epCheck,
        { width: size, height: size, borderRadius: size / 2 },
        checked ? styles.epCheckOn : null,
      ]}
    >
      {checked ? <Feather name="check" size={size * 0.55} color="#FFFFFF" /> : null}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={({ pressed }) => (pressed && !disabled ? { opacity: 0.7 } : null)}
      accessibilityRole="checkbox"
      accessibilityLabel={label ?? 'Épisode vu'}
      accessibilityState={{ checked, disabled: !!disabled }}
    >
      {inner}
    </Pressable>
  );
}

// « 8,2/10 » TMDb → « 4,1 » ; « 89/100 » IGDB → « 4,5 » (échelle maquette /5).
export function rating5(value: number, scale: 10 | 100): string {
  const v = Math.max(0, Math.min(5, value / (scale / 5)));
  return v.toFixed(1).replace('.', ',');
}

const styles = StyleSheet.create({
  actionsRow: {
    position: 'absolute',
    left: SPACE.md,
    right: SPACE.md,
    zIndex: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionsGroup: { flexDirection: 'row', gap: SPACE.xs },
  actionBtn: {
    width: SIZES.touch,
    height: SIZES.touch,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16,10,26,0.46)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.30)',
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(10px)' } as object) : null),
  },
  banner: {
    width: '100%',
    backgroundColor: '#171120',
    overflow: 'hidden',
  },
  bannerFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#3E2678' },
  bannerPrismOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 44,
    backgroundColor: 'rgba(239,91,168,0.30)',
    transform: [{ rotate: '28deg' }],
    top: -88,
    right: -34,
  },
  bannerPrismTwo: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 38,
    backgroundColor: 'rgba(243,197,79,0.24)',
    transform: [{ rotate: '-24deg' }],
    bottom: -98,
    left: -42,
  },
  // Barre de progression EN HAUT de la bannière (bord à bord, sous la zone
  // système) : 5px, coins arrondis au remplissage pour un rendu net.
  bannerProgressTrack: { position: 'absolute', left: 0, right: 0, height: 5 },
  bannerProgressFill: { height: '100%', borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  identityCard: {
    marginTop: -SPACE.xxl,
    marginHorizontal: SPACE.sm,
    padding: 14,
    borderRadius: RADIUS.sheet,
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  // Jaquette flottante : dépasse de la carte vers la bannière, liseré épais
  // de la couleur de la carte (façon cadre) + ombre.
  // Largeur de la jaquette : posée dynamiquement (~33 % de la largeur).
  posterFrame: {
    marginTop: -SPACE.xxl - SPACE.md,
    borderRadius: RADIUS.card + 4,
    backgroundColor: COLORS.surface,
    padding: 4,
    ...SHADOW.card,
  },
  poster: {
    aspectRatio: 2 / 3,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.imagePlaceholder,
  },
  posterEmpty: { alignItems: 'center', justifyContent: 'center' },
  identityCopy: { flex: 1, minWidth: 0, paddingTop: SPACE.xxs },
  typeBadge: {
    alignSelf: 'flex-start',
    minHeight: 22,
    justifyContent: 'center',
    paddingHorizontal: SPACE.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primarySoft,
  },
  typeBadgeText: {
    color: COLORS.primary,
    fontFamily: FONTS.extraBold,
    fontSize: 10.5,
    letterSpacing: 0.8,
  },
  identityTitle: {
    marginTop: SPACE.xs,
    color: COLORS.text,
    fontFamily: FONTS.extraBold,
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  tabsWrap: {
    flexDirection: 'row',
    marginTop: SPACE.sm,
    padding: 3,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.surfaceMuted,
  },
  tab: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.card - 3,
    paddingHorizontal: SPACE.xs,
  },
  tabOn: {
    backgroundColor: COLORS.surface,
    ...SHADOW.card,
  },
  tabText: { color: COLORS.textMuted, fontFamily: FONTS.bold, fontSize: 13 },
  tabTextOn: { color: COLORS.primary },
  statRow: { flexDirection: 'row', gap: 10, marginTop: SPACE.sm },
  // Tuiles compactes (cotes maquette ≈ 56dp de haut).
  statTile: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 64,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.surfaceMuted,
  },
  statIcon: { flexShrink: 0 },
  statCopy: { flex: 1, minWidth: 0 },
  statTilePressed: { opacity: 0.72 },
  statCorner: {
    position: 'absolute',
    top: 4,
    right: 5,
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  statValue: { color: COLORS.text, fontFamily: FONTS.bold, fontSize: 13.5, lineHeight: 17.5, letterSpacing: -0.2 },
  statSub: { color: COLORS.textMuted, fontFamily: FONTS.medium, fontSize: 11, lineHeight: 14.5, marginTop: 1 },
  // 11.5 + interlettre resserré : « Adventure » tient sans césure dans une
  // tuile de ~96dp à 360dp de large (icône 16 à gauche).
  statText: { color: COLORS.text, fontFamily: FONTS.bold, fontSize: 11.5, lineHeight: 15.5, letterSpacing: -0.2 },
  sectionCard: {
    marginTop: SPACE.sm,
    marginHorizontal: SPACE.sm,
    padding: 14,
    borderRadius: RADIUS.sheet,
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },
  sectionFlush: { paddingHorizontal: 0 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  sectionHeadFlush: { paddingHorizontal: 14 },
  sectionChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  sectionTitle: { flex: 1, minWidth: 0, color: COLORS.text, fontFamily: FONTS.extraBold, fontSize: 15.5, lineHeight: 20 },
  infoRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
  },
  infoIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceMuted,
  },
  infoLabel: { width: 112, color: COLORS.textMuted, fontFamily: FONTS.semiBold, fontSize: 12.5, lineHeight: 17 },
  infoLabelWide: { width: 120 },
  infoValue: { flex: 1, minWidth: 0, color: COLORS.text, fontFamily: FONTS.bold, fontSize: 13, lineHeight: 18 },
  infoValueRight: { textAlign: 'right', fontFamily: FONTS.semiBold },
  // Disque clair même non cochée : l'anneau reste lisible aussi sur les
  // fonds lavande (file « Continuer le suivi »), pas seulement sur carte.
  epCheck: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primarySoft,
    backgroundColor: COLORS.surface,
  },
  epCheckOn: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success,
  },
});
