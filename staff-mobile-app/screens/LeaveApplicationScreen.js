import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import apiClient from '../api/client';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/staffWorkspace';

const LEAVE_TYPE_OPTIONS = [
  {
    value: 'Sick Leave',
    icon: 'medkit-outline',
    tone: 'danger',
  },
  {
    value: 'Casual Leave',
    icon: 'sunny-outline',
    tone: 'accent',
  },
  {
    value: 'Personal Leave',
    icon: 'person-outline',
    tone: 'primary',
  },
  {
    value: 'Emergency Leave',
    icon: 'alert-circle-outline',
    tone: 'warning',
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

function stripTime(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function formatRequestDate(date) {
  const normalized = stripTime(date);
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, '0');
  const day = String(normalized.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDateFromDateString(value) {
  return new Date(`${value}T00:00:00`);
}

function formatDisplayDate(value) {
  if (!value) {
    return 'Select date';
  }

  const date =
    value instanceof Date ? stripTime(value) : buildDateFromDateString(value);

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatAppliedDate(value) {
  if (!value) {
    return 'Just now';
  }

  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getDurationInDays(startDate, endDate) {
  const start = stripTime(startDate).getTime();
  const end = stripTime(endDate).getTime();
  const diff = Math.max(0, end - start);
  return Math.floor(diff / (24 * 60 * 60 * 1000)) + 1;
}

function formatLeaveWindow(dateFrom, dateTo) {
  const fromLabel = formatDisplayDate(dateFrom);
  const toLabel = formatDisplayDate(dateTo);

  if (dateFrom === dateTo) {
    return fromLabel;
  }

  return `${fromLabel} to ${toLabel}`;
}

function buildStoredReason(type, reason) {
  return `[LEAVE_TYPE:${type}] ${reason.trim()}`;
}

function parseStoredReason(value) {
  const source = String(value || '').trim();
  const match = source.match(/^\[LEAVE_TYPE:(.+?)\]\s*/);

  if (!match) {
    return {
      leaveType: 'General Leave',
      cleanReason: source || 'No reason provided.',
    };
  }

  return {
    leaveType: match[1].trim() || 'General Leave',
    cleanReason: source.slice(match[0].length).trim() || 'No reason provided.',
  };
}

function getLeaveTypeMeta(type) {
  const match = LEAVE_TYPE_OPTIONS.find((option) => option.value === type);
  return (
    match || {
      value: type || 'General Leave',
      icon: 'sparkles-outline',
      tone: 'primary',
    }
  );
}

function getLeaveStatusMeta(status) {
  switch (String(status || '').trim()) {
    case 'Approved':
      return {
        label: 'Approved',
        icon: 'checkmark-circle-outline',
        tone: 'success',
      };
    case 'Rejected':
      return {
        label: 'Rejected',
        icon: 'close-circle-outline',
        tone: 'danger',
      };
    default:
      return {
        label: 'Pending',
        icon: 'time-outline',
        tone: 'warning',
      };
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

function LeaveTypeChip({ option, active, onPress }) {
  const palette = getPalette(active ? option.tone : 'neutral');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.leaveTypeChip,
        {
          backgroundColor: palette.background,
          borderColor: active ? palette.text : palette.border,
        },
        pressed && styles.leaveTypeChipPressed,
      ]}
    >
      <Ionicons name={option.icon} size={16} color={palette.text} />
      <Text style={[styles.leaveTypeChipText, { color: palette.text }]}>
        {option.value}
      </Text>
    </Pressable>
  );
}

function DateField({ label, value, icon, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.dateField,
        pressed && styles.dateFieldPressed,
      ]}
    >
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.dateValueRow}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
        <Text style={styles.dateFieldValue}>{value}</Text>
      </View>
    </Pressable>
  );
}

function LeaveHistoryCard({ item }) {
  const statusMeta = getLeaveStatusMeta(item.status);
  const typeMeta = getLeaveTypeMeta(item.leaveType);

  return (
    <View style={styles.historyCard}>
      <View style={styles.historyTopRow}>
        <View style={styles.historyTitleWrap}>
          <Text style={styles.historyEyebrow}>Applied on {item.appliedOnLabel}</Text>
          <Text style={styles.historyTitle}>{item.leaveType}</Text>
          <Text style={styles.historyWindow}>{item.dateWindow}</Text>
        </View>

        <ToneBadge
          icon={statusMeta.icon}
          label={statusMeta.label}
          tone={statusMeta.tone}
        />
      </View>

      <View style={styles.historyMetaRow}>
        <ToneBadge
          icon={typeMeta.icon}
          label={item.leaveType}
          tone={typeMeta.tone}
        />
        <ToneBadge
          icon="time-outline"
          label={`${item.durationDays} day${item.durationDays > 1 ? 's' : ''}`}
          tone="primary"
        />
      </View>

      <Text style={styles.historyReason}>{item.cleanReason}</Text>
    </View>
  );
}

export default function LeaveApplicationScreen({ navigation }) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const today = stripTime(new Date());

  const [profile, setProfile] = useState(auth?.profile || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [form, setForm] = useState({
    leaveType: LEAVE_TYPE_OPTIONS[0].value,
    startDate: today,
    endDate: today,
    reason: '',
  });
  const [pickerState, setPickerState] = useState({
    visible: false,
    field: 'startDate',
    value: today,
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

    hydrateLeaves();
  }, [isFocused, auth?.profile?.email]);

  const leaveHistory = useMemo(
    () =>
      leaves.map((leave) => {
        const parsedReason = parseStoredReason(leave.reason);
        const durationDays = getDurationInDays(
          buildDateFromDateString(leave.dateFrom),
          buildDateFromDateString(leave.dateTo)
        );

        return {
          ...leave,
          leaveType: parsedReason.leaveType,
          cleanReason: parsedReason.cleanReason,
          durationDays,
          dateWindow: formatLeaveWindow(leave.dateFrom, leave.dateTo),
          appliedOnLabel: formatAppliedDate(leave.appliedOn),
        };
      }),
    [leaves]
  );

  const summary = useMemo(
    () =>
      leaveHistory.reduce(
        (accumulator, item) => {
          accumulator.totalRequests += 1;

          if (item.status === 'Approved') {
            accumulator.approvedDays += item.durationDays;
          } else if (item.status === 'Rejected') {
            accumulator.rejectedCount += 1;
          } else {
            accumulator.pendingCount += 1;
          }

          return accumulator;
        },
        {
          totalRequests: 0,
          pendingCount: 0,
          approvedDays: 0,
          rejectedCount: 0,
        }
      ),
    [leaveHistory]
  );

  const requestDuration = getDurationInDays(form.startDate, form.endDate);

  async function hydrateLeaves(isPullToRefresh = false) {
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
            'Leave screen profile refresh failed.',
            error?.message || error
          );
        }
      }

      if (!activeProfile?.email) {
        setLeaves([]);
        return;
      }

      const leaveResult = await apiClient.post('staff/my-leaves', {
        email: activeProfile.email,
      });

      setLeaves(
        leaveResult.data?.success ? leaveResult.data.leaves || [] : []
      );
    } catch (error) {
      if (!isPullToRefresh) {
        Alert.alert(
          'Could not load leave history',
          getApiErrorMessage(error, 'Please try again in a moment.')
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function updateDateField(field, nextDate) {
    const normalized = stripTime(nextDate);

    setForm((current) => {
      if (field === 'startDate') {
        return {
          ...current,
          startDate: normalized,
          endDate:
            current.endDate.getTime() < normalized.getTime()
              ? normalized
              : current.endDate,
        };
      }

      return {
        ...current,
        endDate:
          normalized.getTime() < current.startDate.getTime()
            ? current.startDate
            : normalized,
      };
    });
  }

  function openDatePicker(field) {
    const currentValue = form[field];

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: currentValue,
        mode: 'date',
        is24Hour: true,
        minimumDate:
          field === 'endDate' ? form.startDate : stripTime(new Date(2020, 0, 1)),
        onChange: (event, selectedDate) => {
          if (event.type === 'dismissed' || !selectedDate) {
            return;
          }

          updateDateField(field, selectedDate);
        },
      });

      return;
    }

    setPickerState({
      visible: true,
      field,
      value: currentValue,
    });
  }

  function closeIosPicker() {
    setPickerState((current) => ({
      ...current,
      visible: false,
    }));
  }

  async function handleSubmitLeave() {
    const reason = form.reason.trim();

    if (!profile?.email || !profile?.name) {
      Alert.alert(
        'Profile missing',
        'Please sign in again before applying for leave.'
      );
      return;
    }

    if (!reason) {
      Alert.alert('Reason required', 'Please tell us why you need leave.');
      return;
    }

    if (reason.length < 8) {
      Alert.alert(
        'More detail needed',
        'Please add a short but clear reason for your leave request.'
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiClient.post('staff/apply-leave', {
        email: profile.email,
        name: profile.name,
        dateFrom: formatRequestDate(form.startDate),
        dateTo: formatRequestDate(form.endDate),
        reason: buildStoredReason(form.leaveType, reason),
      });
      const payload = response.data || {};

      if (!payload.success) {
        throw new Error(payload.message || 'Leave application failed.');
      }

      Alert.alert('Application submitted', payload.message || 'Leave request sent.');
      setForm({
        leaveType: LEAVE_TYPE_OPTIONS[0].value,
        startDate: today,
        endDate: today,
        reason: '',
      });
      await hydrateLeaves(true);
    } catch (error) {
      Alert.alert(
        'Submission failed',
        getApiErrorMessage(error, 'Unable to submit your leave request right now.')
      );
    } finally {
      setSubmitting(false);
    }
  }

  const hasLeaveHistory = leaveHistory.length > 0;

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
          <Text style={styles.topBarTitle}>Leave Application</Text>
          <Text style={styles.topBarSubtitle}>
            Apply quickly, track approvals, and revisit past requests
          </Text>
        </View>

        <HeaderButton
          icon="refresh-outline"
          onPress={() => hydrateLeaves(true)}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => hydrateLeaves(true)}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <ToneBadge
              icon="calendar-clear-outline"
              label="Leave Desk"
              tone="accent"
            />

            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{getInitials(profile?.name)}</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Plan your time away smoothly</Text>
          <Text style={styles.heroBody}>
            Submit leave requests with clear dates and keep your approval history
            in one polished mobile view.
          </Text>

          <View style={styles.summaryGrid}>
            <SummaryTile
              icon="time-outline"
              label="Pending"
              value={summary.pendingCount}
              hint="Awaiting approval"
              tone="warning"
            />
            <SummaryTile
              icon="checkmark-circle-outline"
              label="Approved Days"
              value={summary.approvedDays}
              hint="Approved in history"
              tone="success"
            />
            <SummaryTile
              icon="receipt-outline"
              label="Requests"
              value={summary.totalRequests}
              hint="All applications"
              tone="accent"
            />
          </View>

          <View style={styles.formShell}>
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Leave Type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.leaveTypeRow}
              >
                {LEAVE_TYPE_OPTIONS.map((option) => (
                  <LeaveTypeChip
                    key={option.value}
                    option={option}
                    active={form.leaveType === option.value}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        leaveType: option.value,
                      }))
                    }
                  />
                ))}
              </ScrollView>
            </View>

            <View style={styles.dateRow}>
              <DateField
                label="Start Date"
                value={formatDisplayDate(form.startDate)}
                icon="calendar-outline"
                onPress={() => openDatePicker('startDate')}
              />
              <DateField
                label="End Date"
                value={formatDisplayDate(form.endDate)}
                icon="calendar-clear-outline"
                onPress={() => openDatePicker('endDate')}
              />
            </View>

            <View style={styles.durationCard}>
              <View style={styles.durationIconWrap}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={COLORS.warning}
                />
              </View>
              <View style={styles.durationCopy}>
                <Text style={styles.durationLabel}>Requested duration</Text>
                <Text style={styles.durationValue}>
                  {requestDuration} day{requestDuration > 1 ? 's' : ''}
                </Text>
              </View>
              <ToneBadge
                icon="sparkles-outline"
                label={form.leaveType}
                tone={getLeaveTypeMeta(form.leaveType).tone}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Reason</Text>
              <TextInput
                style={styles.textArea}
                multiline
                value={form.reason}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    reason: value,
                  }))
                }
                placeholder="Share the reason for your leave request"
                placeholderTextColor={COLORS.textTertiary}
                textAlignVertical="top"
              />
            </View>

            <Pressable
              onPress={handleSubmitLeave}
              disabled={submitting}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && !submitting && styles.submitButtonPressed,
                submitting && styles.submitButtonBusy,
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons
                    name="paper-plane-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                  <Text style={styles.submitButtonText}>
                    Submit Application
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {loading && !hasLeaveHistory ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading leave history...</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <SectionHeader
            icon="list-outline"
            title="Leave History"
            subtitle="A clean timeline of your leave requests with type, duration, and approval status."
            actionLabel={hasLeaveHistory ? 'Refresh' : null}
            onActionPress={() => hydrateLeaves(true)}
          />

          {hasLeaveHistory ? (
            leaveHistory.map((item) => (
              <LeaveHistoryCard
                key={item._id || `${item.dateFrom}-${item.dateTo}-${item.appliedOn}`}
                item={item}
              />
            ))
          ) : (
            <EmptyState
              icon="calendar-number-outline"
              title="No leave requests yet"
              body="Your submitted applications will appear here with approval updates and date ranges."
              actionLabel="Reload history"
              onActionPress={() => hydrateLeaves(true)}
            />
          )}
        </View>
      </ScrollView>

      {Platform.OS === 'ios' ? (
        <Modal
          animationType="slide"
          transparent
          visible={pickerState.visible}
          onRequestClose={closeIosPicker}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {pickerState.field === 'startDate'
                    ? 'Choose start date'
                    : 'Choose end date'}
                </Text>
                <Pressable
                  onPress={closeIosPicker}
                  style={({ pressed }) => [
                    styles.modalCloseButton,
                    pressed && styles.modalCloseButtonPressed,
                  ]}
                >
                  <Ionicons name="close-outline" size={20} color={COLORS.text} />
                </Pressable>
              </View>

              <DateTimePicker
                value={pickerState.value}
                mode="date"
                display="spinner"
                minimumDate={
                  pickerState.field === 'endDate'
                    ? form.startDate
                    : stripTime(new Date(2020, 0, 1))
                }
                onChange={(event, selectedDate) => {
                  if (event.type === 'dismissed' || !selectedDate) {
                    return;
                  }

                  setPickerState((current) => ({
                    ...current,
                    value: stripTime(selectedDate),
                  }));
                }}
                style={styles.iosPicker}
              />

              <View style={styles.modalActionRow}>
                <Pressable
                  onPress={closeIosPicker}
                  style={({ pressed }) => [
                    styles.modalSecondaryAction,
                    pressed && styles.modalSecondaryActionPressed,
                  ]}
                >
                  <Text style={styles.modalSecondaryActionText}>Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    updateDateField(pickerState.field, pickerState.value);
                    closeIosPicker();
                  }}
                  style={({ pressed }) => [
                    styles.modalPrimaryAction,
                    pressed && styles.modalPrimaryActionPressed,
                  ]}
                >
                  <Text style={styles.modalPrimaryActionText}>Apply Date</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
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
    top: -46,
    right: -30,
    width: 188,
    height: 188,
  },
  backgroundOrbBottom: {
    bottom: 80,
    left: -56,
    width: 164,
    height: 164,
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
    opacity: 0.78,
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
    ...SHADOWS.strong,
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
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.72)',
    marginTop: -8,
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
  formShell: {
    borderRadius: 26,
    backgroundColor: COLORS.surface,
    padding: SIZES.xl,
    gap: SIZES.lg,
  },
  formGroup: {
    gap: SIZES.sm,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  leaveTypeRow: {
    paddingRight: SIZES.md,
    gap: SIZES.sm,
  },
  leaveTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingHorizontal: SIZES.lg,
    paddingVertical: 13,
    borderRadius: SIZES.radiusPill,
    borderWidth: 1,
  },
  leaveTypeChipPressed: {
    opacity: 0.84,
  },
  leaveTypeChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    gap: SIZES.md,
  },
  dateField: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    gap: SIZES.sm,
  },
  dateFieldPressed: {
    opacity: 0.82,
  },
  dateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  dateFieldValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    borderRadius: 22,
    backgroundColor: COLORS.warningSoft,
    borderWidth: 1,
    borderColor: 'rgba(201, 135, 43, 0.18)',
    padding: SIZES.lg,
  },
  durationIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  durationCopy: {
    flex: 1,
    gap: 2,
  },
  durationLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  durationValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  textArea: {
    minHeight: 122,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text,
  },
  submitButton: {
    height: 56,
    borderRadius: 20,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(78, 123, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  submitButtonPressed: {
    opacity: 0.82,
  },
  submitButtonBusy: {
    opacity: 0.76,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
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
  sectionAction: {
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: SIZES.lg,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionActionPressed: {
    opacity: 0.82,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  historyCard: {
    borderRadius: 24,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.lg,
    gap: SIZES.md,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  historyTitleWrap: {
    flex: 1,
    gap: 4,
  },
  historyEyebrow: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  historyWindow: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  historyMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  historyReason: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
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
  emptyState: {
    borderRadius: 24,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.xl,
    alignItems: 'center',
    gap: SIZES.sm,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  emptyStateBody: {
    fontSize: 14,
    lineHeight: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
    padding: SIZES.lg,
  },
  modalCard: {
    borderRadius: 30,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.xl,
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.lg,
    gap: SIZES.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  modalCloseButtonPressed: {
    opacity: 0.82,
  },
  iosPicker: {
    alignSelf: 'center',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: SIZES.md,
  },
  modalSecondaryAction: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryActionPressed: {
    opacity: 0.82,
  },
  modalSecondaryActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalPrimaryAction: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryActionPressed: {
    opacity: 0.88,
  },
  modalPrimaryActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
});
