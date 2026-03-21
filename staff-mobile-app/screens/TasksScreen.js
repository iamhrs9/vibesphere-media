import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { formatCurrency, formatDate, getInitials } from '../utils/staffWorkspace';

const LEAD_STATUS_OPTIONS = [
  {
    value: 'pending',
    label: 'Pending',
    icon: 'time-outline',
    tone: 'warning',
  },
  {
    value: 'call-back',
    label: 'Call Back',
    icon: 'call-outline',
    tone: 'accent',
  },
  {
    value: 'not-answering',
    label: 'No Answer',
    icon: 'notifications-off-outline',
    tone: 'neutral',
  },
  {
    value: 'interested',
    label: 'Interested',
    icon: 'checkmark-circle-outline',
    tone: 'success',
  },
  {
    value: 'rejected',
    label: 'Rejected',
    icon: 'close-circle-outline',
    tone: 'danger',
  },
];

const LEAD_STATUS_LOOKUP = LEAD_STATUS_OPTIONS.reduce((lookup, option) => {
  lookup[option.value] = option;
  return lookup;
}, {});

const BOUNTY_STATUS_LOOKUP = {
  Assigned: {
    label: 'Assigned',
    icon: 'briefcase-outline',
    tone: 'accent',
  },
  Submitted: {
    label: 'Submitted',
    icon: 'paper-plane-outline',
    tone: 'warning',
  },
  Revision: {
    label: 'Revision',
    icon: 'refresh-circle-outline',
    tone: 'danger',
  },
  Approved: {
    label: 'Approved',
    icon: 'checkmark-done-circle-outline',
    tone: 'success',
  },
};

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

function isLeadClosed(status) {
  return ['interested', 'rejected'].includes(String(status || '').trim());
}

function isSubmittableBounty(status) {
  return ['Assigned', 'Revision'].includes(String(status || '').trim());
}

function buildLeadDrafts(tasks) {
  return (tasks || []).reduce((drafts, task) => {
    drafts[task._id] = {
      status: task.status || 'pending',
      notes: task.notes || '',
    };
    return drafts;
  }, {});
}

function buildSubmissionDrafts(tasks) {
  return (tasks || []).reduce((drafts, task) => {
    drafts[task._id] = task.submissionLink || '';
    return drafts;
  }, {});
}

function getLeadStatusMeta(status) {
  return LEAD_STATUS_LOOKUP[status] || LEAD_STATUS_LOOKUP.pending;
}

function getBountyStatusMeta(status) {
  return BOUNTY_STATUS_LOOKUP[status] || BOUNTY_STATUS_LOOKUP.Assigned;
}

function getAiScoreMeta(aiScore) {
  const label = String(aiScore || '').trim();
  const normalized = label.toLowerCase();

  if (!label) {
    return null;
  }

  if (normalized.includes('hot')) {
    return { label, tone: 'danger', icon: 'flame-outline' };
  }

  if (normalized.includes('warm')) {
    return { label, tone: 'warning', icon: 'sunny-outline' };
  }

  if (normalized.includes('cold')) {
    return { label, tone: 'accent', icon: 'snow-outline' };
  }

  return { label, tone: 'primary', icon: 'sparkles-outline' };
}

function getLeadUrgencyMeta(task, status) {
  if (isLeadClosed(status)) {
    return {
      label: 'Completed',
      tone: 'success',
      icon: 'checkmark-circle-outline',
    };
  }

  const assignedTime = task?.dateAssigned ? new Date(task.dateAssigned).getTime() : 0;

  if (assignedTime && Date.now() - assignedTime > 48 * 60 * 60 * 1000) {
    return {
      label: 'Overdue',
      tone: 'danger',
      icon: 'alert-circle-outline',
    };
  }

  return {
    label: 'Active',
    tone: 'warning',
    icon: 'time-outline',
  };
}

