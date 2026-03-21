import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import apiClient from '../api/client';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, getInitials } from '../utils/staffWorkspace';

const NOTICE_STORAGE_PREFIX = 'staffSeenNoticeIds';

const PALETTES = {
  accent: {
    background: COLORS.accentSoft,
    text: COLORS.accent,
    border: 'rgba(78, 123, 255, 0.18)',
  },
  success: {
    background: COLORS.successSoft,
    text: COLORS.success,
    border: 'rgba(20, 134, 109, 0.18)',
  },
  warning: {
    background: COLORS.warningSoft,
    text: COLORS.warning,
    border: 'rgba(201, 135, 43, 0.18)',
  },
  danger: {
    background: COLORS.dangerSoft,
    text: COLORS.danger,
    border: 'rgba(211, 91, 91, 0.18)',
  },
  neutral: {
    background: COLORS.surfaceAlt,
    text: COLORS.textSecondary,
    border: COLORS.border,
  },
  primary: {
    background: COLORS.primarySoft,
    text: COLORS.primary,
    border: 'rgba(22, 35, 59, 0.12)',
  },
};

function getPalette(tone = 'neutral') {
  return PALETTES[tone] || PALETTES.neutral;
}

function getNoticeStorageKey(email) {
  const normalizedEmail = String(email || 'guest').trim().toLowerCase();
  return `${NOTICE_STORAGE_PREFIX}:${normalizedEmail}`;
}

async function loadSeenNoticeIds(email) {
  try {
    const raw = await SecureStore.getItemAsync(getNoticeStorageKey(email));

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

async function persistSeenNoticeIds(email, ids) {
  try {
    await SecureStore.setItemAsync(
      getNoticeStorageKey(email),
      JSON.stringify(ids)
    );
  } catch (error) {
    console.warn('Failed to persist seen notices.', error);
  }
}

function getNoticeTone(notice) {
  const haystack = `${notice?.title || ''} ${notice?.message || ''}`.toLowerCase();

  if (
    haystack.includes('urgent') ||
    haystack.includes('warning') ||
    haystack.includes('alert') ||
    haystack.includes('important') ||
    haystack.includes('deadline')
  ) {
    return {
      tone: 'danger',
      label: 'Alert',
      icon: 'warning-outline',
    };
  }

  if (
    haystack.includes('meeting') ||
    haystack.includes('event') ||
    haystack.includes('session') ||
    haystack.includes('webinar') ||
    haystack.includes('launch')
  ) {
    return {
      tone: 'warning',
      label: 'Event',
      icon: 'calendar-outline',
    };
  }

  if (
    haystack.includes('policy') ||
    haystack.includes('attendance') ||
    haystack.includes('payout') ||
    haystack.includes('wallet') ||
    haystack.includes('task')
  ) {
    return {
      tone: 'primary',
      label: 'Update',
      icon: 'document-text-outline',
    };
  }

  return {
    tone: 'accent',
    label: 'Info',
    icon: 'notifications-outline',
  };
}

function getNoticeSnippet(message) {
  const text = String(message || '').trim();

  if (!text) {
    return 'No additional details were shared in this notice.';
  }

  if (text.length <= 120) {
    return text;
  }

  return `${text.slice(0, 117).trim()}...`;
}

function isRecentNotice(date) {
  if (!date) {
    return false;
  }

  const publishedAt = new Date(date).getTime();
  return Date.now() - publishedAt <= 72 * 60 * 60 * 1000;
}

function HeaderButton({ icon, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerButton,
        pressed && styles.headerButtonPressed,
      ]}
    >
      <Ionicons name={icon} size={22} color={COLORS.text} />
    </Pressable>
  );
}

function ToneBadge({ icon, label, tone = 'neutral' }) {
  const palette = getPalette(tone);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={palette.text} /> : null}
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function SummaryTile({ icon, label, value, hint, tone = 'accent' }) {
  const palette = getPalette(tone);

  return (
    <View style={styles.summaryTile}>
      <View
        style={[
          styles.summaryIconWrap,
          { backgroundColor: palette.background },
        ]}
      >
        <Ionicons name={icon} size={18} color={palette.text} />
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryHint}>{hint}</Text>
    </View>
  );
}

