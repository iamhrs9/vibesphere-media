import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { formatDateTime, getInitials } from '../utils/staffWorkspace';

const TICKET_CATEGORY_OPTIONS = [
  {
    value: 'IT Support',
    icon: 'desktop-outline',
    tone: 'accent',
  },
  {
    value: 'HR',
    icon: 'people-outline',
    tone: 'warning',
  },
  {
    value: 'Accounts',
    icon: 'wallet-outline',
    tone: 'primary',
  },
  {
    value: 'General',
    icon: 'help-circle-outline',
    tone: 'neutral',
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

function buildStoredSubject(category, subject) {
  return `[${category}] ${subject.trim()}`;
}

function parseStoredSubject(value) {
  const source = String(value || '').trim();
  const match = source.match(/^\[(.+?)\]\s*/);

  if (!match) {
    return {
      category: 'General',
      cleanSubject: source || 'Support request',
    };
  }

  return {
    category: match[1].trim() || 'General',
    cleanSubject: source.slice(match[0].length).trim() || 'Support request',
  };
}

function formatTicketId(id) {
  const value = String(id || '').trim();

  if (!value) {
    return '#PENDING';
  }

  return `#${value.slice(-6).toUpperCase()}`;
}

function getCategoryMeta(category) {
  const match = TICKET_CATEGORY_OPTIONS.find((option) => option.value === category);

  return (
    match || {
      value: category || 'General',
      icon: 'help-circle-outline',
      tone: 'neutral',
    }
  );
}

function getTicketStatusMeta(status) {
  switch (String(status || '').trim()) {
    case 'Resolved':
      return {
        label: 'Resolved',
        icon: 'checkmark-circle-outline',
        tone: 'success',
      };
    case 'In Progress':
      return {
        label: 'In Progress',
        icon: 'time-outline',
        tone: 'warning',
      };
    case 'Pending':
      return {
        label: 'Pending',
        icon: 'alert-circle-outline',
        tone: 'danger',
      };
    default:
      return {
        label: 'Open',
        icon: 'alert-circle-outline',
        tone: 'danger',
      };
  }
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

function CategoryField({ label, selectedLabel, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectorField,
        pressed && styles.selectorFieldPressed,
      ]}
    >
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.selectorValueRow}>
        <Text style={styles.selectorValue}>{selectedLabel}</Text>
        <Ionicons name="chevron-down-outline" size={18} color={COLORS.textSecondary} />
      </View>
    </Pressable>
  );
}

function TicketCard({ ticket }) {
  const statusMeta = getTicketStatusMeta(ticket.status);
  const categoryMeta = getCategoryMeta(ticket.category);

  return (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <View style={styles.ticketHeaderCopy}>
          <Text style={styles.ticketId}>{ticket.ticketIdLabel}</Text>
          <Text style={styles.ticketSubject}>{ticket.cleanSubject}</Text>
          <Text style={styles.ticketDate}>{formatDateTime(ticket.date)}</Text>
        </View>

        <ToneBadge
          icon={statusMeta.icon}
          label={statusMeta.label}
          tone={statusMeta.tone}
        />
      </View>

      <View style={styles.ticketMetaRow}>
        <ToneBadge
          icon={categoryMeta.icon}
          label={ticket.category}
          tone={categoryMeta.tone}
        />
        <ToneBadge
          icon="chatbubble-ellipses-outline"
          label={`${ticket.replyCount} repl${ticket.replyCount === 1 ? 'y' : 'ies'}`}
          tone="neutral"
        />
      </View>

      <Text style={styles.ticketIssue}>{ticket.issue || 'No issue details provided.'}</Text>

      {ticket.latestReply ? (
        <View style={styles.replyCard}>
          <Text style={styles.replyLabel}>
            Latest update from {ticket.latestReply.sender || 'Support'}
          </Text>
          <Text style={styles.replyMessage}>{ticket.latestReply.message}</Text>
        </View>
      ) : null}
    </View>
  );
}

function EmptyState({ onRefresh }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="headset-outline" size={24} color={COLORS.accent} />
      </View>
      <Text style={styles.emptyStateTitle}>No tickets yet</Text>
      <Text style={styles.emptyStateBody}>
        Raise your first ticket and your support history will start appearing here.
      </Text>
      <Pressable
        onPress={onRefresh}
        style={({ pressed }) => [
          styles.emptyStateAction,
          pressed && styles.emptyStateActionPressed,
        ]}
      >
        <Text style={styles.emptyStateActionText}>Refresh tickets</Text>
      </Pressable>
    </View>
  );
}

