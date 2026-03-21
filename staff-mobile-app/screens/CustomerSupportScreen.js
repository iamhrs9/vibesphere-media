import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import apiClient from '../api/client';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, getInitials } from '../utils/staffWorkspace';

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
        label: 'Waiting on User',
        icon: 'time-outline',
        tone: 'warning',
      };
    default:
      return {
        label: 'Action Required',
        icon: 'alert-circle-outline',
        tone: 'danger',
      };
  }
}

function formatTicketId(value) {
  const id = String(value || '').trim();

  if (!id) {
    return '#PENDING';
  }

  return `#${id.slice(-6).toUpperCase()}`;
}

function getLatestTicketActivity(ticket) {
  const replies = Array.isArray(ticket?.replies) ? ticket.replies : [];

  if (replies.length) {
    return replies[replies.length - 1].date || ticket.date;
  }

  return ticket?.date;
}

function isToday(value) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
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

function TicketInboxCard({ ticket, onPress }) {
  const statusMeta = getTicketStatusMeta(ticket.status);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ticketCard,
        pressed && styles.ticketCardPressed,
      ]}
    >
      <View style={styles.ticketHeader}>
        <View style={styles.ticketHeaderCopy}>
          <Text style={styles.ticketCustomer}>{ticket.clientName || 'Customer'}</Text>
          <Text style={styles.ticketSubject}>{ticket.subject || 'Customer query'}</Text>
          <Text style={styles.ticketTime}>{formatDateTime(ticket.date)}</Text>
        </View>

        <ToneBadge
          icon={statusMeta.icon}
          label={statusMeta.label}
          tone={statusMeta.tone}
        />
      </View>

      <Text style={styles.ticketSnippet} numberOfLines={2}>
        {ticket.issue || 'No issue description provided.'}
      </Text>

      <View style={styles.ticketFooter}>
        <Text style={styles.ticketMeta}>{formatTicketId(ticket._id)}</Text>
        <Text style={styles.ticketMeta}>{ticket.clientEmail || 'Customer email'}</Text>
      </View>
    </Pressable>
  );
}

function EmptyState({ onRefresh }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="people-circle-outline" size={24} color={COLORS.accent} />
      </View>
      <Text style={styles.emptyStateTitle}>No customer tickets right now</Text>
      <Text style={styles.emptyStateBody}>
        New customer issues from the app will appear here as soon as they come in.
      </Text>
      <Pressable
        onPress={onRefresh}
        style={({ pressed }) => [
          styles.emptyStateAction,
          pressed && styles.emptyStateActionPressed,
        ]}
      >
        <Text style={styles.emptyStateActionText}>Refresh inbox</Text>
      </Pressable>
    </View>
  );
}

function ReplyBubble({ reply }) {
  return (
    <View style={styles.replyBubble}>
      <Text style={styles.replySender}>{reply.sender || 'Support'}</Text>
      <Text style={styles.replyBody}>{reply.message || 'No reply body.'}</Text>
      <Text style={styles.replyTime}>{formatDateTime(reply.date)}</Text>
    </View>
  );
}