function SectionHeader({ icon, title, subtitle, actionLabel, onActionPress }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionIconWrap}>
            <Ionicons name={icon} size={18} color={COLORS.primary} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>

      {actionLabel ? (
        <Pressable
          onPress={onActionPress}
          style={({ pressed }) => [
            styles.sectionAction,
            pressed && styles.sectionActionPressed,
          ]}
        >
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function EmptyState({ onRefresh }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="notifications-off-outline" size={24} color={COLORS.accent} />
      </View>
      <Text style={styles.emptyStateTitle}>No notices right now</Text>
      <Text style={styles.emptyStateBody}>
        The notice board is quiet at the moment. New updates from Admin will appear here automatically.
      </Text>
      <Pressable
        onPress={onRefresh}
        style={({ pressed }) => [
          styles.emptyStateAction,
          pressed && styles.emptyStateActionPressed,
        ]}
      >
        <Text style={styles.emptyStateActionText}>Refresh feed</Text>
      </Pressable>
    </View>
  );
}

function NoticeCard({
  notice,
  expanded,
  unread,
  onPress,
}) {
  const meta = getNoticeTone(notice);
  const palette = getPalette(meta.tone);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.noticeCard,
        unread && styles.noticeCardUnread,
        pressed && styles.noticeCardPressed,
      ]}
    >
      <View style={styles.noticeHeader}>
        <View style={styles.noticeMetaCopy}>
          <View style={styles.noticeMetaTop}>
            <View
              style={[
                styles.noticeIconWrap,
                { backgroundColor: palette.background },
              ]}
            >
              <Ionicons name={meta.icon} size={18} color={palette.text} />
            </View>

            <View style={styles.noticeHeaderCopy}>
              <Text style={styles.noticeTitle}>{notice.title || 'Notice'}</Text>
              <Text style={styles.noticeDate}>
                {formatDateTime(notice.date)}
              </Text>
            </View>
          </View>

          <View style={styles.noticeBadgeRow}>
            <ToneBadge
              icon="person-outline"
              label={notice.author || 'Admin'}
              tone="neutral"
            />
            <ToneBadge
              icon={meta.icon}
              label={meta.label}
              tone={meta.tone}
            />
            {unread ? (
              <ToneBadge
                icon="ellipse"
                label="Unread"
                tone="accent"
              />
            ) : null}
          </View>
        </View>

        {unread ? <View style={styles.unreadDot} /> : null}
      </View>

      <Text style={styles.noticeSnippet}>
        {expanded ? notice.message || 'No additional details.' : getNoticeSnippet(notice.message)}
      </Text>

      <View style={styles.noticeFooter}>
        <Text style={styles.noticeFooterText}>
          {expanded ? 'Tap to collapse' : 'Tap to read full notice'}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up-outline' : 'chevron-forward-outline'}
          size={18}
          color={COLORS.textSecondary}
        />
      </View>
    </Pressable>
  );
}

