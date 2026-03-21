import React, { useEffect, useMemo, useState } from 'react';
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
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import apiClient, { getStoredToken } from '../api/client';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, getInitials } from '../utils/staffWorkspace';

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
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

function getPayoutStatusMeta(status) {
  if (String(status || '').toLowerCase() === 'paid') {
    return {
      label: 'Paid',
      icon: 'checkmark-circle-outline',
      tone: 'success',
    };
  }

  return {
    label: 'Pending',
    icon: 'time-outline',
    tone: 'warning',
  };
}

function maskAccountNumber(value) {
  const digits = String(value || '').replace(/\s+/g, '');

  if (!digits) {
    return 'Account not available';
  }

  if (digits.length <= 4) {
    return digits;
  }

  return `•••• ${digits.slice(-4)}`;
}

function getTransferDetails(payout) {
  if (payout?.paymentMethod === 'UPI') {
    return {
      label: 'UPI',
      icon: 'phone-portrait-outline',
      primary: payout?.paymentDetails?.upiId || 'UPI ID unavailable',
      secondary: 'Fast transfer route',
    };
  }

  return {
    label: 'Bank',
    icon: 'business-outline',
    primary: maskAccountNumber(
      payout?.paymentDetails?.accNo || payout?.paymentDetails?.accountNumber
    ),
    secondary: payout?.paymentDetails?.ifsc || payout?.paymentDetails?.ifscCode || '',
  };
}