function getBountyFeedbackCopy(task) {
  if (task?.adminFeedback) {
    return task.adminFeedback;
  }

  switch (task?.status) {
    case 'Submitted':
      return 'Awaiting admin review. Keep your submission link ready in case feedback comes back.';
    case 'Approved':
      return 'Approved work will move into your payout pipeline automatically.';
    case 'Revision':
      return 'Revision requested. Review the brief again, update your delivery, and resubmit from this card.';
    default:
      return 'No feedback yet. Once you submit, any admin notes will appear here.';
  }
}

async function openExternalUrl(url, fallbackMessage) {
  const normalizedUrl = String(url || '').trim();

  if (!normalizedUrl) {
    Alert.alert('Link unavailable', fallbackMessage);
    return;
  }

  try {
    const supported = await Linking.canOpenURL(normalizedUrl);

    if (!supported) {
      throw new Error('Unsupported URL');
    }

    await Linking.openURL(normalizedUrl);
  } catch (error) {
    Alert.alert('Could not open link', fallbackMessage);
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

function MetaPill({ icon, label, tone = 'neutral' }) {
  const palette = getPalette(tone);

  return (
    <View
      style={[
        styles.metaPill,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
      ]}
    >
      <Ionicons name={icon} size={14} color={palette.text} />
      <Text style={[styles.metaPillText, { color: palette.text }]} numberOfLines={1}>
        {label}
      </Text>
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

function LeadTaskCard({
  task,
  draft,
  expanded,
  saving,
  onToggle,
  onCall,
  onStatusChange,
  onNotesChange,
  onSave,
}) {
  const activeStatus = draft?.status || task.status || 'pending';
  const activeNotes = draft?.notes ?? task.notes ?? '';
  const statusMeta = getLeadStatusMeta(activeStatus);
  const urgencyMeta = getLeadUrgencyMeta(task, activeStatus);
  const aiScoreMeta = getAiScoreMeta(task.aiScore);

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskCardHeader}>
        <View style={styles.taskCardCopy}>
          <Text style={styles.cardEyebrow}>Lead follow-up</Text>
          <Text style={styles.cardTitle}>{task.clientName || 'Untitled lead'}</Text>
          <Text style={styles.cardSubtitle}>
            {task.clientType || 'Assigned lead'}
          </Text>
        </View>

        <View style={styles.taskHeaderBadges}>
          <ToneBadge
            icon={urgencyMeta.icon}
            label={urgencyMeta.label}
            tone={urgencyMeta.tone}
          />
          <ToneBadge
            icon={statusMeta.icon}
            label={statusMeta.label}
            tone={statusMeta.tone}
          />
        </View>
      </View>

      <View style={styles.metaWrap}>
        <MetaPill
          icon="call-outline"
          label={task.contactNumber || 'No contact provided'}
        />
        <MetaPill
          icon="briefcase-outline"
          label={task.servicePitch || 'Service not set'}
          tone="primary"
        />
        {aiScoreMeta ? (
          <MetaPill
            icon={aiScoreMeta.icon}
            label={aiScoreMeta.label}
            tone={aiScoreMeta.tone}
          />
        ) : null}
        <MetaPill
          icon="calendar-outline"
          label={`Assigned ${formatDate(task.dateAssigned)}`}
        />
      </View>

      <View style={styles.cardActionRow}>
        <Pressable
          onPress={onToggle}
          style={({ pressed }) => [
            styles.textAction,
            pressed && styles.textActionPressed,
          ]}
        >
          <Text style={styles.textActionText}>
            {expanded ? 'Hide details' : 'View details'}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={16}
            color={COLORS.primary}
          />
        </Pressable>

        {task.contactNumber ? (
          <Pressable
            onPress={onCall}
            style={({ pressed }) => [
              styles.ghostButton,
              pressed && styles.ghostButtonPressed,
            ]}
          >
            <Ionicons name="call-outline" size={16} color={COLORS.primary} />
            <Text style={styles.ghostButtonText}>Call client</Text>
          </Pressable>
        ) : null}
      </View>

      {expanded ? (
        <View style={styles.expandedPanel}>
          <Text style={styles.inputLabel}>Change task status</Text>
          <View style={styles.selectorWrap}>
            {LEAD_STATUS_OPTIONS.map((option) => {
              const active = activeStatus === option.value;
              const palette = getPalette(option.tone);

              return (
                <Pressable
                  key={option.value}
                  onPress={() => onStatusChange(option.value)}
                  style={({ pressed }) => [
                    styles.selectorChip,
                    active && {
                      backgroundColor: palette.background,
                      borderColor: palette.border,
                    },
                    pressed && !active && styles.selectorChipPressed,
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={14}
                    color={active ? palette.text : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.selectorChipText,
                      active && { color: palette.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput
            multiline
            textAlignVertical="top"
            value={activeNotes}
            onChangeText={onNotesChange}
            style={styles.notesInput}
            placeholder="Capture call outcome, next step, or objections..."
            placeholderTextColor={COLORS.textTertiary}
          />

          <Pressable
            onPress={onSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !saving && styles.primaryButtonPressed,
              saving && styles.primaryButtonBusy,
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={COLORS.white}
                />
                <Text style={styles.primaryButtonText}>Save update</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function BountyTaskCard({
  task,
  submissionDraft,
  expanded,
  submitting,
  onToggle,
  onDraftChange,
  onSubmit,
  onOpenLink,
}) {
  const statusMeta = getBountyStatusMeta(task.status);
  const canSubmit = isSubmittableBounty(task.status);
  const amountLabel = formatCurrency(task.bountyAmount);
  const feedbackCopy = getBountyFeedbackCopy(task);

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskCardHeader}>
        <View style={styles.taskCardCopy}>
          <Text style={styles.cardEyebrow}>Bounty project</Text>
          <Text style={styles.cardTitle}>{task.title || 'Untitled project'}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={expanded ? undefined : 2}>
            {task.description || 'No description provided yet.'}
          </Text>
        </View>

        <View style={styles.amountPill}>
          <Text style={styles.amountPillLabel}>Bounty</Text>
          <Text style={styles.amountPillValue}>{amountLabel}</Text>
        </View>
      </View>

      <View style={styles.metaWrap}>
        <ToneBadge
          icon={statusMeta.icon}
          label={statusMeta.label}
          tone={statusMeta.tone}
        />
        <MetaPill
          icon="time-outline"
          label={`Updated ${formatDate(task.updatedAt || task.createdAt)}`}
        />
        {task.approvedAt ? (
          <MetaPill
            icon="wallet-outline"
            label={`Approved ${formatDate(task.approvedAt)}`}
            tone="success"
          />
        ) : null}
      </View>

      <View style={styles.cardActionRow}>
        <Pressable
          onPress={onToggle}
          style={({ pressed }) => [
            styles.textAction,
            pressed && styles.textActionPressed,
          ]}
        >
          <Text style={styles.textActionText}>
            {expanded ? 'Hide details' : 'View details'}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={16}
            color={COLORS.primary}
          />
        </Pressable>

        {task.submissionLink ? (
          <Pressable
            onPress={onOpenLink}
            style={({ pressed }) => [
              styles.ghostButton,
              pressed && styles.ghostButtonPressed,
            ]}
          >
            <Ionicons name="open-outline" size={16} color={COLORS.primary} />
            <Text style={styles.ghostButtonText}>Open link</Text>
          </Pressable>
        ) : null}
      </View>

      {expanded ? (
        <View style={styles.expandedPanel}>
          <Text style={styles.inputLabel}>Admin feedback</Text>
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackText}>{feedbackCopy}</Text>
          </View>

          <Text style={styles.inputLabel}>Submission link</Text>
          {canSubmit ? (
            <>
              <TextInput
                value={submissionDraft}
                onChangeText={onDraftChange}
                style={styles.linkInput}
                placeholder="https://your-drive-link-or-live-demo"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />

              <Pressable
                onPress={onSubmit}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && !submitting && styles.primaryButtonPressed,
                  submitting && styles.primaryButtonBusy,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons
                      name="paper-plane-outline"
                      size={18}
                      color={COLORS.white}
                    />
                    <Text style={styles.primaryButtonText}>Submit work link</Text>
                  </>
                )}
              </Pressable>
            </>
          ) : task.submissionLink ? (
            <Pressable
              onPress={onOpenLink}
              style={({ pressed }) => [
                styles.linkPreview,
                pressed && styles.linkPreviewPressed,
              ]}
            >
              <Ionicons name="link-outline" size={18} color={COLORS.accent} />
              <Text style={styles.linkPreviewText} numberOfLines={2}>
                {task.submissionLink}
              </Text>
              <Ionicons name="open-outline" size={18} color={COLORS.accent} />
            </Pressable>
          ) : (
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackText}>
                No submission link is attached to this project yet.
              </Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

export default function TasksScreen({ navigation }) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [profile, setProfile] = useState(auth?.profile || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leadTasks, setLeadTasks] = useState([]);
  const [bountyTasks, setBountyTasks] = useState([]);
  const [leadDrafts, setLeadDrafts] = useState({});
  const [submissionDrafts, setSubmissionDrafts] = useState({});
  const [expandedLeadId, setExpandedLeadId] = useState(null);
  const [expandedBountyId, setExpandedBountyId] = useState(null);
  const [savingLeadId, setSavingLeadId] = useState('');
  const [submittingBountyId, setSubmittingBountyId] = useState('');

  useEffect(() => {
    if (auth?.profile) {
      setProfile(auth.profile);
    }
  }, [auth?.profile]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    hydrateTasks();
  }, [isFocused, auth?.profile?.email]);

  async function hydrateTasks(isPullToRefresh = false) {
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
          console.error('Task screen profile refresh failed.', error?.message || error);
        }
      }

      if (!activeProfile?.email) {
        setLeadTasks([]);
        setBountyTasks([]);
        setLeadDrafts({});
        setSubmissionDrafts({});
        return;
      }

      const [leadResult, bountyResult] = await Promise.allSettled([
        apiClient.post('staff/tasks', { email: activeProfile.email }),
        apiClient.get('staff/bounty-tasks'),
      ]);

      const nextLeadTasks =
        leadResult.status === 'fulfilled' && leadResult.value.data?.success
          ? leadResult.value.data.tasks || []
          : [];
      const nextBountyTasks =
        bountyResult.status === 'fulfilled' && bountyResult.value.data?.success
          ? bountyResult.value.data.tasks || []
          : [];

      setLeadTasks(nextLeadTasks);
      setBountyTasks(nextBountyTasks);
      setLeadDrafts(buildLeadDrafts(nextLeadTasks));
      setSubmissionDrafts(buildSubmissionDrafts(nextBountyTasks));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function updateLeadDraft(taskId, key, value) {
    setLeadDrafts((current) => ({
      ...current,
      [taskId]: {
        status: current[taskId]?.status || 'pending',
        notes: current[taskId]?.notes || '',
        [key]: value,
      },
    }));
  }

  function updateSubmissionDraft(taskId, value) {
    setSubmissionDrafts((current) => ({
      ...current,
      [taskId]: value,
    }));
  }

  async function handleCall(contactNumber) {
    const sanitized = String(contactNumber || '').replace(/[^\d+]/g, '');

    if (!sanitized) {
      Alert.alert('Contact unavailable', 'This task does not have a valid phone number.');
      return;
    }

    await openExternalUrl(`tel:${sanitized}`, 'Unable to start a call from this device.');
  }

  async function handleOpenLink(url) {
    await openExternalUrl(url, 'Unable to open this link right now.');
  }

  async function handleSaveLead(task) {
    const draft = leadDrafts[task._id] || {};
    const status = draft.status || task.status || 'pending';
    const notes = String(draft.notes ?? '').trim();

    setSavingLeadId(task._id);

    try {
      const response = await apiClient.post('staff/update-task', {
        taskId: task._id,
        status,
        notes,
      });
      const payload = response.data || {};

      if (!payload.success) {
        throw new Error(payload.message || payload.error || 'Unable to save task.');
      }

      setLeadTasks((current) =>
        current.map((item) =>
          item._id === task._id
            ? {
                ...item,
                status,
                notes,
              }
            : item
        )
      );
      setLeadDrafts((current) => ({
        ...current,
        [task._id]: { status, notes },
      }));

      Alert.alert('Task updated', payload.message || 'Your update was saved.');
    } catch (error) {
      Alert.alert(
        'Update failed',
        getApiErrorMessage(error, 'Unable to save this task right now.')
      );
    } finally {
      setSavingLeadId('');
    }
  }

  async function handleSubmitBounty(task) {
    const submissionLink = String(
      submissionDrafts[task._id] ?? task.submissionLink ?? ''
    ).trim();

    if (!submissionLink) {
      Alert.alert(
        'Missing link',
        'Paste your completed work link before submitting.'
      );
      return;
    }

    setSubmittingBountyId(task._id);

    try {
      const response = await apiClient.post(
        `staff/bounty-tasks/${task._id}/submit`,
        { submissionLink }
      );
      const payload = response.data || {};

      if (!payload.success) {
        throw new Error(payload.message || 'Unable to submit this task.');
      }

      setBountyTasks((current) =>
        current.map((item) =>
          item._id === task._id
            ? {
                ...item,
                status: 'Submitted',
                submissionLink,
                adminFeedback: '',
              }
            : item
        )
      );
      setSubmissionDrafts((current) => ({
        ...current,
        [task._id]: submissionLink,
      }));

      Alert.alert(
        'Submitted',
        payload.message || 'Your work link has been sent for review.'
      );
    } catch (error) {
      Alert.alert(
        'Submission failed',
        getApiErrorMessage(error, 'Unable to submit this task right now.')
      );
    } finally {
      setSubmittingBountyId('');
    }
  }

  const openLeads = leadTasks.filter((task) => !isLeadClosed(task.status)).length;
  const closedLeads = leadTasks.length - openLeads;
  const liveBounties = bountyTasks.filter((task) =>
    isSubmittableBounty(task.status)
  ).length;
  const approvedBountyValue = bountyTasks
    .filter((task) => task.status === 'Approved')
    .reduce((sum, task) => sum + Number(task.bountyAmount || 0), 0);
  const hasTasks = leadTasks.length > 0 || bountyTasks.length > 0;

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
          <Text style={styles.topBarTitle}>My Tasks</Text>
          <Text style={styles.topBarSubtitle}>
            Lead follow-ups and bounty work, rebuilt for mobile
          </Text>
        </View>

        <HeaderButton
          icon="refresh-outline"
          onPress={() => hydrateTasks(true)}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 44 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => hydrateTasks(true)}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <ToneBadge
              icon="sparkles-outline"
              label="Task Workspace"
              tone="accent"
            />

            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{getInitials(profile?.name)}</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>
            Stay on top of every follow-up without the table fatigue.
          </Text>
          <Text style={styles.heroBody}>
            Assigned leads and bounty submissions now live in calm action cards
            with one-tap status updates, notes, and work-link submission.
          </Text>

          <View style={styles.summaryGrid}>
            <SummaryTile
              icon="time-outline"
              label="Open leads"
              value={openLeads}
              hint="Needs follow-up"
              tone={openLeads ? 'warning' : 'success'}
            />
            <SummaryTile
              icon="checkmark-circle-outline"
              label="Closed leads"
              value={closedLeads}
              hint="Interested or rejected"
              tone="success"
            />
            <SummaryTile
              icon="briefcase-outline"
              label="Live bounties"
              value={liveBounties}
              hint="Ready to submit"
              tone={liveBounties ? 'accent' : 'neutral'}
            />
            <SummaryTile
              icon="wallet-outline"
              label="Approved bounty"
              value={formatCurrency(approvedBountyValue)}
              hint="Moves to payout"
              tone={approvedBountyValue ? 'warning' : 'neutral'}
            />
          </View>
        </View>

        {loading && !hasTasks ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading your task workspace...</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <SectionHeader
            icon="call-outline"
            title="Lead follow-ups"
            subtitle="Update outcome, keep notes fresh, and call clients directly from the card."
            actionLabel={leadTasks.length ? 'Refresh' : null}
            onActionPress={() => hydrateTasks(true)}
          />

          {leadTasks.length ? (
            leadTasks.map((task) => (
              <LeadTaskCard
                key={task._id}
                task={task}
                draft={leadDrafts[task._id]}
                expanded={expandedLeadId === task._id}
                saving={savingLeadId === task._id}
                onToggle={() =>
                  setExpandedLeadId((current) =>
                    current === task._id ? null : task._id
                  )
                }
                onCall={() => handleCall(task.contactNumber)}
                onStatusChange={(value) => updateLeadDraft(task._id, 'status', value)}
                onNotesChange={(value) => updateLeadDraft(task._id, 'notes', value)}
                onSave={() => handleSaveLead(task)}
              />
            ))
          ) : (
            <EmptyState
              icon="radio-outline"
              title="No lead tasks yet"
              body="Assigned leads will appear here once they are routed to your workspace."
              actionLabel="Refresh tasks"
              onActionPress={() => hydrateTasks(true)}
            />
          )}
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader
            icon="briefcase-outline"
            title="Bounty projects"
            subtitle="Track assigned work, submit links, and respond to revision notes without leaving mobile."
            actionLabel={bountyTasks.length ? 'Refresh' : null}
            onActionPress={() => hydrateTasks(true)}
          />

          {bountyTasks.length ? (
            bountyTasks.map((task) => (
              <BountyTaskCard
                key={task._id}
                task={task}
                submissionDraft={submissionDrafts[task._id] || ''}
                expanded={expandedBountyId === task._id}
                submitting={submittingBountyId === task._id}
                onToggle={() =>
                  setExpandedBountyId((current) =>
                    current === task._id ? null : task._id
                  )
                }
                onDraftChange={(value) => updateSubmissionDraft(task._id, value)}
                onSubmit={() => handleSubmitBounty(task)}
                onOpenLink={() => handleOpenLink(task.submissionLink)}
              />
            ))
          ) : (
            <EmptyState
              icon="briefcase-outline"
              title="No bounty projects yet"
              body="Assigned bounty work will show up here with submission and revision states."
              actionLabel="Refresh projects"
              onActionPress={() => hydrateTasks(true)}
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
    top: -48,
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
    color: 'rgba(255,255,255,0.75)',
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
  taskCard: {
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.lg,
    gap: SIZES.md,
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  taskCardCopy: {
    flex: 1,
    gap: 4,
  },
  taskHeaderBadges: {
    alignItems: 'flex-end',
    gap: SIZES.xs,
  },
  cardEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  metaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  metaPill: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: SIZES.radiusPill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaPillText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  textAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  textActionPressed: {
    opacity: 0.72,
  },
  textActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ghostButtonPressed: {
    opacity: 0.84,
  },
  ghostButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  expandedPanel: {
    gap: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  selectorWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  selectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: SIZES.radiusPill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectorChipPressed: {
    opacity: 0.82,
  },
  selectorChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  notesInput: {
    minHeight: 120,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
  },
  linkInput: {
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.lg,
    paddingVertical: 14,
    fontSize: 14,
    color: COLORS.text,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    ...SHADOWS.soft,
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  primaryButtonBusy: {
    opacity: 0.82,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
  feedbackCard: {
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.lg,
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  linkPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(78, 123, 255, 0.16)',
    padding: SIZES.lg,
  },
  linkPreviewPressed: {
    opacity: 0.82,
  },
  linkPreviewText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.accent,
    fontWeight: '700',
  },
  amountPill: {
    minWidth: 104,
    borderRadius: 18,
    backgroundColor: COLORS.warningSoft,
    borderWidth: 1,
    borderColor: 'rgba(201, 135, 43, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
    alignItems: 'flex-end',
  },
  amountPillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  amountPillValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
});
