import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import apiClient from '../api/client';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';

const CHAT_GROUPS = [
  {
    id: 'agency-global',
    name: 'Agency Global Chat',
    description: 'Company-wide updates, quick conversations, and support threads.',
    tone: 'accent',
    icon: 'chatbubbles-outline',
    kind: 'live',
  },
  {
    id: 'project-beta',
    name: 'Project Beta',
    description: 'Reserved placeholder for your future project-based group.',
    tone: 'warning',
    icon: 'folder-open-outline',
    kind: 'placeholder',
  },
];

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
  neutral: {
    background: COLORS.surfaceAlt,
    text: COLORS.textSecondary,
    border: COLORS.border,
  },
};

function getPalette(tone = 'neutral') {
  return PALETTES[tone] || PALETTES.neutral;
}

function getApiErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function formatPreviewTime(value) {
  if (!value) {
    return 'Soon';
  }

  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildMessagePreview(message) {
  if (!message) {
    return 'No messages yet';
  }

  if (message.message) {
    return String(message.message).trim().slice(0, 86);
  }

  if (message.fileName) {
    return message.fileName;
  }

  if (message.fileType === 'audio') {
    return 'Voice note';
  }

  return 'Attachment';
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
      <Ionicons name={icon} size={13} color={palette.text} />
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function GroupCard({ item, onPress }) {
  const palette = getPalette(item.tone);
  const statusTone = item.kind === 'live' && item.blocked ? 'warning' : 'success';
  const statusLabel =
    item.kind === 'placeholder'
      ? 'Coming soon'
      : item.blocked
        ? 'Paused'
        : 'Live';
  const statusIcon =
    item.kind === 'placeholder'
      ? 'time-outline'
      : item.blocked
        ? 'pause-circle-outline'
        : 'flash-outline';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View
        style={[
          styles.cardAvatar,
          {
            backgroundColor: palette.background,
            borderColor: palette.border,
          },
        ]}
      >
        <Ionicons name={item.icon} size={22} color={palette.text} />
      </View>

      <View style={styles.cardCopy}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardTime}>{item.timeLabel}</Text>
        </View>

        <Text style={styles.cardDescription}>{item.preview}</Text>

        <View style={styles.cardBottomRow}>
          <ToneBadge icon={statusIcon} label={statusLabel} tone={statusTone} />

          {item.kind === 'live' ? (
            <Text style={styles.cardMeta}>
              {item.messageCount} message{item.messageCount === 1 ? '' : 's'}
            </Text>
          ) : (
            <Text style={styles.cardMeta}>Group scaffold ready</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function ChatListScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    blocked: false,
    messageCount: 0,
    lastMessage: null,
  });

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    hydrateChatSummary();
  }, [isFocused]);

  const groups = useMemo(() => {
    return CHAT_GROUPS.map((group) => {
      if (group.id !== 'agency-global') {
        return {
          ...group,
          preview: 'Dedicated project room will appear here once the group is activated.',
          timeLabel: 'Soon',
          messageCount: 0,
          blocked: false,
        };
      }

      return {
        ...group,
        preview: buildMessagePreview(summary.lastMessage),
        timeLabel: formatPreviewTime(summary.lastMessage?.date),
        messageCount: summary.messageCount,
        blocked: summary.blocked,
      };
    });
  }, [summary]);

  async function hydrateChatSummary(isPullToRefresh = false) {
    if (isPullToRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [settingsResult, historyResult] = await Promise.allSettled([
        apiClient.get('chat/settings'),
        apiClient.get('chat/history'),
      ]);

      const history =
        historyResult.status === 'fulfilled' && historyResult.value.data?.success
          ? historyResult.value.data.messages || []
          : [];
      const lastMessage = history.length ? history[history.length - 1] : null;

      setSummary({
        blocked:
          settingsResult.status === 'fulfilled' &&
          settingsResult.value.data?.success
            ? Boolean(settingsResult.value.data.isChatBlocked)
            : false,
        messageCount: history.length,
        lastMessage,
      });
    } catch (error) {
      if (!isPullToRefresh) {
        console.warn(
          'Chat list summary failed.',
          getApiErrorMessage(error, 'Unable to load chat preview.')
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GroupCard
            item={item}
            onPress={() => navigation.navigate('ChatRoom', { group: item })}
          />
        )}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => hydrateChatSummary(true)}
            tintColor={COLORS.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.screenTitle}>Team chats</Text>
            <Text style={styles.screenSubtitle}>
              Start with one agency room now, then scale naturally into project-based groups later.
            </Text>
          </View>
        }
        ListFooterComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={COLORS.accent} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SIZES.xl,
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.xxxl,
    gap: SIZES.md,
  },
  headerBlock: {
    marginBottom: SIZES.md,
    gap: SIZES.sm,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.7,
  },
  screenSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.lg,
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.lg,
    ...SHADOWS.soft,
  },
  cardPressed: {
    opacity: 0.84,
  },
  cardAvatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    gap: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  cardTime: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SIZES.md,
    marginTop: 2,
  },
  cardMeta: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: SIZES.radiusPill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  loadingWrap: {
    paddingTop: SIZES.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