function getMonthYearFromDate(value) {
  const date = value ? new Date(value) : new Date();
  return {
    month: String(date.getMonth() + 1).padStart(2, '0'),
    year: String(date.getFullYear()),
    label: `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`,
  };
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

function PayoutRecordCard({
  payout,
  downloading,
  onDownload,
}) {
  const statusMeta = getPayoutStatusMeta(payout.status);
  const transfer = getTransferDetails(payout);
  const payoutMonth = getMonthYearFromDate(payout.date).label;

  return (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.recordTitleWrap}>
          <Text style={styles.recordEyebrow}>Withdrawal request</Text>
          <Text style={styles.recordAmount}>{formatCurrency(payout.amount)}</Text>
          <Text style={styles.recordSubtitle}>
            Requested on {formatDate(payout.date)}
          </Text>
        </View>

        <ToneBadge
          icon={statusMeta.icon}
          label={statusMeta.label}
          tone={statusMeta.tone}
        />
      </View>

      <View style={styles.transferCard}>
        <View style={styles.transferIconWrap}>
          <Ionicons name={transfer.icon} size={18} color={COLORS.primary} />
        </View>

        <View style={styles.transferCopy}>
          <Text style={styles.transferLabel}>{transfer.label} transfer</Text>
          <Text style={styles.transferPrimary}>{transfer.primary}</Text>
          <Text style={styles.transferSecondary}>
            {transfer.secondary || payoutMonth}
          </Text>
        </View>
      </View>

      <View style={styles.recordFooter}>
        <Text style={styles.recordMonthCopy}>Slip period: {payoutMonth}</Text>

        <Pressable
          onPress={onDownload}
          disabled={downloading}
          style={({ pressed }) => [
            styles.downloadButton,
            pressed && !downloading && styles.downloadButtonPressed,
            downloading && styles.downloadButtonBusy,
          ]}
        >
          {downloading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <>
              <Ionicons name="download-outline" size={16} color={COLORS.primary} />
              <Text style={styles.downloadButtonText}>Download Payslip</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function LedgerCard({ row }) {
  return (
    <View style={styles.ledgerCard}>
      <View style={styles.ledgerRowTop}>
        <View style={styles.ledgerCopy}>
          <Text style={styles.ledgerTitle}>{row.taskName || 'Credited item'}</Text>
          <Text style={styles.ledgerSubtitle}>
            {row.referenceId || row.source || 'Ledger'}
          </Text>
        </View>

        <Text style={styles.ledgerAmount}>{formatCurrency(row.amount)}</Text>
      </View>

      <View style={styles.ledgerRowBottom}>
        <Text style={styles.ledgerDate}>{row.dateLabel || formatDate(row.date)}</Text>
        <ToneBadge
          icon="checkmark-circle-outline"
          label={row.status || 'Credited'}
          tone="success"
        />
      </View>
    </View>
  );
}

export default function PayoutScreen({ navigation }) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [profile, setProfile] = useState(auth?.profile || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [downloadingPayoutId, setDownloadingPayoutId] = useState('');
  const [showWithdrawComposer, setShowWithdrawComposer] = useState(false);
  const [stats, setStats] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [ledger, setLedger] = useState({
    monthLabel: '',
    totalAmount: 0,
    totalItems: 0,
    rows: [],
  });
  const [requestForm, setRequestForm] = useState({
    amount: '',
    paymentMethod: 'UPI',
    upiId: '',
    accName: '',
    accNo: '',
    ifsc: '',
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

    hydrateWallet();
  }, [isFocused, auth?.profile?.email]);

  const walletBalance = Number(stats?.pendingPayout || 0);
  const paidOutTotal = useMemo(
    () =>
      payouts
        .filter((item) => String(item.status || '').toLowerCase() === 'paid')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [payouts]
  );
  const pendingRequests = payouts.filter(
    (item) => String(item.status || '').toLowerCase() !== 'paid'
  ).length;

  useEffect(() => {
    setRequestForm((current) => ({
      ...current,
      amount: walletBalance > 0 ? String(Math.round(walletBalance)) : '',
    }));
  }, [walletBalance]);

  async function hydrateWallet(isPullToRefresh = false) {
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
          console.error('Payout screen profile refresh failed.', error?.message || error);
        }
      }

      if (!activeProfile?.email) {
        setStats(null);
        setPayouts([]);
        setLedger({
          monthLabel: '',
          totalAmount: 0,
          totalItems: 0,
          rows: [],
        });
        return;
      }

      const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
      const currentYear = String(new Date().getFullYear());
      const monthLabel = `${MONTH_LABELS[new Date().getMonth()]} ${currentYear}`;

      const [statsResult, payoutsResult, ledgerResult] = await Promise.allSettled([
        apiClient.post('staff/stats', { email: activeProfile.email }),
        apiClient.post('staff/my-payouts', { email: activeProfile.email }),
        apiClient.get('staff/earnings-ledger', {
          params: {
            month: currentMonth,
            year: currentYear,
          },
        }),
      ]);

      setStats(
        statsResult.status === 'fulfilled' && statsResult.value.data?.success
          ? statsResult.value.data
          : null
      );
      setPayouts(
        payoutsResult.status === 'fulfilled' && payoutsResult.value.data?.success
          ? payoutsResult.value.data.payouts || []
          : []
      );
      setLedger(
        ledgerResult.status === 'fulfilled' && ledgerResult.value.data?.success
          ? {
              monthLabel,
              totalAmount: Number(ledgerResult.value.data.totalAmount || 0),
              totalItems: Number(ledgerResult.value.data.totalItems || 0),
              rows: ledgerResult.value.data.rows || [],
            }
          : {
              monthLabel,
              totalAmount: 0,
              totalItems: 0,
              rows: [],
            }
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleSubmitRequest() {
    const amount = Number(requestForm.amount || 0);
    const method = requestForm.paymentMethod;
    const email = profile?.email;

    if (!email) {
      Alert.alert('Profile missing', 'Please sign in again before requesting a payout.');
      return;
    }

    if (!amount || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a withdrawal amount greater than zero.');
      return;
    }

    if (amount > walletBalance) {
      Alert.alert('Amount too high', 'Withdrawal amount cannot exceed your current wallet balance.');
      return;
    }

    let paymentDetails = {};

    if (method === 'UPI') {
      if (!requestForm.upiId.trim()) {
        Alert.alert('UPI required', 'Enter your UPI ID before submitting.');
        return;
      }

      paymentDetails = { upiId: requestForm.upiId.trim() };
    } else {
      if (
        !requestForm.accName.trim() ||
        !requestForm.accNo.trim() ||
        !requestForm.ifsc.trim()
      ) {
        Alert.alert('Bank details required', 'Fill in all bank transfer details.');
        return;
      }

      paymentDetails = {
        accName: requestForm.accName.trim(),
        accNo: requestForm.accNo.trim(),
        ifsc: requestForm.ifsc.trim().toUpperCase(),
      };
    }

    setSubmittingRequest(true);

    try {
      const response = await apiClient.post('staff/request-payout', {
        email,
        amount,
        paymentMethod: method,
        paymentDetails,
      });
      const payload = response.data || {};

      if (!payload.success) {
        throw new Error(payload.message || payload.error || 'Unable to request payout.');
      }

      Alert.alert(
        'Request sent',
        payload.message || 'Your withdrawal request has been submitted.'
      );
      setShowWithdrawComposer(false);
      await hydrateWallet(true);
    } catch (error) {
      Alert.alert(
        'Request failed',
        getApiErrorMessage(error, 'We could not submit your withdrawal request.')
      );
    } finally {
      setSubmittingRequest(false);
    }
  }

  async function handleDownloadPayslip(payout) {
    const token = await getStoredToken();

    if (!token) {
      Alert.alert('Session missing', 'Please sign in again before downloading a payslip.');
      return;
    }

    const { month, year, label } = getMonthYearFromDate(payout.date);
    const baseUrl = String(apiClient.defaults.baseURL || '');
    const downloadUrl = `${baseUrl}staff/download-payslip?month=${month}&year=${year}`;
    const targetDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;

    if (!targetDir) {
      Alert.alert('Download unavailable', 'File storage is not available on this device.');
      return;
    }

    const fileUri = `${targetDir}payslip_${year}_${month}_${payout._id || Date.now()}.pdf`;
    setDownloadingPayoutId(payout._id || 'download');

    try {
      const result = await FileSystem.downloadAsync(downloadUrl, fileUri, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: `token=${token}`,
        },
      });

      if (result.status < 200 || result.status >= 300) {
        throw new Error('Server rejected the download request.');
      }

      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert(
          'Downloaded',
          `Payslip for ${label} was downloaded to your local app storage.`
        );
        return;
      }

      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: `Share ${label} payslip`,
      });
    } catch (error) {
      Alert.alert(
        'Download failed',
        getApiErrorMessage(error, 'Unable to download this payslip right now.')
      );
    } finally {
      setDownloadingPayoutId('');
    }
  }

  const hasData = payouts.length > 0 || (ledger.rows || []).length > 0;

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
          <Text style={styles.topBarTitle}>Payouts & Wallet</Text>
          <Text style={styles.topBarSubtitle}>
            Wallet balance, withdrawal history, and slip downloads
          </Text>
        </View>

        <HeaderButton
          icon="refresh-outline"
          onPress={() => hydrateWallet(true)}
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
            onRefresh={() => hydrateWallet(true)}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <ToneBadge
              icon="wallet-outline"
              label="Wallet Overview"
              tone="warning"
            />

            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{getInitials(profile?.name)}</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Current Balance</Text>
          <Text style={styles.heroBalance}>{formatCurrency(walletBalance)}</Text>
          <Text style={styles.heroBody}>
            Live pending payout amount available for your next withdrawal request.
          </Text>

          <View style={styles.heroActions}>
            <Pressable
              onPress={() => setShowWithdrawComposer((current) => !current)}
              style={({ pressed }) => [
                styles.heroPrimaryAction,
                pressed && styles.heroPrimaryActionPressed,
              ]}
            >
              <Ionicons name="card-outline" size={18} color={COLORS.primary} />
              <Text style={styles.heroPrimaryActionText}>
                {showWithdrawComposer ? 'Hide request form' : 'Request withdrawal'}
              </Text>
            </Pressable>

            <View style={styles.heroSecondaryPill}>
              <Ionicons name="trending-up-outline" size={16} color={COLORS.white} />
              <Text style={styles.heroSecondaryPillText}>
                {formatCurrency(stats?.currentMonthEarnings || 0)} this month
              </Text>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <SummaryTile
              icon="time-outline"
              label="Pending requests"
              value={pendingRequests}
              hint="Waiting for admin processing"
              tone={pendingRequests ? 'warning' : 'neutral'}
            />
            <SummaryTile
              icon="cash-outline"
              label="Paid out total"
              value={formatCurrency(paidOutTotal)}
              hint="Settled withdrawals"
              tone="success"
            />
            <SummaryTile
              icon="briefcase-outline"
              label="Credited items"
              value={ledger.totalItems}
              hint={ledger.monthLabel || 'Current month'}
              tone="accent"
            />
            <SummaryTile
              icon="sparkles-outline"
              label="Ledger total"
              value={formatCurrency(ledger.totalAmount)}
              hint="Approved earnings"
              tone="primary"
            />
          </View>
        </View>

        {showWithdrawComposer ? (
          <View style={styles.composerCard}>
            <SectionHeader
              icon="arrow-up-outline"
              title="Withdraw funds"
              subtitle="Use the same wallet workflow as the web version, rebuilt for thumb-friendly mobile input."
            />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount to withdraw</Text>
              <TextInput
                value={requestForm.amount}
                onChangeText={(value) =>
                  setRequestForm((current) => ({ ...current, amount: value }))
                }
                keyboardType="numeric"
                style={styles.textInput}
                placeholder="Enter amount"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Transfer method</Text>
              <View style={styles.methodRow}>
                {['UPI', 'Bank'].map((method) => {
                  const active = requestForm.paymentMethod === method;
                  const palette = getPalette(active ? 'accent' : 'neutral');

                  return (
                    <Pressable
                      key={method}
                      onPress={() =>
                        setRequestForm((current) => ({
                          ...current,
                          paymentMethod: method,
                        }))
                      }
                      style={({ pressed }) => [
                        styles.methodChip,
                        active && {
                          backgroundColor: palette.background,
                          borderColor: palette.border,
                        },
                        pressed && !active && styles.methodChipPressed,
                      ]}
                    >
                      <Ionicons
                        name={method === 'UPI' ? 'phone-portrait-outline' : 'business-outline'}
                        size={16}
                        color={active ? palette.text : COLORS.textSecondary}
                      />
                      <Text
                        style={[
                          styles.methodChipText,
                          active && { color: palette.text },
                        ]}
                      >
                        {method}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {requestForm.paymentMethod === 'UPI' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>UPI ID</Text>
                <TextInput
                  value={requestForm.upiId}
                  onChangeText={(value) =>
                    setRequestForm((current) => ({ ...current, upiId: value }))
                  }
                  style={styles.textInput}
                  placeholder="example@upi"
                  placeholderTextColor={COLORS.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            ) : (
              <View style={styles.bankFields}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Account holder</Text>
                  <TextInput
                    value={requestForm.accName}
                    onChangeText={(value) =>
                      setRequestForm((current) => ({ ...current, accName: value }))
                    }
                    style={styles.textInput}
                    placeholder="Full name"
                    placeholderTextColor={COLORS.textTertiary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Account number</Text>
                  <TextInput
                    value={requestForm.accNo}
                    onChangeText={(value) =>
                      setRequestForm((current) => ({ ...current, accNo: value }))
                    }
                    keyboardType="number-pad"
                    style={styles.textInput}
                    placeholder="Account number"
                    placeholderTextColor={COLORS.textTertiary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>IFSC code</Text>
                  <TextInput
                    value={requestForm.ifsc}
                    onChangeText={(value) =>
                      setRequestForm((current) => ({ ...current, ifsc: value.toUpperCase() }))
                    }
                    style={styles.textInput}
                    placeholder="IFSC code"
                    placeholderTextColor={COLORS.textTertiary}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>
              </View>
            )}

            <Pressable
              onPress={handleSubmitRequest}
              disabled={submittingRequest}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && !submittingRequest && styles.submitButtonPressed,
                submittingRequest && styles.submitButtonBusy,
              ]}
            >
              {submittingRequest ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={18} color={COLORS.white} />
                  <Text style={styles.submitButtonText}>Send withdrawal request</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}

        {loading && !hasData ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading wallet activity...</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <SectionHeader
            icon="receipt-outline"
            title="Payout history"
            subtitle="Every withdrawal request is shown as a clean card with its own payslip download action."
            actionLabel={payouts.length ? 'Refresh' : null}
            onActionPress={() => hydrateWallet(true)}
          />

          {payouts.length ? (
            payouts.map((payout) => (
              <PayoutRecordCard
                key={payout._id}
                payout={payout}
                downloading={downloadingPayoutId === payout._id}
                onDownload={() => handleDownloadPayslip(payout)}
              />
            ))
          ) : (
            <EmptyState
              icon="wallet-outline"
              title="No payout requests yet"
              body="Once you request a withdrawal, it will appear here with status and downloadable payslip actions."
              actionLabel="Refresh wallet"
              onActionPress={() => hydrateWallet(true)}
            />
          )}
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader
            icon="list-outline"
            title="Credited transactions"
            subtitle="Current month commissions and approved bounty credits are summarized as native list cards."
            actionLabel={ledger.rows.length ? 'Refresh' : null}
            onActionPress={() => hydrateWallet(true)}
          />

          <View style={styles.ledgerSummaryRow}>
            <ToneBadge
              icon="calendar-outline"
              label={ledger.monthLabel || 'This month'}
              tone="neutral"
            />
            <ToneBadge
              icon="cash-outline"
              label={`${ledger.totalItems} items · ${formatCurrency(ledger.totalAmount)}`}
              tone="success"
            />
          </View>

          {ledger.rows.length ? (
            ledger.rows.map((row) => (
              <LedgerCard key={`${row.referenceId || row.taskName}-${row.date}`} row={row} />
            ))
          ) : (
            <EmptyState
              icon="sparkles-outline"
              title="No credited earnings this month"
              body="Approved orders and bounty payouts for the selected month will surface here automatically."
              actionLabel="Refresh credits"
              onActionPress={() => hydrateWallet(true)}
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
    top: -52,
    right: -34,
    width: 184,
    height: 184,
  },
  backgroundOrbBottom: {
    bottom: 72,
    left: -64,
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
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.72)',
  },
  heroBalance: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -1,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.74)',
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  heroPrimaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  heroPrimaryActionPressed: {
    opacity: 0.88,
  },
  heroPrimaryActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  heroSecondaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  heroSecondaryPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
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
  composerCard: {
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.xl,
    gap: SIZES.lg,
    ...SHADOWS.soft,
  },
  inputGroup: {
    gap: SIZES.sm,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  textInput: {
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: SIZES.lg,
    paddingVertical: 14,
    fontSize: 14,
    color: COLORS.text,
  },
  methodRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  methodChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: 14,
  },
  methodChipPressed: {
    opacity: 0.84,
  },
  methodChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  bankFields: {
    gap: SIZES.md,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    ...SHADOWS.soft,
  },
  submitButtonPressed: {
    opacity: 0.88,
  },
  submitButtonBusy: {
    opacity: 0.82,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
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
  recordCard: {
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.lg,
    gap: SIZES.md,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  recordTitleWrap: {
    flex: 1,
    gap: 4,
  },
  recordEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recordAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  recordSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  transferCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.md,
  },
  transferIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  transferCopy: {
    flex: 1,
    gap: 2,
  },
  transferLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  transferPrimary: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  transferSecondary: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  recordFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  recordMonthCopy: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(22, 35, 59, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    minWidth: 158,
  },
  downloadButtonPressed: {
    opacity: 0.84,
  },
  downloadButtonBusy: {
    opacity: 0.8,
  },
  downloadButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  ledgerSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  ledgerCard: {
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.lg,
    gap: SIZES.md,
  },
  ledgerRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  ledgerCopy: {
    flex: 1,
    gap: 4,
  },
  ledgerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  ledgerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  ledgerAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.success,
  },
  ledgerRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SIZES.md,
  },
  ledgerDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
