import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import apiClient from '../api/client';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import {
  formatCurrency,
  formatDuration,
  formatDateTime,
  getAttendanceState,
  getAttendanceTone,
  getInitials,
} from '../utils/staffWorkspace';

const SERVICE_OPTIONS = [
  'Instagram Growth',
  'Web Development',
  'Combo Package',
];

const TONE_MAP = {
  accent: {
    background: COLORS.accentSoft,
    text: COLORS.accent,
  },
  success: {
    background: COLORS.successSoft,
    text: COLORS.success,
  },
  warning: {
    background: COLORS.warningSoft,
    text: COLORS.warning,
  },
  danger: {
    background: COLORS.dangerSoft,
    text: COLORS.danger,
  },
  neutral: {
    background: COLORS.surfaceAlt,
    text: COLORS.textSecondary,
  },
};

function ToneBadge({ icon, label, tone = 'neutral' }) {
  const palette = TONE_MAP[tone] || TONE_MAP.neutral;

  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      {icon ? <Ionicons name={icon} size={14} color={palette.text} /> : null}
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function SummaryCard({ icon, label, value, hint, tone = 'accent' }) {
  const palette = TONE_MAP[tone] || TONE_MAP.accent;

  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIconWrap, { backgroundColor: palette.background }]}>
        <Ionicons name={icon} size={18} color={palette.text} />
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryHint}>{hint}</Text>
    </View>
  );
}

function MiniMetric({ label, value }) {
  return (
    <View style={styles.miniMetric}>
      <Text style={styles.miniMetricLabel}>{label}</Text>
      <Text style={styles.miniMetricValue}>{value}</Text>
    </View>
  );
}

function QuickLink({ icon, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickLink,
        pressed && styles.quickLinkPressed,
      ]}
    >
      <Ionicons name={icon} size={16} color={COLORS.primary} />
      <Text style={styles.quickLinkText}>{label}</Text>
    </Pressable>
  );
}

