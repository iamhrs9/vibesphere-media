import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import apiClient from '../api/client';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/staffWorkspace';

const TAB_OPTIONS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
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

function getApiErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function getServerOrigin(baseURL) {
  return String(baseURL || '')
    .replace(/\/api\/?$/, '')
    .replace(/\/$/, '');
}

function extractRoomId(roomName) {
  const source = String(roomName || '').trim();

  if (!source) {
    return '';
  }

  const parts = source.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

function buildMeetingJoinUrl(meeting) {
  const roomId = extractRoomId(meeting?.roomName);
  const origin = getServerOrigin(apiClient.defaults.baseURL);

  if (!origin || !roomId) {
    return '';
  }

  return `${origin}/join-meeting?room=${encodeURIComponent(roomId)}`;
}

function formatMeetingDate(value) {
  if (!value) {
    return 'Date pending';
  }

  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatMeetingTime(value) {
  if (!value) {
    return 'Time pending';
  }

  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMeetingDateTime(value) {
  if (!value) {
    return 'Schedule pending';
  }

  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRelativeMeetingCopy(value) {
  if (!value) {
    return 'Waiting for schedule';
  }

  const meetingTime = new Date(value).getTime();
  const diffMs = meetingTime - Date.now();
  const absMinutes = Math.round(Math.abs(diffMs) / 60000);

  if (absMinutes < 1) {
    return diffMs >= 0 ? 'Starting now' : 'Started just now';
  }

  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;

  if (diffMs >= 0) {
    if (hours > 0) {
      return `Starts in ${hours}h ${minutes}m`;
    }

    return `Starts in ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ago`;
  }

  return `${minutes}m ago`;
}

function getMeetingStatusMeta(meeting) {
  const normalized = String(meeting?.status || '').trim();

  if (normalized === 'Live') {
    return {
      label: 'Live Now',
      icon: 'radio-outline',
      tone: 'success',
    };
  }

  if (normalized === 'Ended') {
    return {
      label: 'Ended',
      icon: 'checkmark-done-outline',
      tone: 'neutral',
    };
  }

  const scheduledAt = new Date(meeting?.scheduledTime || 0).getTime();

  if (scheduledAt && scheduledAt < Date.now()) {
    return {
      label: 'Completed',
      icon: 'time-outline',
      tone: 'neutral',
    };
  }

  return {
    label: 'Scheduled',
    icon: 'calendar-outline',
    tone: 'warning',
  };
}

function isUpcomingMeeting(meeting) {
  const status = String(meeting?.status || '').trim();
  const scheduledAt = new Date(meeting?.scheduledTime || 0).getTime();

  if (status === 'Live') {
    return true;
  }

  if (status === 'Ended') {
    return false;
  }

  return scheduledAt >= Date.now();
}

function sortUpcomingMeetings(items) {
  return [...items].sort(
    (left, right) =>
      new Date(left.scheduledTime).getTime() - new Date(right.scheduledTime).getTime()
  );
}

function sortPastMeetings(items) {
  return [...items].sort(
    (left, right) =>
      new Date(right.scheduledTime).getTime() - new Date(left.scheduledTime).getTime()
  );
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
      <Ionicons name={icon} size={14} color={palette.text} />
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

function SectionHeader({ icon, title, subtitle }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionIconWrap}>
          <Ionicons name={icon} size={18} color={COLORS.primary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function FilterChip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active && styles.filterChipActive,
        pressed && styles.filterChipPressed,
      ]}
    >
      <Text
        style={[
          styles.filterChipText,
          active && styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MeetingMetaPill({ icon, label, tone = 'neutral' }) {
  const palette = getPalette(tone);

  return (
    <View style={[styles.metaPill, { backgroundColor: palette.background }]}>
      <Ionicons name={icon} size={14} color={palette.text} />
      <Text style={[styles.metaPillText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function MeetingCard({ meeting, upcoming, onJoinPress }) {
  const statusMeta = getMeetingStatusMeta(meeting);
  const hostLabel = meeting?.createdBy || 'Admin';
  const participantsLabel = 'All Staff';
  const hasPassword = Boolean(String(meeting?.password || '').trim());

  return (
    <View style={styles.meetingCard}>
      <View style={styles.meetingHeader}>
        <View style={styles.meetingHeaderCopy}>
          <Text style={styles.meetingEyebrow}>
            {upcoming ? getRelativeMeetingCopy(meeting.scheduledTime) : 'Meeting archive'}
          </Text>
          <Text style={styles.meetingTitle}>{meeting.topic || 'Team Meeting'}</Text>
        </View>

        <ToneBadge
          icon={statusMeta.icon}
          label={statusMeta.label}
          tone={statusMeta.tone}
        />
      </View>

      <Text style={styles.meetingDateTime}>
        {formatMeetingDateTime(meeting.scheduledTime)}
      </Text>

      <View style={styles.meetingMetaGrid}>
        <MeetingMetaPill
          icon="calendar-outline"
          label={formatMeetingDate(meeting.scheduledTime)}
          tone="primary"
        />
        <MeetingMetaPill
          icon="time-outline"
          label={formatMeetingTime(meeting.scheduledTime)}
          tone="accent"
        />
        <MeetingMetaPill
          icon="person-outline"
          label={`Host: ${hostLabel}`}
          tone="neutral"
        />
        <MeetingMetaPill
          icon="people-outline"
          label={participantsLabel}
          tone="warning"
        />
        {hasPassword ? (
          <MeetingMetaPill
            icon="lock-closed-outline"
            label="Password Protected"
            tone="danger"
          />
        ) : null}
      </View>

      <View style={styles.meetingFooter}>
        <Text style={styles.roomHint} numberOfLines={1}>
          Room: {extractRoomId(meeting.roomName) || 'Meeting room'}
        </Text>

        {upcoming ? (
          <Pressable
            onPress={onJoinPress}
            style={({ pressed }) => [
              styles.joinButton,
              pressed && styles.joinButtonPressed,
            ]}
          >
            <Ionicons name="videocam-outline" size={18} color={COLORS.white} />
            <Text style={styles.joinButtonText}>Join Meeting</Text>
          </Pressable>
        ) : (
          <View style={styles.endedPill}>
            <Ionicons
              name="checkmark-done-outline"
              size={16}
              color={COLORS.textSecondary}
            />
            <Text style={styles.endedPillText}>Meeting ended</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function EmptyState({ tab, onRefresh }) {
  const copy =
    tab === 'upcoming'
      ? {
          title: 'No upcoming meetings',
          body: 'New sessions from Admin will appear here with one-tap join actions.',
        }
      : {
          title: 'No past meetings yet',
          body: 'Completed sessions will be archived here for quick reference.',
        };

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="videocam-off-outline" size={24} color={COLORS.accent} />
      </View>
      <Text style={styles.emptyStateTitle}>{copy.title}</Text>
      <Text style={styles.emptyStateBody}>{copy.body}</Text>
      <Pressable
        onPress={onRefresh}
        style={({ pressed }) => [
          styles.emptyStateAction,
          pressed && styles.emptyStateActionPressed,
        ]}
      >
        <Text style={styles.emptyStateActionText}>Refresh meetings</Text>
      </Pressable>
    </View>
  );
}

export default function MeetingsScreen({ navigation }) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [profile, setProfile] = useState(auth?.profile || null);
  const [meetings, setMeetings] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (auth?.profile) {
      setProfile(auth.profile);
    }
  }, [auth?.profile]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    hydrateMeetings();
  }, [isFocused]);

  async function hydrateMeetings(isPullToRefresh = false) {
    if (isPullToRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      let activeProfile = auth?.profile || profile;

      try {
        const meResponse = await apiClient.get('staff/me');

        if (meResponse.data?.success && meResponse.data?.staff) {
          activeProfile = meResponse.data.staff;
          setProfile(activeProfile);
          await auth?.updateProfile?.(activeProfile);
        }
      } catch (error) {
        if (error?.response?.status !== 401) {
          console.error('Meetings profile refresh failed.', error?.message || error);
        }
      }

      const response = await apiClient.get('meetings');

      setMeetings(
        response.data?.success ? response.data.meetings || [] : []
      );
    } catch (error) {
      if (!isPullToRefresh) {
        Alert.alert(
          'Could not load meetings',
          getApiErrorMessage(error, 'Please try again in a moment.')
        );
      }
      setMeetings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleJoinMeeting(meeting) {
    const joinUrl = buildMeetingJoinUrl(meeting);

    if (!joinUrl) {
      Alert.alert(
        'Join unavailable',
        'Meeting link is missing or could not be generated for this session.'
      );
      return;
    }

    try {
      const supported = await Linking.canOpenURL(joinUrl);

      if (!supported) {
        throw new Error('Unsupported join URL');
      }

      await Linking.openURL(joinUrl);
    } catch (error) {
      Alert.alert(
        'Could not open meeting',
        'The meeting link could not be opened on this device right now.'
      );
    }
  }

  const upcomingMeetings = useMemo(
    () => sortUpcomingMeetings(meetings.filter(isUpcomingMeeting)),
    [meetings]
  );
  const pastMeetings = useMemo(
    () => sortPastMeetings(meetings.filter((meeting) => !isUpcomingMeeting(meeting))),
    [meetings]
  );
  const liveMeeting = upcomingMeetings.find(
    (meeting) => String(meeting.status || '').trim() === 'Live'
  );
  const nextMeeting = upcomingMeetings[0] || null;
  const visibleMeetings = activeTab === 'upcoming' ? upcomingMeetings : pastMeetings;

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
          <Text style={styles.topBarTitle}>Meetings</Text>
          <Text style={styles.topBarSubtitle}>
            Premium mobile schedule for upcoming and completed team sessions
          </Text>
        </View>

        <HeaderButton
          icon="refresh-outline"
          onPress={() => hydrateMeetings(true)}
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
            onRefresh={() => hydrateMeetings(true)}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <ToneBadge
              icon="videocam-outline"
              label="Meeting Desk"
              tone="accent"
            />

            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>
                {getInitials(profile?.name)}
              </Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Jump into scheduled sessions without the web-dashboard clutter.</Text>
          <Text style={styles.heroBody}>
            Upcoming calls, live sessions, and past meeting history are all split into clean mobile cards with one-tap join actions.
          </Text>

          <View style={styles.summaryGrid}>
            <SummaryTile
              icon="radio-outline"
              label="Live Now"
              value={liveMeeting ? '1' : '0'}
              hint={liveMeeting ? liveMeeting.topic || 'Meeting in progress' : 'No live sessions'}
              tone={liveMeeting ? 'success' : 'neutral'}
            />
            <SummaryTile
              icon="calendar-outline"
              label="Upcoming"
              value={upcomingMeetings.length}
              hint={nextMeeting ? formatMeetingTime(nextMeeting.scheduledTime) : 'No meetings queued'}
              tone="warning"
            />
            <SummaryTile
              icon="time-outline"
              label="Past"
              value={pastMeetings.length}
              hint="Completed sessions"
              tone="primary"
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader
            icon="swap-horizontal-outline"
            title="Meeting Timeline"
            subtitle="Switch between your upcoming calls and archived sessions."
          />

          <View style={styles.filterRow}>
            {TAB_OPTIONS.map((tab) => (
              <FilterChip
                key={tab.key}
                label={`${tab.label} ${tab.key === 'upcoming' ? upcomingMeetings.length : pastMeetings.length}`}
                active={activeTab === tab.key}
                onPress={() => setActiveTab(tab.key)}
              />
            ))}
          </View>
        </View>

        {loading && !meetings.length ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading meeting schedule...</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <SectionHeader
            icon={activeTab === 'upcoming' ? 'calendar-clear-outline' : 'archive-outline'}
            title={activeTab === 'upcoming' ? 'Upcoming Meetings' : 'Past Meetings'}
            subtitle={
              activeTab === 'upcoming'
                ? 'Clean cards for upcoming or live sessions with fast join access.'
                : 'Recently completed meetings stay here for reference.'
            }
          />

          {visibleMeetings.length ? (
            visibleMeetings.map((meeting) => (
              <MeetingCard
                key={meeting._id || `${meeting.roomName}-${meeting.scheduledTime}`}
                meeting={meeting}
                upcoming={activeTab === 'upcoming'}
                onJoinPress={() => handleJoinMeeting(meeting)}
              />
            ))
          ) : (
            <EmptyState
              tab={activeTab}
              onRefresh={() => hydrateMeetings(true)}
            />
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
    opacity: 0.84,
  },
  backgroundOrbTop: {
    top: -52,
    right: -32,
    width: 184,
    height: 184,
  },
  backgroundOrbBottom: {
    bottom: 72,
    left: -50,
    width: 156,
    height: 156,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.xl,
    paddingBottom: SIZES.lg,
    gap: SIZES.md,
  },
  topBarCopy: {
    flex: 1,
    gap: 2,
  },
  topBarTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  topBarSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  headerButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  headerButtonPressed: {
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SIZES.xl,
    gap: SIZES.lg,
  },
  heroCard: {
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.primary,
    padding: SIZES.xxl,
    gap: SIZES.xl,
    ...SHADOWS.medium,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroAvatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.white,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.8,
  },
  heroBody: {
    marginTop: -8,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.72)',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.md,
  },
  summaryTile: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 92,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: SIZES.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: SIZES.sm,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.68)',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.6,
  },
  summaryHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.58)',
    lineHeight: 17,
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
    gap: SIZES.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  filterRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  filterChip: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipPressed: {
    opacity: 0.84,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  loadingCard: {
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surface,
    paddingVertical: SIZES.xl,
    paddingHorizontal: SIZES.xl,
    alignItems: 'center',
    gap: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  meetingCard: {
    borderRadius: 24,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.lg,
    gap: SIZES.md,
  },
  meetingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  meetingHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  meetingEyebrow: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  meetingTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  meetingDateTime: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.primary,
    fontWeight: '700',
  },
  meetingMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: SIZES.radiusPill,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  meetingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  roomHint: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  joinButton: {
    minWidth: 158,
    height: 48,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    paddingHorizontal: SIZES.lg,
    ...SHADOWS.soft,
  },
  joinButtonPressed: {
    opacity: 0.86,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
  endedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: SIZES.radiusPill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  endedPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    gap: SIZES.sm,
    paddingVertical: SIZES.xl,
    paddingHorizontal: SIZES.lg,
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
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyStateAction: {
    marginTop: SIZES.sm,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: SIZES.xl,
    paddingVertical: 14,
  },
  emptyStateActionPressed: {
    opacity: 0.82,
  },
  emptyStateActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: SIZES.radiusPill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