export default function CustomerSupportScreen({ navigation }) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [profile, setProfile] = useState(auth?.profile || null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [replyDraft, setReplyDraft] = useState('');
  const [actingAction, setActingAction] = useState('');

  useEffect(() => {
    if (auth?.profile) {
      setProfile(auth.profile);
    }
  }, [auth?.profile]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    hydrateCustomerTickets();
  }, [isFocused, auth?.profile?.email]);

  const ticketItems = useMemo(
    () =>
      tickets.map((ticket) => ({
        ...ticket,
        replies: Array.isArray(ticket.replies) ? ticket.replies : [],
        ticketIdLabel: formatTicketId(ticket._id),
      })),
    [tickets]
  );

  const selectedTicket = useMemo(
    () => ticketItems.find((ticket) => ticket._id === selectedTicketId) || null,
    [ticketItems, selectedTicketId]
  );

  const summary = useMemo(
    () =>
      ticketItems.reduce(
        (accumulator, ticket) => {
          accumulator.total += 1;

          if (ticket.status === 'Resolved') {
            if (isToday(getLatestTicketActivity(ticket))) {
              accumulator.resolvedToday += 1;
            }
          } else if (ticket.status === 'In Progress') {
            accumulator.waitingOnUser += 1;
          } else {
            accumulator.open += 1;
          }

          return accumulator;
        },
        {
          total: 0,
          open: 0,
          waitingOnUser: 0,
          resolvedToday: 0,
        }
      ),
    [ticketItems]
  );

  async function hydrateCustomerTickets(isPullToRefresh = false) {
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
            'Customer support profile refresh failed.',
            error?.message || error
          );
        }
      }

      const response = await apiClient.get('staff/customer-support/tickets');

      setTickets(response.data?.success ? response.data.tickets || [] : []);
    } catch (error) {
      if (!isPullToRefresh) {
        Alert.alert(
          'Could not load customer tickets',
          getApiErrorMessage(error, 'Please try again in a moment.')
        );
      }
      setTickets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function openTicket(ticket) {
    setSelectedTicketId(ticket._id || '');
    setReplyDraft('');
  }

  function closeTicketModal() {
    setSelectedTicketId('');
    setReplyDraft('');
    setActingAction('');
  }

  function updateTicketInState(updatedTicket) {
    if (!updatedTicket?._id) {
      return;
    }

    setTickets((current) =>
      current.map((ticket) =>
        ticket._id === updatedTicket._id ? updatedTicket : ticket
      )
    );
  }

  async function handleSendReply() {
    if (!selectedTicket?._id) {
      return;
    }

    const reply = replyDraft.trim();

    if (!reply) {
      Alert.alert('Reply required', 'Type a reply before sending it to the customer.');
      return;
    }

    setActingAction('reply');

    try {
      const response = await apiClient.post('staff/customer-support/reply', {
        ticketId: selectedTicket._id,
        reply,
        status: 'In Progress',
      });
      const payload = response.data || {};

      if (!payload.success || !payload.ticket) {
        throw new Error(payload.message || 'Reply could not be sent.');
      }

      updateTicketInState(payload.ticket);
      setReplyDraft('');
    } catch (error) {
      Alert.alert(
        'Reply failed',
        getApiErrorMessage(error, 'Unable to send your reply right now.')
      );
    } finally {
      setActingAction('');
    }
  }

  async function handleResolveTicket() {
    if (!selectedTicket?._id) {
      return;
    }

    setActingAction('resolve');

    try {
      const response = await apiClient.post('staff/customer-support/reply', {
        ticketId: selectedTicket._id,
        reply: replyDraft.trim() || undefined,
        status: 'Resolved',
      });
      const payload = response.data || {};

      if (!payload.success || !payload.ticket) {
        throw new Error(payload.message || 'Ticket could not be resolved.');
      }

      updateTicketInState(payload.ticket);
      closeTicketModal();
    } catch (error) {
      Alert.alert(
        'Resolve failed',
        getApiErrorMessage(error, 'Unable to resolve this ticket right now.')
      );
      setActingAction('');
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
          <Text style={styles.topBarTitle}>Customer Support</Text>
          <Text style={styles.topBarSubtitle}>
            CRM inbox for customer questions, replies, and fast ticket resolution
          </Text>
        </View>

        <HeaderButton
          icon="refresh-outline"
          onPress={() => hydrateCustomerTickets(true)}
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
            onRefresh={() => hydrateCustomerTickets(true)}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <ToneBadge
              icon="people-circle-outline"
              label="CRM Inbox"
              tone="accent"
            />

            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>
                {getInitials(profile?.name)}
              </Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Customer Support 🎧</Text>
          <Text style={styles.heroBody}>
            Keep every incoming customer issue visible, reply from one focused inbox, and close tickets without the web-table feel.
          </Text>

          <View style={styles.summaryGrid}>
            <SummaryTile
              icon="alert-circle-outline"
              label="Open User Tickets"
              value={summary.open}
              hint="Needs staff action"
              tone={summary.open ? 'danger' : 'neutral'}
            />
            <SummaryTile
              icon="time-outline"
              label="Waiting on User"
              value={summary.waitingOnUser}
              hint="Reply already sent"
              tone={summary.waitingOnUser ? 'warning' : 'neutral'}
            />
            <SummaryTile
              icon="checkmark-circle-outline"
              label="Resolved Today"
              value={summary.resolvedToday}
              hint={`${summary.total} tickets in inbox`}
              tone={summary.resolvedToday ? 'success' : 'neutral'}
            />
          </View>
        </View>

        {loading && !ticketItems.length ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading customer support inbox...</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <SectionHeader
            icon="mail-open-outline"
            title="Ticket Inbox"
            subtitle="Tap any ticket to open the full customer query, send a reply, or mark it as resolved."
          />

          {ticketItems.length ? (
            ticketItems.map((ticket) => (
              <TicketInboxCard
                key={ticket._id || `${ticket.subject}-${ticket.date}`}
                ticket={ticket}
                onPress={() => openTicket(ticket)}
              />
            ))
          ) : (
            <EmptyState onRefresh={() => hydrateCustomerTickets(true)} />
          )}
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={Boolean(selectedTicket)}
        onRequestClose={closeTicketModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeTicketModal} />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          >
            <View
              style={[
                styles.modalCard,
                { paddingBottom: Math.max(insets.bottom, 18) },
              ]}
            >
              <View style={styles.modalHandle} />

              {selectedTicket ? (
                <>
                  <View style={styles.modalHeader}>
                    <View style={styles.modalHeaderCopy}>
                      <Text style={styles.modalTitle}>
                        {selectedTicket.subject || 'Customer query'}
                      </Text>
                      <Text style={styles.modalSubtitle}>
                        {selectedTicket.clientName || 'Customer'} · {selectedTicket.ticketIdLabel}
                      </Text>
                    </View>

                    <ToneBadge
                      icon={getTicketStatusMeta(selectedTicket.status).icon}
                      label={getTicketStatusMeta(selectedTicket.status).label}
                      tone={getTicketStatusMeta(selectedTicket.status).tone}
                    />
                  </View>

                  <View style={styles.ticketInfoCard}>
                    <View style={styles.ticketInfoRow}>
                      <Text style={styles.ticketInfoLabel}>Customer</Text>
                      <Text style={styles.ticketInfoValue}>
                        {selectedTicket.clientName || 'Customer'}
                      </Text>
                    </View>
                    <View style={styles.ticketInfoRow}>
                      <Text style={styles.ticketInfoLabel}>Email</Text>
                      <Text style={styles.ticketInfoValue}>
                        {selectedTicket.clientEmail || 'Email unavailable'}
                      </Text>
                    </View>
                    <View style={styles.ticketInfoRow}>
                      <Text style={styles.ticketInfoLabel}>Created</Text>
                      <Text style={styles.ticketInfoValue}>
                        {formatDateTime(selectedTicket.date)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.queryCard}>
                    <Text style={styles.queryLabel}>Customer Query</Text>
                    <Text style={styles.queryBody}>
                      {selectedTicket.issue || 'No issue description provided.'}
                    </Text>
                  </View>

                  {selectedTicket.replies.length ? (
                    <View style={styles.threadSection}>
                      <Text style={styles.threadTitle}>Reply History</Text>
                      {selectedTicket.replies.map((reply, index) => (
                        <ReplyBubble
                          key={`${reply.date || index}-${reply.sender || 'support'}`}
                          reply={reply}
                        />
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.replyComposer}>
                    <Text style={styles.replyComposerLabel}>Reply to customer</Text>
                    <TextInput
                      style={styles.replyInput}
                      multiline
                      value={replyDraft}
                      onChangeText={setReplyDraft}
                      placeholder="Type a clear, helpful reply for the customer"
                      placeholderTextColor={COLORS.textTertiary}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.modalActionRow}>
                    <Pressable
                      onPress={handleSendReply}
                      disabled={actingAction === 'reply' || actingAction === 'resolve'}
                      style={({ pressed }) => [
                        styles.secondaryAction,
                        pressed &&
                          actingAction !== 'reply' &&
                          actingAction !== 'resolve' &&
                          styles.secondaryActionPressed,
                      ]}
                    >
                      {actingAction === 'reply' ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <>
                          <Ionicons name="paper-plane-outline" size={17} color={COLORS.primary} />
                          <Text style={styles.secondaryActionText}>Send Reply</Text>
                        </>
                      )}
                    </Pressable>

                    <Pressable
                      onPress={handleResolveTicket}
                      disabled={actingAction === 'reply' || actingAction === 'resolve'}
                      style={({ pressed }) => [
                        styles.primaryAction,
                        pressed &&
                          actingAction !== 'reply' &&
                          actingAction !== 'resolve' &&
                          styles.primaryActionPressed,
                      ]}
                    >
                      {actingAction === 'resolve' ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={17}
                            color={COLORS.white}
                          />
                          <Text style={styles.primaryActionText}>Mark as Resolved</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </>
              ) : null}
            </View>
          </KeyboardAvoidingView>
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
    top: -50,
    right: -28,
    width: 182,
    height: 182,
  },
  backgroundOrbBottom: {
    bottom: 84,
    left: -52,
    width: 158,
    height: 158,
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
  ticketCardPressed: {
    opacity: 0.84,
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
  ticketCustomer: {
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
  ticketTime: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  ticketSnippet: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  ticketMeta: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textTertiary,
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
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.xl,
    paddingTop: SIZES.md,
    maxHeight: '88%',
  },
  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 5,
    backgroundColor: COLORS.borderStrong,
    alignSelf: 'center',
    marginBottom: SIZES.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SIZES.md,
    marginBottom: SIZES.lg,
  },
  modalHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  ticketInfoCard: {
    borderRadius: 20,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.lg,
    gap: SIZES.sm,
  },
  ticketInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  ticketInfoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  ticketInfoValue: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.text,
    textAlign: 'right',
  },
  queryCard: {
    marginTop: SIZES.lg,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(22, 35, 59, 0.08)',
    padding: SIZES.lg,
    gap: SIZES.sm,
  },
  queryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  queryBody: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.text,
  },
  threadSection: {
    marginTop: SIZES.lg,
    gap: SIZES.sm,
  },
  threadTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  replyBubble: {
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.md,
    gap: 4,
  },
  replySender: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  replyBody: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  replyTime: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  replyComposer: {
    marginTop: SIZES.lg,
    gap: SIZES.sm,
  },
  replyComposerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  replyInput: {
    minHeight: 118,
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
  modalActionRow: {
    flexDirection: 'row',
    gap: SIZES.md,
    marginTop: SIZES.lg,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 54,
    borderRadius: 20,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(78, 123, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  secondaryActionPressed: {
    opacity: 0.82,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  primaryAction: {
    flex: 1,
    minHeight: 54,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  primaryActionPressed: {
    opacity: 0.86,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
});