function FormField({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [profile, setProfile] = useState(auth?.profile || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLeadComposer, setShowLeadComposer] = useState(false);
  const [submittingLead, setSubmittingLead] = useState(false);
  const [dashboard, setDashboard] = useState({
    stats: null,
    tasks: [],
    todayAttendance: null,
    isOnline: false,
    notices: [],
  });
  const [leadForm, setLeadForm] = useState({
    clientName: '',
    contactNumber: '',
    servicePitch: SERVICE_OPTIONS[0],
  });

  useEffect(() => {
    if (auth?.profile) {
      setProfile(auth.profile);
    }
  }, [auth?.profile]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    hydrateDashboard();
  }, [isFocused, auth?.profile?.email]);

  async function hydrateDashboard(isPullToRefresh = false) {
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
          console.error('Dashboard profile refresh failed.', error?.message || error);
        }
      }

      if (!activeProfile?.email) {
        return;
      }

      const [statsResult, tasksResult, attendanceResult, noticesResult] =
        await Promise.allSettled([
          apiClient.post('staff/stats', { email: activeProfile.email }),
          apiClient.post('staff/tasks', { email: activeProfile.email }),
          apiClient.get('staff/today-attendance'),
          apiClient.get('staff/notices'),
        ]);

      setDashboard((current) => ({
        stats:
          statsResult.status === 'fulfilled' && statsResult.value.data?.success
            ? statsResult.value.data
            : current.stats,
        tasks:
          tasksResult.status === 'fulfilled' && tasksResult.value.data?.success
            ? tasksResult.value.data.tasks || []
            : current.tasks,
        todayAttendance:
          attendanceResult.status === 'fulfilled' &&
          attendanceResult.value.data?.success
            ? attendanceResult.value.data.attendance || null
            : current.todayAttendance,
        isOnline:
          attendanceResult.status === 'fulfilled' &&
          attendanceResult.value.data?.success
            ? Boolean(attendanceResult.value.data.isOnline)
            : current.isOnline,
        notices:
          noticesResult.status === 'fulfilled' && noticesResult.value.data?.success
            ? noticesResult.value.data.notices || []
            : current.notices,
      }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleCreateLead() {
    const clientName = leadForm.clientName.trim();
    const contactNumber = leadForm.contactNumber.trim();
    const servicePitch = leadForm.servicePitch.trim();

    if (!profile?.email) {
      Alert.alert('Profile missing', 'Please sign in again before adding a lead.');
      return;
    }

    if (!clientName || !contactNumber || !servicePitch) {
      Alert.alert('Missing details', 'Fill in all lead details before submitting.');
      return;
    }

    setSubmittingLead(true);

    try {
      const response = await apiClient.post('staff/add-lead', {
        clientName,
        contactNumber,
        servicePitch,
        email: profile.email,
      });

      const payload = response.data || {};

      if (!payload.success) {
        Alert.alert(
          'Could not add lead',
          payload.message || payload.error || 'Please try again.'
        );
        return;
      }

      Alert.alert('Lead added', payload.message || 'The lead was added successfully.');
      setLeadForm({
        clientName: '',
        contactNumber: '',
        servicePitch: SERVICE_OPTIONS[0],
      });
      setShowLeadComposer(false);
      await hydrateDashboard(true);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'We could not add your lead right now.';

      Alert.alert('Could not add lead', message);
    } finally {
      setSubmittingLead(false);
    }
  }

  const stats = dashboard.stats || {};
  const tasks = Array.isArray(dashboard.tasks) ? dashboard.tasks : [];
  const notices = Array.isArray(dashboard.notices) ? dashboard.notices : [];
  const todayAttendance = dashboard.todayAttendance;

  const assignedLeads = tasks.length;
  const closedLeads = tasks.filter((task) =>
    ['interested', 'rejected'].includes(task.status)
  ).length;
  const pendingFollowUps = tasks.filter((task) =>
    ['pending', 'call-back', 'not-answering'].includes(task.status)
  ).length;

  const attendanceState = getAttendanceState(todayAttendance);
  const workedMs =
    todayAttendance?.totalWorkingMsLive ?? todayAttendance?.totalWorkingMs ?? 0;
  const attendanceTone = getAttendanceTone(
    attendanceState,
    formatDuration(workedMs)
  );
  const latestNotice = notices[0] || null;

  return (
    <View style={styles.screen}>
      <View style={[styles.backgroundOrb, styles.backgroundOrbTop]} />
      <View style={[styles.backgroundOrb, styles.backgroundOrbBottom]} />

      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
          ]}
        >
          <Ionicons name="menu-outline" size={22} color={COLORS.text} />
        </Pressable>

        <View style={styles.topBarCopy}>
          <Text style={styles.topBarTitle}>Dashboard Home</Text>
          <Text style={styles.topBarSubtitle}>
            Command center for today&apos;s staff momentum
          </Text>
        </View>

        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>{getInitials(profile?.name)}</Text>
        </View>
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
            onRefresh={() => hydrateDashboard(true)}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.heroCard}>
          <ToneBadge
            icon="sparkles-outline"
            label="Dashboard Home"
            tone="accent"
          />
          <Text style={styles.heroTitle}>
            Welcome back{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}.
          </Text>
          <Text style={styles.heroBody}>
            Keep the main dashboard light, clear, and action-oriented. The deeper
            workflows stay inside their dedicated screens.
          </Text>

          <View style={styles.quickLinksRow}>
            <QuickLink
              icon="time-outline"
              label="Attendance"
              onPress={() => navigation.navigate('Attendance')}
            />
            <QuickLink
              icon="wallet-outline"
              label="Wallet"
              onPress={() => navigation.navigate('PayoutsWallet')}
            />
            <QuickLink
              icon="checkbox-outline"
              label="My Tasks"
              onPress={() => navigation.navigate('MyTasks')}
            />
          </View>
        </View>

        {loading && !dashboard.stats ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading dashboard summary...</Text>
          </View>
        ) : null}

        <View style={styles.leadsCard}>
          <View style={styles.sectionTopRow}>
            <View style={styles.sectionHeadingWrap}>
              <Text style={styles.sectionTitle}>Leads</Text>
              <Text style={styles.sectionSubtitle}>
                Quick visibility into what needs your attention next.
              </Text>
            </View>
            <ToneBadge
              icon="flash-outline"
              label={`${pendingFollowUps} pending`}
              tone={pendingFollowUps ? 'warning' : 'success'}
            />
          </View>

          <View style={styles.leadsMetricsRow}>
            <MiniMetric label="Assigned" value={assignedLeads} />
            <MiniMetric label="Closed" value={closedLeads} />
            <MiniMetric label="Follow-ups" value={pendingFollowUps} />
          </View>

          <Pressable
            onPress={() => setShowLeadComposer((current) => !current)}
            style={({ pressed }) => [
              styles.primaryAction,
              pressed && styles.primaryActionPressed,
            ]}
          >
            <Ionicons name="add-circle-outline" size={18} color={COLORS.white} />
            <Text style={styles.primaryActionText}>Set Your Lead</Text>
          </Pressable>

          {showLeadComposer ? (
            <View style={styles.leadComposer}>
              <FormField
                label="Client Name"
                placeholder="e.g. John Doe"
                value={leadForm.clientName}
                onChangeText={(value) =>
                  setLeadForm((current) => ({ ...current, clientName: value }))
                }
              />
              <FormField
                label="Contact No."
                placeholder="Phone or Insta ID"
                value={leadForm.contactNumber}
                onChangeText={(value) =>
                  setLeadForm((current) => ({ ...current, contactNumber: value }))
                }
                keyboardType="phone-pad"
              />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Service Pitch</Text>
                <View style={styles.serviceRow}>
                  {SERVICE_OPTIONS.map((service) => {
                    const active = leadForm.servicePitch === service;

                    return (
                      <Pressable
                        key={service}
                        onPress={() =>
                          setLeadForm((current) => ({
                            ...current,
                            servicePitch: service,
                          }))
                        }
                        style={({ pressed }) => [
                          styles.serviceChip,
                          active && styles.serviceChipActive,
                          pressed && !active && styles.serviceChipPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.serviceChipText,
                            active && styles.serviceChipTextActive,
                          ]}
                        >
                          {service}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Pressable
                onPress={handleCreateLead}
                disabled={submittingLead}
                style={({ pressed }) => [
                  styles.submitLeadButton,
                  pressed && !submittingLead && styles.submitLeadButtonPressed,
                  submittingLead && styles.submitLeadButtonBusy,
                ]}
              >
                {submittingLead ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={18} color={COLORS.white} />
                    <Text style={styles.submitLeadButtonText}>Add lead to CRM</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard
            icon="time-outline"
            label="Today&apos;s Attendance"
            value={attendanceTone.label}
            hint={`Worked ${formatDuration(workedMs)}`}
            tone={attendanceTone.tone}
          />
          <SummaryCard
            icon="wallet-outline"
            label="Current Wallet Balance"
            value={formatCurrency(stats.pendingPayout)}
            hint="Ready for the next payout request"
            tone="warning"
          />
          <SummaryCard
            icon="cash-outline"
            label="Total Earnings This Month"
            value={formatCurrency(stats.currentMonthEarnings)}
            hint={`${Number(stats.currentMonthApprovedItems || 0)} credited item(s)`}
            tone="accent"
          />
        </View>

        <View style={styles.noticeCard}>
          <View style={styles.sectionTopRow}>
            <View style={styles.sectionHeadingWrap}>
              <Text style={styles.sectionTitle}>Important Alerts</Text>
              <Text style={styles.sectionSubtitle}>
                Keep only the freshest admin signal on the dashboard.
              </Text>
            </View>
            <ToneBadge
              icon="notifications-outline"
              label={latestNotice ? 'Live' : 'Clear'}
              tone={latestNotice ? 'warning' : 'success'}
            />
          </View>

          {latestNotice ? (
            <View style={styles.alertCard}>
              <Text style={styles.alertTitle}>{latestNotice.title || 'Notice'}</Text>
              <Text style={styles.alertBody} numberOfLines={3}>
                {latestNotice.message || 'No details added.'}
              </Text>
              <Text style={styles.alertMeta}>
                {formatDateTime(latestNotice.date)} • {latestNotice.author || 'Admin'}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyAlert}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={COLORS.success}
              />
              <Text style={styles.emptyAlertText}>
                No urgent notices right now.
              </Text>
            </View>
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
    opacity: 0.88,
  },
  backgroundOrbTop: {
    top: -70,
    right: -80,
    width: 250,
    height: 250,
    backgroundColor: COLORS.primarySoft,
  },
  backgroundOrbBottom: {
    bottom: 40,
    left: -90,
    width: 240,
    height: 240,
    backgroundColor: COLORS.accentSoft,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.xl,
    paddingBottom: SIZES.lg,
    gap: SIZES.md,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconButtonPressed: {
    opacity: 0.82,
  },
  topBarCopy: {
    flex: 1,
    gap: 2,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  topBarSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
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
    gap: SIZES.lg,
    ...SHADOWS.strong,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -1,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.76)',
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: SIZES.radiusPill,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  quickLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: SIZES.radiusPill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  quickLinkPressed: {
    opacity: 0.84,
  },
  quickLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    padding: SIZES.lg,
    ...SHADOWS.soft,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  leadsCard: {
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.surface,
    padding: SIZES.xxl,
    gap: SIZES.lg,
    ...SHADOWS.soft,
  },
  sectionTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  sectionHeadingWrap: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  leadsMetricsRow: {
    flexDirection: 'row',
    gap: SIZES.md,
  },
  miniMetric: {
    flex: 1,
    borderRadius: 20,
    padding: SIZES.lg,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  miniMetricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  miniMetricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  primaryAction: {
    minHeight: 56,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    ...SHADOWS.medium,
  },
  primaryActionPressed: {
    opacity: 0.92,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },
  leadComposer: {
    gap: SIZES.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.lg,
  },
  fieldGroup: {
    gap: SIZES.sm,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  input: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: SIZES.lg,
    fontSize: 15,
    color: COLORS.text,
  },
  serviceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  serviceChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: SIZES.radiusPill,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  serviceChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  serviceChipPressed: {
    opacity: 0.84,
  },
  serviceChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  serviceChipTextActive: {
    color: COLORS.white,
  },
  submitLeadButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
  },
  submitLeadButtonPressed: {
    opacity: 0.9,
  },
  submitLeadButtonBusy: {
    opacity: 0.75,
  },
  submitLeadButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.md,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 150,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    padding: SIZES.xl,
    gap: SIZES.sm,
    ...SHADOWS.soft,
  },
  summaryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  summaryHint: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  noticeCard: {
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.surface,
    padding: SIZES.xxl,
    gap: SIZES.lg,
    ...SHADOWS.soft,
  },
  alertCard: {
    borderRadius: 20,
    padding: SIZES.lg,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SIZES.sm,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  alertBody: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  alertMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
  },
  emptyAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingVertical: SIZES.sm,
  },
  emptyAlertText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
