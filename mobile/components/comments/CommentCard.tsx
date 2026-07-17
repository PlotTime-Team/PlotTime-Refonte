import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '@/lib/theme';
import { api } from '@/lib/api';
import { PopIn } from '@/components/anim';
import { ReportModal } from '@/components/ReportModal';
import type { CommentDto } from './types';
import { dateFr } from './types';

// Carte « Commentaires » (copie TV Time) : avatar, nom, date, corps, cœur ❤️,
// réponses, partager, fil de réponses + composeur inline. Partagée par la
// page plein écran (mobile/app/comments/[id].tsx) et le bottom sheet TikTok.
// Les commentaires DES AUTRES portent une action « Signaler » (drapeau,
// exigence stores UGC) — les siens gardent « Supprimer ».
export function CommentCard(props: {
  comment: CommentDto;
  onHeart: (c: CommentDto) => void;
  onRemove: (c: CommentDto) => void;
  onShare: (c: CommentDto) => void;
  replyOpen: boolean;
  onToggleReplies: () => void;
  isReplying: boolean;
  replyText: string;
  setReplyText: (s: string) => void;
  onPostReply: () => void;
  onOpenUser: (userId: string) => void;
}) {
  const { comment: c, onHeart, onRemove, onShare, replyOpen, onToggleReplies, isReplying, replyText, setReplyText, onPostReply, onOpenUser } = props;

  // Signalement d'un commentaire d'autrui : modal de confirmation partagé
  // (ReportModal), POST /api/report, puis feedback local « Signalé ✓ » sur la
  // rangée (le serveur dédoublonne côté back, pas de toast global ici).
  const [reportTarget, setReportTarget] = useState<CommentDto | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const confirmReport = async () => {
    const target = reportTarget;
    setReportTarget(null);
    if (!target) return;
    setReportedIds((ids) => new Set(ids).add(target.id));
    try {
      await api.post('/api/report', {
        commentId: target.id,
        mediaType: 'comment',
        title: target.body.slice(0, 80),
        reason: 'abuse',
      });
    } catch {
      // Silencieux : le signalement pourra être retenté (état local conservé
      // volontairement pour ne pas inviter au spam).
    }
  };
  const reportAction = (target: CommentDto, size: number) =>
    reportedIds.has(target.id) ? (
      <Text style={styles.reported}>Signalé ✓</Text>
    ) : (
      <Pressable
        onPress={() => setReportTarget(target)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Signaler ce commentaire"
      >
        <Feather name="flag" size={size} color={COLORS.textMuted} />
      </Pressable>
    );

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Pressable style={styles.avatar} onPress={() => onOpenUser(c.user.id)}>
          <Text style={styles.avatarInit}>{c.user.displayName.slice(0, 1).toUpperCase()}</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{c.user.displayName}</Text>
          <Text style={styles.date}>{dateFr(c.createdAt)}</Text>
        </View>
        {c.isMine ? (
          <Pressable onPress={() => onRemove(c)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Supprimer">
            <Feather name="trash-2" size={18} color={COLORS.textMuted} />
          </Pressable>
        ) : (
          reportAction(c, 18)
        )}
      </View>
      <Text style={styles.body}>{c.body}</Text>
      <View style={styles.footer}>
        <Pressable
          style={styles.footBtn}
          onPress={() => onHeart(c)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={c.reactions.mine.includes('❤️') ? "Retirer le j'aime" : "J'aime"}
          accessibilityState={{ selected: c.reactions.mine.includes('❤️') }}
        >
          {c.reactions.mine.includes('❤️') ? (
            <PopIn><Ionicons name="heart" size={22} color={COLORS.red} /></PopIn>
          ) : (
            <Ionicons name="heart-outline" size={22} color={COLORS.black} />
          )}
          {c.reactions.total > 0 ? <Text style={styles.footCount}>{c.reactions.total}</Text> : null}
        </Pressable>
        <Pressable
          style={styles.footBtn}
          onPress={onToggleReplies}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={replyOpen ? 'Masquer les réponses' : 'Afficher les réponses'}
        >
          <Feather name="message-circle" size={21} color={COLORS.black} />
          {(c.replies?.length ?? 0) > 0 ? <Text style={styles.footCount}>{c.replies!.length}</Text> : null}
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => onShare(c)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Partager">
          <Feather name="share" size={20} color={COLORS.black} />
        </Pressable>
      </View>
      {replyOpen ? (
        <View style={styles.replies}>
          {c.replies?.map((r) => (
            <View key={r.id} style={styles.replyRow}>
              <View style={[styles.avatar, { width: 32, height: 32, borderRadius: 16 }]}>
                <Text style={[styles.avatarInit, { fontSize: 13 }]}>{r.user.displayName.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.replyName}>{r.user.displayName} <Text style={styles.date}>· {dateFr(r.createdAt)}</Text></Text>
                <Text style={styles.replyBody}>{r.body}</Text>
              </View>
              {r.isMine ? (
                <Pressable onPress={() => onRemove(r)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Supprimer">
                  <Feather name="trash-2" size={15} color={COLORS.textMuted} />
                </Pressable>
              ) : (
                reportAction(r, 15)
              )}
            </View>
          ))}
          {isReplying ? (
            <View style={styles.replyComposer}>
              <TextInput
                style={styles.replyInput}
                placeholder="Votre réponse…"
                placeholderTextColor={COLORS.textMuted}
                value={replyText}
                onChangeText={setReplyText}
              />
              <Pressable style={[styles.replySend, !replyText.trim() && { opacity: 0.4 }]} onPress={onPostReply} disabled={!replyText.trim()}>
                <Text style={styles.sendText}>OK</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Confirmation de signalement (exigence stores : UGC signalable). */}
      <ReportModal
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        onConfirm={confirmReport}
        title="Signaler ce commentaire"
        body="Contenu haineux ou inapproprié ? Notre équipe vérifiera."
      />
    </View>
  );
}

// Cotes TV Time (capture commentaires Naruto) : cartes blanches radius 12 sur
// fond gris, avatar 44, nom 16, date 14 grise, corps 16/22, icônes 20-22.
const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 12, marginHorizontal: 12, marginVertical: 6, padding: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#20202a', alignItems: 'center', justifyContent: 'center' },
  avatarInit: { color: '#fff', fontSize: 17, fontFamily: FONTS.extraBold },
  name: { color: COLORS.text, fontSize: 16, fontFamily: FONTS.bold },
  date: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 1 },
  reported: { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.textMuted },
  body: { color: COLORS.text, fontFamily: FONTS.regular, fontSize: 16, lineHeight: 22, marginTop: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 26, marginTop: 14 },
  footBtn: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  footCount: { color: COLORS.text, fontSize: 14, fontFamily: FONTS.semiBold },
  replies: { marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.borderLight, paddingTop: 10, gap: 10 },
  replyRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  replyName: { color: COLORS.text, fontSize: 14, fontFamily: FONTS.bold },
  replyBody: { color: COLORS.text, fontFamily: FONTS.regular, fontSize: 15, lineHeight: 20, marginTop: 2 },
  replyComposer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  replyInput: { color: COLORS.text, flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontFamily: FONTS.regular, fontSize: 15 },
  replySend: { backgroundColor: COLORS.yellow, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  sendText: { color: COLORS.onAccent, fontFamily: FONTS.extraBold, fontSize: 13, letterSpacing: 0.4 },
});
