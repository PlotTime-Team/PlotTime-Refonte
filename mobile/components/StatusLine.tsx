import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACE } from '@/lib/theme';

// Ligne de suivi partagée (fiches jeu / série / film / animé) — recalée sur la
// maquette (mesures 2026-07-24) : PILULES FINES EN LIGNE (icône à gauche du
// libellé, ~36dp), posées directement sur la carte (pas de conteneur), pilule
// active violette pleine. Même API qu'avant : aucune logique changée.
// `allowDeselect` : re-taper le statut actif le retire (onChange(null)) —
// activé uniquement quand l'API le permet sans effet destructeur.
export type StatusOption = { value: string; label: string; icon?: keyof typeof Feather.glyphMap };

// Icônes par défaut par statut (série/film/jeu partagent les mêmes valeurs).
const STATUS_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  watchlist: 'bookmark',
  wishlist: 'bookmark',
  watching: 'play-circle',
  playing: 'play-circle',
  completed: 'check-circle',
  abandoned: 'x-circle',
};

export function StatusLine({
  options,
  value,
  onChange,
  accessibilityLabel,
  disabled,
  allowDeselect,
}: {
  options: StatusOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  allowDeselect?: boolean;
}) {
  return (
    <View
      style={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((o) => {
        const selected = value === o.value;
        const icon = o.icon ?? STATUS_ICONS[o.value] ?? 'circle';
        return (
          <Pressable
            key={o.value}
            style={({ pressed }) => [
              styles.pill,
              selected && styles.pillSel,
              pressed && !disabled && styles.pillPressed,
              disabled && styles.pillDisabled,
            ]}
            onPress={() => {
              if (selected) {
                if (allowDeselect) onChange(null);
                return;
              }
              onChange(o.value);
            }}
            disabled={disabled}
            // Pilules fines (36) : hitSlop vertical pour garder une cible
            // tactile confortable (~44) sans épaissir la ligne.
            hitSlop={{ top: 4, bottom: 4 }}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityHint={
              selected && allowDeselect ? 'Re-taper retire ce statut' : undefined
            }
            accessibilityState={{ checked: selected, disabled: !!disabled, busy: !!disabled }}
          >
            <Feather
              name={icon}
              size={14}
              color={selected ? COLORS.onPrimary : COLORS.textMuted}
            />
            <Text
              style={[styles.pillText, selected && styles.pillTextSel]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 36,
    paddingHorizontal: SPACE.sm - 1,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surfaceMuted,
  },
  pillSel: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  pillPressed: {
    opacity: 0.78,
  },
  pillDisabled: {
    opacity: 0.48,
  },
  pillText: {
    color: COLORS.text,
    fontFamily: FONTS.semiBold,
    fontSize: 12,
  },
  pillTextSel: {
    color: COLORS.onPrimary,
    fontFamily: FONTS.bold,
  },
});