export default function NoticeBoardScreen({ navigation }) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [notices, setNotices] = useState([]);
  const [seenNoticeIds, setSeenNoticeIds] = useState([]);
  const [expandedNoticeId, setExpandedNoticeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    hydrateNotices();
  }, [isFocused, auth?.profile?.email]);

  async function hydrateNotices(isPullToRefresh = false) {
    if (isPullToRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [noticesResponse, storedSeenIds] = await Promise.all([
        apiClient.get('staff/notices'),
        loadSeenNoticeIds(auth?.profile?.email),
      ]);

      if (noticesResponse.data?.success) {
        setNotices(noticesResponse.data.notices || []);
      } else {
        setNotices([]);
      }

      setSeenNoticeIds(storedSeenIds);
    } catch (error) {
      console.error('Notice board fetch failed.', error?.message || error);
      setNotices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function markAsRead(noticeId) {
    if (!noticeId || seenNoticeIds.includes(noticeId)) {
      return;
    }

    const nextIds = [...seenNoticeIds, noticeId];
    setSeenNoticeIds(nextIds);
    await persistSeenNoticeIds(auth?.profile?.email, nextIds);
  }

  async function handleToggleNotice(notice) {
    const nextExpandedId = expandedNoticeId === notice._id ? '' : notice._id;
    setExpandedNoticeId(nextExpandedId);

    if (nextExpandedId === notice._id) {
      await markAsRead(notice._id);
    }
  }

  async function handleMarkAllRead() {
    const allIds = notices
      .map((notice) => notice._id)
      .filter(Boolean);

    setSeenNoticeIds(allIds);
    await persistSeenNoticeIds(auth?.profile?.email, allIds);
  }

  const unreadCount = notices.filter((notice) => !seenNoticeIds.includes(notice._id)).length;
  const recentCount = notices.filter((notice) => isRecentNotice(notice.date)).length;
  const latestNotice = notices[0] || null;

  return (
    <View style={styles.screen}>
      <View style={[styles.backgroundOrb, styles.backgroundOrbTop]} />
      <View style={[styles.backgroundOrb, styles.backgroundOrbBottom]} />

      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <HeaderButton
          icon="menu-outline"
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        />

        <View style={styles.topBarCopy}>
          <Text style={styles.topBarTitle}>Notice Board</Text>
          <Text style={styles.topBarSubtitle}>
            Official staff updates in a mobile-first notification feed
          </Text>
        </View>

        <HeaderButton
          icon="refresh-outline"
          onPress={() => hydrateNotices(true)}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 44 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => hydrateNotices(true)}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <ToneBadge
              icon="notifications-outline"
              label="Notification Center"
              tone="accent"
            />

            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>
                {getInitials(auth?.profile?.name)}
              </Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Stay aligned with every staff-wide announcement.</Text>
          <Text style={styles.heroBody}>
            Important updates, warnings, and event notes surface here as readable feed cards instead of buried dashboard blocks.
          </Text>

          <View style={styles.summaryGrid}>
            <SummaryTile
              icon="mail-unread-outline"
              label="Unread"
              value={unreadCount}
              hint="Not opened yet"
              tone={unreadCount ? 'accent' : 'neutral'}
            />
            <SummaryTile
              icon="sparkles-outline"
              label="New"
              value={recentCount}
              hint="Posted in the last 72h"
              tone={recentCount ? 'warning' : 'neutral'}
            />
            <SummaryTile
              icon="document-text-outline"
              label="Total Notices"
              value={notices.length}
              hint={latestNotice ? `Latest: ${latestNotice.title || 'Notice'}` : 'Feed is currently quiet'}
              tone="primary"
            />
          </View>

          {notices.length ? (
            <Pressable
              onPress={handleMarkAllRead}
              style={({ pressed }) => [
                styles.heroAction,
                pressed && styles.heroActionPressed,
              ]}
            >
              <Ionicons name="checkmark-done-outline" size={18} color={COLORS.white} />
              <Text style={styles.heroActionText}>Mark all as read</Text>
            </Pressable>
          ) : null}
        </View>

        {loading && !notices.length ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading official notices...</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <SectionHeader
            icon="newspaper-outline"
            title="Official Feed"
            subtitle="Tap a notice card to expand the full message and mark it as read."
            actionLabel={notices.length ? 'Refresh' : null}
            onActionPress={() => hydrateNotices(true)}
          />

          {notices.length ? (
            notices.map((notice) => (
              <NoticeCard
                key={notice._id || `${notice.title}-${notice.date}`}
                notice={notice}
                expanded={expandedNoticeId === notice._id}
                unread={!seenNoticeIds.includes(notice._id)}
                onPress={() => handleToggleNotice(notice)}
              />
            ))
          ) : (
            <EmptyState onRefresh={() => hydrateNotices(true)} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundOrb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
    opacity: 0.8,
  },
  backgroundOrbTop: {
    top: -46,
    right: -28,
    width: 176,
    height: 176,
  },
  backgroundOrbBottom: {
    bottom: 84,
    left: -56,
    width: 160,
    height: 160,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.md,
  },
  headerButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  headerButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  topBarCopy: {
    flex: 1,
    gap: 2,
  },
  topBarTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.6,
  },
  topBarSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SIZES.lg,
    gap: SIZES.lg,
  },
  heroCard: {
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.primary,
    padding: SIZES.xxl,
    gap: SIZES.lg,
    ...SHADOWS.medium,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  heroAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  heroAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.8,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.74)',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.md,
  },
  summaryTile: {
    minWidth: '47%',
    flexGrow: 1,
    borderRadius: SIZES.radius,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: SIZES.lg,
    gap: SIZES.sm,
  },
  summaryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.4,
  },
  summaryHint: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.62)',
  },
  heroAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 15,
  },
  heroActionPressed: {
    opacity: 0.88,
  },
  heroActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: SIZES.radiusPill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    ...SHADOWS.soft,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sectionCard: {
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.xl,
    gap: SIZES.lg,
    ...SHADOWS.soft,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  sectionHeading: {
    flex: 1,
    gap: SIZES.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  sectionAction: {
    borderRadius: SIZES.radiusPill,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sectionActionPressed: {
    opacity: 0.8,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  noticeCard: {
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.lg,
    gap: SIZES.md,
  },
  noticeCardUnread: {
    borderColor: 'rgba(78, 123, 255, 0.22)',
    backgroundColor: '#F8FBFF',
  },
  noticeCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.md,
  },
  noticeMetaCopy: {
    flex: 1,
    gap: SIZES.sm,
  },
  noticeMetaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
  },
  noticeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  noticeTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  noticeDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  noticeBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
    marginTop: 6,
  },
  noticeSnippet: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  noticeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.md,
  },
  noticeFooterText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.xxxl,
    gap: SIZES.md,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  emptyStateBody: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyStateAction: {
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  emptyStateActionPressed: {
    opacity: 0.84,
  },
  emptyStateActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
});
