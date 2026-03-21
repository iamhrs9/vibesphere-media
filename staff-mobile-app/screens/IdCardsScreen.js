import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import apiClient from '../api/client';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/staffWorkspace';
import QRCode from 'react-native-qrcode-svg';

const CARD_PATTERN_ROWS = 8;
const CARD_PATTERN_COLUMNS = 12;

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

function getVerificationUrl(empId) {
  if (!empId) {
    return '';
  }

  return `https://vibespheremedia.in/verify-staff?id=${encodeURIComponent(empId)}`;
}



function formatJoiningDate(value) {
  if (!value) {
    return 'Syncing from staff record';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Syncing from staff record';
  }

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildIdCardExportHtml(profile, verificationUrl) {
  const employeeId = profile?.empId || 'PENDING-ID';
  const joiningDate = formatJoiningDate(profile?.joiningDate);
  const initials = getInitials(profile?.name || 'VibeSphere');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VibeSphere Staff ID Card</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font-family: Arial, sans-serif;
      background: linear-gradient(180deg, #091321 0%, #13233b 55%, #0b1728 100%);
      color: #f8fbff;
    }
    .card {
      width: 100%;
      max-width: 420px;
      padding: 28px;
      border-radius: 34px;
      background: linear-gradient(145deg, #10233d 0%, #182c48 48%, #273446 100%);
      border: 1px solid rgba(255,255,255,0.10);
      box-shadow: 0 32px 70px rgba(0,0,0,0.35);
      position: relative;
      overflow: hidden;
    }
    .card:before,
    .card:after {
      content: '';
      position: absolute;
      border-radius: 999px;
      filter: blur(0px);
    }
    .card:before {
      width: 240px;
      height: 240px;
      right: -90px;
      top: -110px;
      background: rgba(84, 128, 255, 0.22);
    }
    .card:after {
      width: 180px;
      height: 180px;
      left: -70px;
      bottom: -80px;
      background: rgba(255, 255, 255, 0.08);
    }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      z-index: 1;
    }
    .chip {
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.08);
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-align: right;
    }
    .brand-mark {
      width: 42px;
      height: 42px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.10);
      border: 1px solid rgba(255,255,255,0.16);
      font-weight: 800;
    }
    .brand small {
      display: block;
      color: rgba(255,255,255,0.72);
      font-size: 11px;
      letter-spacing: 0.10em;
      text-transform: uppercase;
    }
    .brand strong {
      display: block;
      font-size: 14px;
      margin-top: 2px;
    }
    .avatar-wrap {
      width: 126px;
      height: 126px;
      padding: 6px;
      border-radius: 999px;
      margin: 26px auto 16px;
      background: rgba(255,255,255,0.14);
      border: 1px solid rgba(255,255,255,0.16);
      box-shadow: 0 22px 36px rgba(0,0,0,0.26);
      position: relative;
      z-index: 1;
    }
    .avatar {
      width: 100%;
      height: 100%;
      border-radius: 999px;
      background: radial-gradient(circle at top, #2f4c72 0%, #16263b 70%);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      font-size: 34px;
      font-weight: 800;
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .name {
      margin: 0;
      text-align: center;
      font-size: 28px;
      font-weight: 800;
      position: relative;
      z-index: 1;
    }
    .role {
      margin: 6px 0 18px;
      text-align: center;
      color: rgba(255,255,255,0.72);
      font-size: 15px;
      position: relative;
      z-index: 1;
    }
    .details {
      display: grid;
      gap: 10px;
      position: relative;
      z-index: 1;
    }
    .detail {
      padding: 14px 16px;
      border-radius: 18px;
      background: rgba(255,255,255,0.10);
      border: 1px solid rgba(255,255,255,0.12);
    }
    .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: rgba(255,255,255,0.62);
      margin-bottom: 4px;
    }
    .value {
      font-size: 15px;
      font-weight: 700;
      word-break: break-word;
    }
    .scan {
      margin-top: 20px;
      padding: 18px;
      border-radius: 22px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.10);
      position: relative;
      z-index: 1;
    }
    .scan h3 {
      margin: 0 0 8px;
      font-size: 14px;
    }
    .scan p {
      margin: 0;
      color: rgba(255,255,255,0.70);
      line-height: 1.6;
      font-size: 12px;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="top">
      <div class="chip">Virtual Staff ID</div>
      <div class="brand">
        <div>
          <small>VibeSphere Staff</small>
          <strong>Digital Wallet Pass</strong>
        </div>
        <div class="brand-mark">VS</div>
      </div>
    </div>
    <div class="avatar-wrap">
      <div class="avatar">
        ${
          profile?.profilePhoto
            ? `<img src="${escapeHtml(profile.profilePhoto)}" alt="${escapeHtml(
                profile?.name || 'Staff Member'
              )}">`
            : escapeHtml(initials)
        }
      </div>
    </div>
    <h1 class="name">${escapeHtml(profile?.name || 'Staff Member')}</h1>
    <div class="role">${escapeHtml(profile?.role || 'Sales Executive')}</div>
    <div class="details">
      <div class="detail">
        <div class="label">Employee Name</div>
        <div class="value">${escapeHtml(profile?.name || 'Staff Member')}</div>
      </div>
      <div class="detail">
        <div class="label">Designation</div>
        <div class="value">${escapeHtml(profile?.role || 'Sales Executive')}</div>
      </div>
      <div class="detail">
        <div class="label">Employee ID</div>
        <div class="value">${escapeHtml(employeeId)}</div>
      </div>
      <div class="detail">
        <div class="label">Date of Joining</div>
        <div class="value">${escapeHtml(joiningDate)}</div>
      </div>
    </div>
    <div class="scan">
      <h3>Scan and Verify</h3>
      <p>${escapeHtml(
        verificationUrl || 'Verification route becomes available once employee ID sync is complete.'
      )}</p>
    </div>
  </div>
</body>
</html>`;
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
      <Ionicons name={icon} size={22} color={COLORS.white} />
    </Pressable>
  );
}

function QrBlock({ seed }) {
  return (
    <View style={styles.qrShell}>
      <QRCode
        value={seed || 'VIBESPHERE-STAFF'}
        size={200}
        color="#000000"
        backgroundColor="#ffffff"
        quietZone={10}
      />
    </View>
  );
}

function DetailItem({ icon, label, value, tone = 'blue' }) {
  const toneStyles =
    tone === 'gold'
      ? styles.detailIconGold
      : tone === 'slate'
      ? styles.detailIconSlate
      : tone === 'mint'
      ? styles.detailIconMint
      : styles.detailIconBlue;

  return (
    <View style={styles.detailItem}>
      <View style={[styles.detailIconWrap, toneStyles]}>
        <Ionicons name={icon} size={16} color={COLORS.white} />
      </View>

      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function ActionButton({ icon, label, onPress, variant = 'primary', disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        variant === 'secondary' ? styles.actionButtonSecondary : styles.actionButtonPrimary,
        pressed && !disabled && styles.actionButtonPressed,
        disabled && styles.actionButtonDisabled,
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={variant === 'secondary' ? COLORS.text : COLORS.white}
      />
      <Text
        style={[
          styles.actionButtonText,
          variant === 'secondary'
            ? styles.actionButtonTextSecondary
            : styles.actionButtonTextPrimary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyProfileState({ onRetry }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="card-outline" size={24} color={COLORS.accent} />
      </View>
      <Text style={styles.emptyStateTitle}>Profile not available</Text>
      <Text style={styles.emptyStateBody}>
        We could not load your staff ID data right now. Pull to refresh or try again.
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [
          styles.emptyStateAction,
          pressed && styles.emptyStateActionPressed,
        ]}
      >
        <Text style={styles.emptyStateActionText}>Retry</Text>
      </Pressable>
    </View>
  );
}

export default function IdCardsScreen({ navigation }) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [profile, setProfile] = useState(auth?.profile || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (auth?.profile) {
      setProfile(auth.profile);
    }
  }, [auth?.profile]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    hydrateProfile();
  }, [isFocused, auth?.profile?.email]);

  async function hydrateProfile(isPullToRefresh = false) {
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
          activeProfile = {
            ...(auth?.profile || {}),
            ...meResponse.data.staff,
          };
          setProfile(activeProfile);
          await auth?.updateProfile?.(activeProfile);
        }
      } catch (error) {
        if (error?.response?.status !== 401) {
          console.error('ID card profile refresh failed.', error?.message || error);
        }
      }

      setProfile(activeProfile || null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleShareCard() {
    if (!profile) {
      Alert.alert('Profile missing', 'Please refresh your profile before sharing the ID card.');
      return;
    }

    const employeeId = profile.empId || 'PENDING-ID';
    const verificationUrl = profile.qrCodeString || getVerificationUrl(profile.empId);
    const joiningDate = formatJoiningDate(profile.joiningDate);

    setSharing(true);

    try {
      const message = [
        'VibeSphere Media Staff Identity',
        `Name: ${profile.name || 'Staff Member'}`,
        `Role: ${profile.role || 'Sales Executive'}`,
        `Employee ID: ${employeeId}`,
        `Date of Joining: ${joiningDate}`,
        `Email: ${profile.email || 'staff@vibespheremedia.in'}`,
        verificationUrl ? `Verify: ${verificationUrl}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      await Share.share({
        title: 'VibeSphere Staff ID Card',
        message,
      });
    } catch (error) {
      Alert.alert(
        'Share failed',
        getApiErrorMessage(error, 'Unable to share the ID card right now.')
      );
    } finally {
      setSharing(false);
    }
  }

  async function handleDownloadCard() {
    if (!profile) {
      Alert.alert('Profile missing', 'Please refresh your profile before downloading the ID card.');
      return;
    }

    setDownloading(true);

    try {
      const employeeId = profile.empId || 'PENDING-ID';
      const verificationUrl = getVerificationUrl(profile.empId);
      const targetDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;

      if (!targetDir) {
        throw new Error('No writable directory is available on this device.');
      }

      const sanitizedEmployeeId = employeeId.replace(/[^a-z0-9_-]/gi, '_');
      const fileUri = `${targetDir}VibeSphere_ID_${sanitizedEmployeeId}.html`;
      const html = buildIdCardExportHtml(profile, verificationUrl);

      await FileSystem.writeAsStringAsync(fileUri, html, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert('ID card ready', `Saved your ID card file to:\n${fileUri}`);
        return;
      }

      await Sharing.shareAsync(fileUri, {
        dialogTitle: 'Download ID Card',
        mimeType: 'text/html',
        UTI: 'public.html',
      });
    } catch (error) {
      Alert.alert(
        'Download failed',
        getApiErrorMessage(error, 'Unable to prepare the ID card file right now.')
      );
    } finally {
      setDownloading(false);
    }
  }

  const employeeId = profile?.empId || 'PENDING-ID';
  const roleLabel = profile?.role || 'Sales Executive';
  const verificationUrl = getVerificationUrl(profile?.empId);
  const joiningDateLabel = formatJoiningDate(profile?.joiningDate);
  const statusLabel = profile?.isOnline ? 'Online Staff' : 'Verified Staff';
  const qrSeed = verificationUrl || employeeId;

  return (
    <View style={styles.screen}>
      <View style={[styles.screenGlow, styles.screenGlowTop]} />
      <View style={[styles.screenGlow, styles.screenGlowBottom]} />
      <View style={[styles.screenGlow, styles.screenGlowMiddle]} />

      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <HeaderButton
          icon="menu-outline"
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        />

        <View style={styles.topBarCopy}>
          <Text style={styles.topBarTitle}>Virtual ID Card</Text>
          <Text style={styles.topBarSubtitle}>
            Premium wallet-style access pass synced from your live staff profile
          </Text>
        </View>

        <HeaderButton
          icon="refresh-outline"
          onPress={() => hydrateProfile(true)}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => hydrateProfile(true)}
            tintColor={COLORS.accent}
          />
        }
      >
        {loading && !profile ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={COLORS.white} />
            <Text style={styles.loadingText}>Loading your virtual ID card...</Text>
          </View>
        ) : null}

        {!loading && !profile ? <EmptyProfileState onRetry={() => hydrateProfile(true)} /> : null}

        {profile ? (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>Digital Wallet Identity</Text>
              <Text style={styles.heroTitle}>Carry your VibeSphere staff pass in a premium mobile format.</Text>
              <Text style={styles.heroBody}>
                This screen stays linked to your `apiClient` profile refresh so the card reflects your current company identity record.
              </Text>
            </View>

            <View style={styles.walletStack}>
              <View style={styles.walletShadowPlate} />
              <View style={styles.walletShadowPlateSecondary} />

              <View style={styles.walletCard}>
                <View style={styles.walletOrbBlue} />
                <View style={styles.walletOrbSlate} />
                <View style={styles.walletOrbGlow} />

                <View style={styles.cardPattern}>
                  {Array.from({ length: CARD_PATTERN_ROWS }).map((_, rowIndex) => (
                    <View key={`pattern-row-${rowIndex}`} style={styles.patternRow}>
                      {Array.from({ length: CARD_PATTERN_COLUMNS }).map((_, columnIndex) => (
                        <View
                          key={`pattern-dot-${rowIndex}-${columnIndex}`}
                          style={[
                            styles.patternDot,
                            (rowIndex + columnIndex) % 3 === 0 && styles.patternDotStrong,
                          ]}
                        />
                      ))}
                    </View>
                  ))}
                </View>

                <View style={styles.walletTopRow}>
                  <View style={styles.passChip}>
                    <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.white} />
                    <Text style={styles.passChipText}>{statusLabel}</Text>
                  </View>

                  <View style={styles.brandWrap}>
                    <View style={styles.brandTextWrap}>
                      <Text style={styles.brandOverline}>VibeSphere Staff</Text>
                      <Text style={styles.brandSubline}>Digital Wallet Pass</Text>
                    </View>
                    <View style={styles.brandLogo}>
                      <Text style={styles.brandLogoText}>VS</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.avatarHalo}>
                  <View style={styles.avatarHaloMiddle}>
                    <View style={styles.avatarFrame}>
                      {profile.profilePhoto ? (
                        <Image
                          source={{ uri: profile.profilePhoto }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <Text style={styles.avatarFallbackText}>
                            {getInitials(profile.name)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.identityBlock}>
                  <Text style={styles.staffName}>{profile.name || 'Staff Member'}</Text>
                  <Text style={styles.staffRole}>{roleLabel}</Text>

                  <View style={styles.identityMetaRow}>
                    <View style={styles.identityMetaPill}>
                      <Ionicons name="key-outline" size={13} color={COLORS.white} />
                      <Text style={styles.identityMetaText}>{employeeId}</Text>
                    </View>
                    <View style={styles.identityMetaPill}>
                      <Ionicons name="mail-outline" size={13} color={COLORS.white} />
                      <Text style={styles.identityMetaText} numberOfLines={1}>
                        {profile.email || 'staff@vibespheremedia.in'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailsPanel}>
                  <DetailItem
                    icon="person-outline"
                    label="Employee Name"
                    value={profile.name || 'Staff Member'}
                    tone="blue"
                  />
                  <DetailItem
                    icon="briefcase-outline"
                    label="Designation"
                    value={roleLabel}
                    tone="gold"
                  />
                  <DetailItem
                    icon="key-outline"
                    label="Employee ID"
                    value={employeeId}
                    tone="slate"
                  />
                  <DetailItem
                    icon="calendar-outline"
                    label="Date of Joining"
                    value={joiningDateLabel}
                    tone="mint"
                  />
                </View>

                <View style={styles.scanPanel}>
                  <View style={styles.qrPanel}>
                    <QrBlock seed={qrSeed} />
                    <Text style={styles.qrCaption}>Scan to verify</Text>
                    <Text style={styles.qrHint}>
                      {verificationUrl || 'Verification route unlocks when employee ID sync is complete.'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.actionRow}>
              <ActionButton
                icon={downloading ? 'hourglass-outline' : 'download-outline'}
                label={downloading ? 'Preparing File' : 'Download ID Card'}
                onPress={handleDownloadCard}
                variant="secondary"
                disabled={downloading || sharing}
              />
              <ActionButton
                icon={sharing ? 'hourglass-outline' : 'share-social-outline'}
                label={sharing ? 'Sharing' : 'Share'}
                onPress={handleShareCard}
                disabled={sharing || downloading}
              />
            </View>

            <View style={styles.syncCard}>
              <View style={styles.syncCardHeader}>
                <View style={styles.syncBadge}>
                  <Ionicons name="sync-outline" size={14} color={COLORS.accent} />
                  <Text style={styles.syncBadgeText}>Live Profile Sync</Text>
                </View>
              </View>
              <Text style={styles.syncTitle}>Identity details stay linked to your staff profile.</Text>
              <Text style={styles.syncBody}>
                Employee name, role, employee ID, avatar, and verification route are refreshed through `apiClient.get('staff/me')`. Joining date appears here automatically as soon as it is available in the synced profile payload.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#08111D',
  },
  screenGlow: {
    position: 'absolute',
    borderRadius: 999,
  },
  screenGlowTop: {
    width: 260,
    height: 260,
    top: -96,
    right: -54,
    backgroundColor: 'rgba(78, 123, 255, 0.22)',
  },
  screenGlowBottom: {
    width: 220,
    height: 220,
    bottom: 56,
    left: -90,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  screenGlowMiddle: {
    width: 180,
    height: 180,
    top: '42%',
    right: -70,
    backgroundColor: 'rgba(110, 129, 154, 0.14)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.md,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  headerButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  topBarCopy: {
    flex: 1,
    gap: 4,
  },
  topBarTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.7,
  },
  topBarSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.64)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SIZES.lg,
    gap: SIZES.lg,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.74)',
  },
  emptyState: {
    alignItems: 'center',
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: SIZES.xxxl,
    gap: SIZES.md,
  },
  emptyIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
  },
  emptyStateBody: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.66)',
    textAlign: 'center',
  },
  emptyStateAction: {
    borderRadius: 16,
    backgroundColor: COLORS.white,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  emptyStateActionPressed: {
    opacity: 0.84,
  },
  emptyStateActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: SIZES.xxl,
    gap: SIZES.sm,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.56)',
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
    color: 'rgba(255,255,255,0.66)',
  },
  walletStack: {
    position: 'relative',
    paddingTop: 22,
    paddingBottom: 10,
  },
  walletShadowPlate: {
    position: 'absolute',
    top: 32,
    left: 16,
    right: 16,
    bottom: 18,
    borderRadius: 38,
    backgroundColor: 'rgba(85, 113, 163, 0.34)',
    transform: [{ rotate: '-5deg' }],
  },
  walletShadowPlateSecondary: {
    position: 'absolute',
    top: 20,
    left: 10,
    right: 24,
    bottom: 26,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.06)',
    transform: [{ rotate: '4deg' }],
  },
  walletCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 38,
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 22,
    backgroundColor: '#111F31',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...SHADOWS.strong,
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 34,
    shadowOffset: {
      width: 0,
      height: 20,
    },
    elevation: 16,
  },
  walletOrbBlue: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 999,
    backgroundColor: 'rgba(69, 111, 225, 0.30)',
    top: -120,
    right: -70,
  },
  walletOrbSlate: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    bottom: -120,
    left: -70,
  },
  walletOrbGlow: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: 'rgba(122, 141, 160, 0.16)',
    top: 140,
    right: -80,
  },
  cardPattern: {
    position: 'absolute',
    top: 18,
    right: 18,
    gap: 8,
    opacity: 0.24,
  },
  patternRow: {
    flexDirection: 'row',
    gap: 8,
  },
  patternDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  patternDotStrong: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  walletTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SIZES.md,
  },
  passChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  passChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 'auto',
  },
  brandTextWrap: {
    alignItems: 'flex-end',
    gap: 3,
  },
  brandOverline: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.72)',
  },
  brandSubline: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  brandLogo: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  brandLogoText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  avatarHalo: {
    alignItems: 'center',
    marginTop: 26,
  },
  avatarHaloMiddle: {
    width: 144,
    height: 144,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  avatarFrame: {
    width: 124,
    height: 124,
    borderRadius: 999,
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  avatarFallback: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#223750',
  },
  avatarFallbackText: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -1,
  },
  identityBlock: {
    alignItems: 'center',
    marginTop: 18,
    gap: 8,
  },
  staffName: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  staffRole: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
  },
  identityMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  identityMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  identityMetaText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
    maxWidth: 200,
  },
  detailsPanel: {
    marginTop: 22,
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  detailIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailIconBlue: {
    backgroundColor: '#3D5F9B',
  },
  detailIconGold: {
    backgroundColor: '#8D6A2B',
  },
  detailIconSlate: {
    backgroundColor: '#3D4B61',
  },
  detailIconMint: {
    backgroundColor: '#265E64',
  },
  detailCopy: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.56)',
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: COLORS.white,
  },
  scanPanel: {
    marginTop: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPanel: {
    width: '100%',
    maxWidth: 220,
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  qrShell: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCaption: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  qrHint: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...SHADOWS.soft,
  },
  actionButtonPrimary: {
    backgroundColor: COLORS.accent,
  },
  actionButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  actionButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  actionButtonTextPrimary: {
    color: COLORS.white,
  },
  actionButtonTextSecondary: {
    color: COLORS.text,
  },
  syncCard: {
    borderRadius: 26,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    gap: 10,
  },
  syncCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  syncBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  syncTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  syncBody: {
    fontSize: 13,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.66)',
  },
});
