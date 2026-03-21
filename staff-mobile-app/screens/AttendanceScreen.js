import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import apiClient, { getStoredToken } from '../api/client';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import {
  formatDuration,
  formatTime,
  getAttendanceState,
  getAttendanceTone,
  getInitials,
  summarizeAttendanceRecords,
} from '../utils/staffWorkspace';

const MONTH_OPTIONS = [
  { value: '01', label: 'Jan', fullLabel: 'January' },
  { value: '02', label: 'Feb', fullLabel: 'February' },
  { value: '03', label: 'Mar', fullLabel: 'March' },
  { value: '04', label: 'Apr', fullLabel: 'April' },
  { value: '05', label: 'May', fullLabel: 'May' },
  { value: '06', label: 'Jun', fullLabel: 'June' },
  { value: '07', label: 'Jul', fullLabel: 'July' },
  { value: '08', label: 'Aug', fullLabel: 'August' },
  { value: '09', label: 'Sep', fullLabel: 'September' },
  { value: '10', label: 'Oct', fullLabel: 'October' },
  { value: '11', label: 'Nov', fullLabel: 'November' },
  { value: '12', label: 'Dec', fullLabel: 'December' },
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

function getYearOptions() {
  const currentYear = new Date().getFullYear();

  return [
    String(currentYear + 1),
    String(currentYear),
    String(currentYear - 1),
    String(currentYear - 2),
  ];
}

function getMonthLabel(monthValue, yearValue) {
  const month = MONTH_OPTIONS.find((item) => item.value === monthValue);
  return `${month?.fullLabel || 'Month'} ${yearValue}`;
}

function buildDateFromDateString(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function formatCalendarDate(dateString) {
  const date = buildDateFromDateString(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusMeta(status) {
  switch (String(status || '').trim()) {
    case 'Present':
      return {
        label: 'Present',
        shortLabel: 'P',
        tone: 'success',
        icon: 'checkmark-circle-outline',
      };
    case 'Absent':
      return {
        label: 'Absent',
        shortLabel: 'A',
        tone: 'danger',
        icon: 'close-circle-outline',
      };
    case 'Leave':
      return {
        label: 'Leave',
        shortLabel: 'L',
        tone: 'warning',
        icon: 'airplane-outline',
      };
    case 'Upcoming':
      return {
        label: 'Upcoming',
        shortLabel: 'U',
        tone: 'neutral',
        icon: 'time-outline',
      };
    case 'No Log':
      return {
        label: 'No Log',
        shortLabel: '—',
        tone: 'neutral',
        icon: 'remove-circle-outline',
      };
    default:
      return {
        label: status || 'Recorded',
        shortLabel: String(status || 'R').slice(0, 1).toUpperCase(),
        tone: 'primary',
        icon: 'sparkles-outline',
      };
  }
}

function getActionTone(actionKey) {
  switch (actionKey) {
    case 'check-in':
      return 'success';
    case 'take-break':
      return 'warning';
    case 'resume-work':
      return 'accent';
    case 'check-out':
      return 'danger';
    default:
      return 'primary';
  }
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

function EmptyState({ icon, title, body, actionLabel, onActionPress }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={22} color={COLORS.accent} />
      </View>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateBody}>{body}</Text>

      {actionLabel ? (
        <Pressable
          onPress={onActionPress}
          style={({ pressed }) => [
            styles.emptyStateAction,
            pressed && styles.emptyStateActionPressed,
          ]}
        >
          <Text style={styles.emptyStateActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function FilterChip({ label, active, onPress }) {
  const palette = getPalette(active ? 'accent' : 'neutral');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        {
          backgroundColor: active ? palette.background : COLORS.surfaceAlt,
          borderColor: active ? palette.border : COLORS.border,
        },
        pressed && !active && styles.filterChipPressed,
      ]}
    >
      <Text
        style={[
          styles.filterChipText,
          { color: active ? palette.text : COLORS.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DutyActionButton({ action, busy, onPress }) {
  const palette = getPalette(getActionTone(action.key));

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [
        styles.dutyActionButton,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
        pressed && !busy && styles.dutyActionButtonPressed,
        busy && styles.dutyActionButtonBusy,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={palette.text} />
      ) : (
        <>
          <Ionicons name={action.icon} size={16} color={palette.text} />
          <Text style={[styles.dutyActionButtonText, { color: palette.text }]}>
            {action.label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function CompactLogItem({ record }) {
  const meta = getStatusMeta(record.status);
  const palette = getPalette(meta.tone);

  return (
    <View style={styles.compactLogRow}>
      <View style={styles.compactLogLeft}>
        <View style={[styles.compactLogDot, { backgroundColor: palette.text }]} />
        <View style={styles.compactLogCopy}>
          <Text style={styles.compactLogDate}>{formatCalendarDate(record.dateString)}</Text>
          <Text style={styles.compactLogTime}>
            {formatTime(record.checkInTime)} — {formatTime(record.checkOutTime)}
          </Text>
        </View>
      </View>

      <ToneBadge icon={meta.icon} label={meta.label} tone={meta.tone} />
    </View>
  );
}

function AttendanceLogCard({ record }) {
  const meta = getStatusMeta(record.status);

  return (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <View style={styles.logCopy}>
          <Text style={styles.logDate}>{formatCalendarDate(record.dateString)}</Text>
          <Text style={styles.logDateSubtle}>{record.dateString}</Text>
        </View>

        <ToneBadge
          icon={meta.icon}
          label={meta.label}
          tone={meta.tone}
        />
      </View>

      <View style={styles.logMetricsRow}>
        <View style={styles.logMetric}>
          <Text style={styles.logMetricLabel}>Check in</Text>
          <Text style={styles.logMetricValue}>{formatTime(record.checkInTime)}</Text>
        </View>
        <View style={styles.logMetric}>
          <Text style={styles.logMetricLabel}>Check out</Text>
          <Text style={styles.logMetricValue}>{formatTime(record.checkOutTime)}</Text>
        </View>
      </View>

      <View style={styles.logMetricsRow}>
        <View style={styles.logMetric}>
          <Text style={styles.logMetricLabel}>Break time</Text>
          <Text style={styles.logMetricValue}>
            {formatDuration(record.totalBreakMsLive ?? 0)}
          </Text>
        </View>
        <View style={styles.logMetric}>
          <Text style={styles.logMetricLabel}>Worked time</Text>
          <Text style={styles.logMetricValue}>
            {formatDuration(
              record.totalWorkingMsLive ?? record.totalWorkingMs ?? 0
            )}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function AttendanceScreen({ navigation }) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const today = new Date();

  const [profile, setProfile] = useState(auth?.profile || null);
  const [selectedMonth, setSelectedMonth] = useState(
    String(today.getMonth() + 1).padStart(2, '0')
  );
  const [selectedYear, setSelectedYear] = useState(String(today.getFullYear()));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [actingAction, setActingAction] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [isOnline, setIsOnline] = useState(false);

  const yearOptions = useMemo(() => getYearOptions(), []);

  useEffect(() => {
    if (auth?.profile) {
      setProfile(auth.profile);
    }
  }, [auth?.profile]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    hydrateAttendance();
  }, [isFocused, auth?.profile?.email, selectedMonth, selectedYear]);

  async function hydrateAttendance(isPullToRefresh = false) {
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
          console.error(
            'Attendance screen profile refresh failed.',
            error?.message || error
          );
        }
      }

      if (!activeProfile?.email) {
        setAttendanceRecords([]);
        setTodayAttendance(null);
        setIsOnline(false);
        return;
      }

      const [todayResult, historyResult] = await Promise.allSettled([
        apiClient.get('staff/today-attendance'),
        apiClient.get('staff/my-attendance', {
          params: {
            month: selectedMonth,
            year: selectedYear,
          },
        }),
      ]);

      setTodayAttendance(
        todayResult.status === 'fulfilled' && todayResult.value.data?.success
          ? todayResult.value.data.attendance || null
          : null
      );
      setIsOnline(
        todayResult.status === 'fulfilled' && todayResult.value.data?.success
          ? Boolean(todayResult.value.data.isOnline)
          : false
      );
      setAttendanceRecords(
        historyResult.status === 'fulfilled' && historyResult.value.data?.success
          ? historyResult.value.data.attendance || []
          : []
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleAttendanceAction(actionKey) {
    if (!profile?.email) {
      Alert.alert('Profile missing', 'Please sign in again before updating attendance.');
      return;
    }

    setActingAction(actionKey);

    try {
      const response = await apiClient.post(`staff/${actionKey}`, {
        email: profile.email,
      });
      const payload = response.data || {};

      if (!payload.success) {
        throw new Error(payload.message || 'Attendance action failed.');
      }

      setTodayAttendance(payload.attendance || null);
      setIsOnline(Boolean(payload.isOnline));
      await hydrateAttendance(true);
    } catch (error) {
      Alert.alert(
        'Attendance action failed',
        getApiErrorMessage(error, 'Unable to update attendance right now.')
      );
    } finally {
      setActingAction('');
    }
  }

  async function handleDownloadReport() {
    const token = await getStoredToken();

    if (!token) {
      Alert.alert('Session missing', 'Please sign in again before downloading the report.');
      return;
    }

    const baseUrl = String(apiClient.defaults.baseURL || '');
    const downloadUrl = `${baseUrl}staff/download-attendance-report?month=${selectedMonth}&year=${selectedYear}`;
    const targetDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;

    if (!targetDir) {
      Alert.alert('Download unavailable', 'File storage is not available on this device.');
      return;
    }

    const fileUri = `${targetDir}attendance_${selectedYear}_${selectedMonth}.pdf`;
    setDownloadingReport(true);

    try {
      const result = await FileSystem.downloadAsync(downloadUrl, fileUri, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: `token=${token}`,
        },
      });

      if (result.status < 200 || result.status >= 300) {
        throw new Error('Server rejected the report download request.');
      }

      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert(
          'Downloaded',
          `Attendance report for ${getMonthLabel(selectedMonth, selectedYear)} was downloaded to local app storage.`
        );
        return;
      }

      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: `Share attendance report for ${getMonthLabel(
          selectedMonth,
          selectedYear
        )}`,
      });
    } catch (error) {
      Alert.alert(
        'Download failed',
        getApiErrorMessage(error, 'Unable to download the attendance report.')
      );
    } finally {
      setDownloadingReport(false);
    }
  }

  const monthlySummary = useMemo(
    () => summarizeAttendanceRecords(attendanceRecords),
    [attendanceRecords]
  );



  const workedMs =
    todayAttendance?.totalWorkingMsLive ?? todayAttendance?.totalWorkingMs ?? 0;
  const attendanceState = getAttendanceState(todayAttendance);
  const dutyMeta = getAttendanceTone(attendanceState, formatDuration(workedMs));
  const monthLabel = getMonthLabel(selectedMonth, selectedYear);
  const hasRecords = attendanceRecords.length > 0;

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
          <Text style={styles.topBarTitle}>Attendance</Text>
          <Text style={styles.topBarSubtitle}>
            Monthly summary, daily status, and official report downloads
          </Text>
        </View>

        <HeaderButton
          icon="refresh-outline"
          onPress={() => hydrateAttendance(true)}
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
            onRefresh={() => hydrateAttendance(true)}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <ToneBadge
              icon="calendar-outline"
              label="Attendance Center"
              tone="accent"
            />

            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{getInitials(profile?.name)}</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>{monthLabel}</Text>
          <Text style={styles.heroBody}>
            Track Present, Absent, and Leave days for the selected month and
            export the official report in one tap.
          </Text>

          <View style={styles.heroActionRow}>
            <Pressable
              onPress={handleDownloadReport}
              disabled={downloadingReport}
              style={({ pressed }) => [
                styles.heroPrimaryAction,
                pressed && !downloadingReport && styles.heroPrimaryActionPressed,
                downloadingReport && styles.heroPrimaryActionBusy,
              ]}
            >
              {downloadingReport ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons
                    name="document-download-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                  <Text style={styles.heroPrimaryActionText}>
                    Download Attendance Report
                  </Text>
                </>
              )}
            </Pressable>

            <ToneBadge
              icon={dutyMeta.icon}
              label={dutyMeta.label}
              tone={dutyMeta.tone}
            />
          </View>

          <View style={styles.summaryGrid}>
            <SummaryTile
              icon="checkmark-circle-outline"
              label="Present Days"
              value={monthlySummary.presentDays}
              hint="Logged as present"
              tone="success"
            />
            <SummaryTile
              icon="close-circle-outline"
              label="Absent Days"
              value={monthlySummary.absentDays}
              hint="Missed shifts"
              tone="danger"
            />
            <SummaryTile
              icon="airplane-outline"
              label="Leave Days"
              value={monthlySummary.leaveDays}
              hint="Approved leave"
              tone="warning"
            />
            <SummaryTile
              icon="time-outline"
              label="Work Hours"
              value={formatDuration(monthlySummary.totalWorkingMs)}
              hint="Net time this month"
              tone="accent"
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader
            icon="flash-outline"
            title="Today's shift"
            subtitle="Live attendance status with the same check-in, break, resume, and check-out workflow from the web dashboard."
          />

          <View style={styles.liveCard}>
            <View style={styles.liveCardTop}>
              <View style={styles.liveCopy}>
                <Text style={styles.liveTitle}>{isOnline ? 'You are online' : 'Shift status'}</Text>
                <Text style={styles.liveSubtitle}>
                  Worked {formatDuration(workedMs)} today
                </Text>
              </View>

              <ToneBadge
                icon={dutyMeta.icon}
                label={dutyMeta.label}
                tone={dutyMeta.tone}
              />
            </View>

            <View style={styles.liveMetricsRow}>
              <View style={styles.liveMetric}>
                <Text style={styles.liveMetricLabel}>Check in</Text>
                <Text style={styles.liveMetricValue}>
                  {formatTime(todayAttendance?.checkInTime)}
                </Text>
              </View>
              <View style={styles.liveMetric}>
                <Text style={styles.liveMetricLabel}>Check out</Text>
                <Text style={styles.liveMetricValue}>
                  {formatTime(todayAttendance?.checkOutTime)}
                </Text>
              </View>
              <View style={styles.liveMetric}>
                <Text style={styles.liveMetricLabel}>Break time</Text>
                <Text style={styles.liveMetricValue}>
                  {formatDuration(todayAttendance?.totalBreakMsLive ?? 0)}
                </Text>
              </View>
            </View>

            {dutyMeta.actions?.length ? (
              <View style={styles.dutyActionRow}>
                {dutyMeta.actions.map((action) => (
                  <DutyActionButton
                    key={action.key}
                    action={action}
                    busy={actingAction === action.key}
                    onPress={() => handleAttendanceAction(action.key)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader
            icon="options-outline"
            title="Month filters"
            subtitle="Swipe through months and years to review earlier attendance cycles."
          />

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Month</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {MONTH_OPTIONS.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  active={selectedMonth === option.value}
                  onPress={() => setSelectedMonth(option.value)}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Year</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {yearOptions.map((year) => (
                <FilterChip
                  key={year}
                  label={year}
                  active={selectedYear === year}
                  onPress={() => setSelectedYear(year)}
                />
              ))}
            </ScrollView>
          </View>
        </View>

        {loading && !hasRecords ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading attendance timeline...</Text>
          </View>
        ) : null}

        {hasRecords ? (
          <View style={styles.sectionCard}>
            <SectionHeader
              icon="list-outline"
              title="Recent logs"
              subtitle="A quick glance at daily attendance entries for the selected month."
              actionLabel="Download"
              onActionPress={handleDownloadReport}
            />

            <FlatList
              data={attendanceRecords.slice(0, 15)}
              keyExtractor={(item) => item._id || item.dateString}
              renderItem={({ item }) => <CompactLogItem record={item} />}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.compactLogSep} />}
            />
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <SectionHeader
            icon="list-outline"
            title="Daily attendance log"
            subtitle="Detailed daily records for exact punch timings, break totals, and shift status."
            actionLabel={hasRecords ? 'Refresh' : null}
            onActionPress={() => hydrateAttendance(true)}
          />

          {hasRecords ? (
            attendanceRecords.map((record) => (
              <AttendanceLogCard
                key={record._id || record.dateString}
                record={record}
              />
            ))
          ) : (
            <EmptyState
              icon="calendar-clear-outline"
              title="No attendance records found"
              body="Try another month or pull to refresh after syncing your shift activity."
              actionLabel="Reload records"
              onActionPress={() => hydrateAttendance(true)}
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
    opacity: 0.8,
  },
  backgroundOrbTop: {
    top: -44,
    right: -28,
    width: 176,
    height: 176,
  },
  backgroundOrbBottom: {
    bottom: 72,
    left: -54,
    width: 154,
    height: 154,
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
    fontSize: 30,
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
  heroActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  heroPrimaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  heroPrimaryActionPressed: {
    opacity: 0.88,
  },
  heroPrimaryActionBusy: {
    opacity: 0.84,
  },
  heroPrimaryActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
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
  liveCard: {
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.lg,
    gap: SIZES.lg,
  },
  liveCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  liveCopy: {
    flex: 1,
    gap: 4,
  },
  liveTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  liveSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  liveMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  liveMetric: {
    flex: 1,
    minWidth: '30%',
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.md,
    gap: 4,
  },
  liveMetricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  liveMetricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  dutyActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  dutyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    minWidth: 120,
  },
  dutyActionButtonPressed: {
    opacity: 0.86,
  },
  dutyActionButtonBusy: {
    opacity: 0.82,
  },
  dutyActionButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  filterGroup: {
    gap: SIZES.sm,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  filterRow: {
    gap: SIZES.sm,
  },
  filterChip: {
    borderRadius: SIZES.radiusPill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipPressed: {
    opacity: 0.82,
  },
  filterChipText: {
    fontSize: 13,
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
  compactLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SIZES.md,
    paddingVertical: 10,
  },
  compactLogLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
  },
  compactLogDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  compactLogCopy: {
    flex: 1,
    gap: 2,
  },
  compactLogDate: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  compactLogTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  compactLogSep: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  logCard: {
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.lg,
    gap: SIZES.md,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  logCopy: {
    flex: 1,
    gap: 2,
  },
  logDate: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  logDateSubtle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  logMetricsRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  logMetric: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.md,
    gap: 4,
  },
  logMetricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  logMetricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
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
    width: 54,
    height: 54,
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