export default function HelpdeskScreen({ navigation }) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [profile, setProfile] = useState(auth?.profile || null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [form, setForm] = useState({
    category: TICKET_CATEGORY_OPTIONS[0].value,
    subject: '',
    issue: '',
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

    hydrateTickets();
  }, [isFocused, auth?.profile?.email]);

  const ticketItems = useMemo(
    () =>
      tickets.map((ticket) => {
        const parsed = parseStoredSubject(ticket.subject);
        const replies = Array.isArray(ticket.replies) ? ticket.replies : [];

        return {
          ...ticket,
          category: parsed.category,
          cleanSubject: parsed.cleanSubject,
          ticketIdLabel: formatTicketId(ticket._id),
          replyCount: replies.length,
          latestReply: replies.length ? replies[replies.length - 1] : null,
        };
      }),
    [tickets]
  );

  const summary = useMemo(
    () =>
      ticketItems.reduce(
        (accumulator, ticket) => {
          accumulator.total += 1;

          if (ticket.status === 'Resolved') {
            accumulator.resolved += 1;
          } else if (ticket.status === 'In Progress') {
            accumulator.inProgress += 1;
          } else {
            accumulator.open += 1;
          }

          return accumulator;
        },
        {
          total: 0,
          open: 0,
          inProgress: 0,
          resolved: 0,
        }
      ),
    [ticketItems]
  );

  async function hydrateTickets(isPullToRefresh = false) {
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
          console.error('Helpdesk profile refresh failed.', error?.message || error);
        }
      }

      if (!activeProfile?.email) {
        setTickets([]);
        return;
      }

      const response = await apiClient.get('staff-helpdesk/my-tickets', {
        params: { email: activeProfile.email },
      });

      setTickets(response.data?.success ? response.data.tickets || [] : []);
    } catch (error) {
      if (!isPullToRefresh) {
        Alert.alert(
          'Could not load tickets',
          getApiErrorMessage(error, 'Please try again in a moment.')
        );
      }
      setTickets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleSubmitTicket() {
    const subject = form.subject.trim();
    const issue = form.issue.trim();

    if (!profile?.email || !profile?.name) {
      Alert.alert('Profile missing', 'Please sign in again before submitting a ticket.');
      return;
    }

    if (!subject) {
      Alert.alert('Subject required', 'Add a short subject for your support request.');
      return;
    }

    if (!issue) {
      Alert.alert('Issue required', 'Describe the issue so the support team can help properly.');
      return;
    }

    if (issue.length < 12) {
      Alert.alert(
        'More detail needed',
        'Please share a slightly more detailed issue description.'
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiClient.post('staff-helpdesk/create', {
        email: profile.email,
        name: profile.name,
        category: form.category,
        subject: buildStoredSubject(form.category, subject),
        issue,
      });
      const payload = response.data || {};

      if (!payload.success) {
        throw new Error(payload.message || 'Ticket creation failed.');
      }

      Alert.alert(
        'Ticket submitted',
        payload.message || 'Your helpdesk request has been created.'
      );

      setForm((current) => ({
        ...current,
        subject: '',
        issue: '',
      }));

      await hydrateTickets(true);
    } catch (error) {
      Alert.alert(
        'Submission failed',
        getApiErrorMessage(error, 'Unable to submit your ticket right now.')
      );
    } finally {
      setSubmitting(false);
    }
  }

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
          <Text style={styles.topBarTitle}>Helpdesk</Text>
          <Text style={styles.topBarSubtitle}>
            Raise support tickets and track every resolution in one place
          </Text>
        </View>

        <HeaderButton
          icon="refresh-outline"
          onPress={() => hydrateTickets(true)}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 44 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => hydrateTickets(true)}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <ToneBadge
              icon="headset-outline"
              label="Support Desk"
              tone="accent"
            />

            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>
                {getInitials(profile?.name)}
              </Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Raise a New Ticket</Text>
          <Text style={styles.heroBody}>
            Log internal support issues with a clean mobile form and keep your ticket history visible below.
          </Text>

          <View style={styles.summaryGrid}>
            <SummaryTile
              icon="alert-circle-outline"
              label="Open"
              value={summary.open}
              hint="Awaiting action"
              tone={summary.open ? 'danger' : 'neutral'}
            />
            <SummaryTile
              icon="time-outline"
              label="In Progress"
              value={summary.inProgress}
              hint="Being handled"
              tone={summary.inProgress ? 'warning' : 'neutral'}
            />
            <SummaryTile
              icon="checkmark-circle-outline"
              label="Resolved"
              value={summary.resolved}
              hint={`${summary.total} total tickets`}
              tone={summary.resolved ? 'success' : 'neutral'}
            />
          </View>

          <View style={styles.formShell}>
            <CategoryField
              label="Category"
              selectedLabel={form.category}
              onPress={() => setShowCategoryModal(true)}
            />

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Subject</Text>
              <TextInput
                style={styles.input}
                value={form.subject}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    subject: value,
                  }))
                }
                placeholder="Briefly describe the request"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Issue Description</Text>
              <TextInput
                style={styles.textArea}
                multiline
                value={form.issue}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    issue: value,
                  }))
                }
                placeholder="Explain what happened, what you expected, and any urgent context"
                placeholderTextColor={COLORS.textTertiary}
                textAlignVertical="top"
              />
            </View>

            <Pressable
              onPress={handleSubmitTicket}
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
                  <Text style={styles.submitButtonText}>Submit Ticket</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {loading && !ticketItems.length ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading your helpdesk tickets...</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <SectionHeader
            icon="receipt-outline"
            title="My Tickets"
            subtitle="Your ticket history with status badges, subject lines, and latest support updates."
          />

          {ticketItems.length ? (
            ticketItems.map((ticket) => (
              <TicketCard
                key={ticket._id || `${ticket.subject}-${ticket.date}`}
                ticket={ticket}
              />
            ))
          ) : (
            <EmptyState onRefresh={() => hydrateTickets(true)} />
          )}
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={showCategoryModal}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowCategoryModal(false)}
          />

          <View
            style={[
              styles.modalCard,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Category</Text>
            <Text style={styles.modalSubtitle}>
              Choose the support area that best matches your issue.
            </Text>

            <View style={styles.modalActionGroup}>
              {TICKET_CATEGORY_OPTIONS.map((option) => {
                const palette = getPalette(option.tone);

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setForm((current) => ({
                        ...current,
                        category: option.value,
                      }));
                      setShowCategoryModal(false);
                    }}
                    style={({ pressed }) => [
                      styles.modalActionButton,
                      pressed && styles.modalActionButtonPressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.modalActionIconWrap,
                        { backgroundColor: palette.background },
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={palette.text}
                      />
                    </View>
                    <Text style={styles.modalActionLabel}>{option.value}</Text>
                    <Ionicons
                      name={
                        form.category === option.value
                          ? 'checkmark-circle'
                          : 'chevron-forward'
                      }
                      size={18}
                      color={
                        form.category === option.value
                          ? COLORS.accent
                          : COLORS.textTertiary
                      }
                    />
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setShowCategoryModal(false)}
              style={({ pressed }) => [
                styles.modalCancelButton,
                pressed && styles.modalCancelButtonPressed,
              ]}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    top: -48,
    right: -28,
    width: 182,
    height: 182,
  },
  backgroundOrbBottom: {
    bottom: 84,
    left: -54,
    width: 160,
    height: 160,
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
  selectorField: {
    borderRadius: 22,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    gap: SIZES.sm,
  },
  selectorFieldPressed: {
    opacity: 0.82,
  },
  selectorValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  selectorValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  input: {
    borderRadius: 22,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    fontSize: 15,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 126,
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
  ticketCard: {
    borderRadius: 24,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.lg,
    gap: SIZES.md,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  ticketHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  ticketId: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  ticketSubject: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  ticketDate: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  ticketMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  ticketIssue: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },
  replyCard: {
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.md,
    gap: 4,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  replyMessage: {
    fontSize: 13,
    lineHeight: 19,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10, 18, 32, 0.34)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.xl,
    paddingTop: SIZES.md,
  },
  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 5,
    backgroundColor: COLORS.borderStrong,
    alignSelf: 'center',
    marginBottom: SIZES.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    marginTop: SIZES.xs,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  modalActionGroup: {
    marginTop: SIZES.xl,
    gap: SIZES.sm,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.lg,
    paddingVertical: 16,
  },
  modalActionButtonPressed: {
    opacity: 0.82,
  },
  modalActionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalCancelButton: {
    marginTop: SIZES.lg,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonPressed: {
    opacity: 0.82,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
});
