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
import QRCode from 'react-native-qrcode-svg';

import apiClient from '../api/client';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/staffWorkspace';

const CARD_ASPECT_RATIO = 85.6 / 54;
const COMPANY_ADDRESS = 'VibeSphere Media HQ, Jaipur, Rajasthan, India';
const RETURN_NOTE = 'Property of VibeSphere Media. If found, please return.';
const FALLBACK_EMAIL = 'staff@vibespheremedia.in';

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

function getVerificationSeed(profile) {
  return profile?.qrCodeString || getVerificationUrl(profile?.empId);
}

function getStaffPhoneValue(profile) {
  const phone =
    profile?.phone ||
    profile?.mobile ||
    profile?.phoneNumber ||
    profile?.contactNumber ||
    profile?.contactNo;

  return phone ? String(phone) : 'Not available';
}

function getBrandLogoUrl() {
  const origin = getServerOrigin(apiClient?.defaults?.baseURL);
  return origin ? `${origin}/logo.webp` : '';
}

function getQrImageUrl(value) {
  if (!value) {
    return '';
  }

  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=16&data=${encodeURIComponent(
    value
  )}`;
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

function buildIdCardExportHtml(profile, verificationSeed) {
  const employeeId = profile?.empId || 'PENDING-ID';
  const initials = getInitials(profile?.name || 'VibeSphere');
  const phoneLabel = getStaffPhoneValue(profile);
  const emailLabel = profile?.email || FALLBACK_EMAIL;
  const roleLabel = profile?.role || 'Sales Executive';
  const qrImageUrl = getQrImageUrl(verificationSeed || employeeId);
  const logoUrl = getBrandLogoUrl();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VibeSphere Staff ID Card</title>
  <style>
    * { box-sizing: border-box; }
    :root {
      --card-width: 85.6mm;
      --card-height: 54mm;
      --card-radius: 10px;
      --surface: #08111d;
      --surface-soft: #102033;
      --surface-deep: #0c1725;
      --line: rgba(255,255,255,0.14);
      --text-soft: rgba(255,255,255,0.72);
    }
    body {
      margin: 0;
      min-height: 100vh;
      padding: 32px 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background:
        radial-gradient(circle at top right, rgba(82, 120, 220, 0.18), transparent 28%),
        radial-gradient(circle at bottom left, rgba(255,255,255,0.06), transparent 22%),
        linear-gradient(180deg, #08111d 0%, #0d1725 100%);
      font-family: Arial, sans-serif;
      color: #ffffff;
    }
    .sheet {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 20px;
      width: 100%;
      max-width: 880px;
    }
    .panel {
      width: min(100%, 360px);
    }
    .side-label {
      margin: 0 0 8px;
      color: rgba(255,255,255,0.62);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      text-align: center;
    }
    .card {
      position: relative;
      width: 100%;
      aspect-ratio: 85.6 / 54;
      min-height: 224px;
      padding: 16px;
      border-radius: var(--card-radius);
      overflow: hidden;
      border: 1px solid var(--line);
      box-shadow: 0 18px 40px rgba(0,0,0,0.32);
      background: linear-gradient(145deg, #102033 0%, #162a44 46%, #0c1725 100%);
    }
    .card.back {
      background: linear-gradient(145deg, #11253a 0%, #15304b 48%, #0d1929 100%);
    }
    .card::before,
    .card::after {
      content: '';
      position: absolute;
      border-radius: 999px;
      pointer-events: none;
    }
    .card::before {
      width: 170px;
      height: 170px;
      top: -92px;
      right: -50px;
      background: rgba(76, 121, 232, 0.26);
    }
    .card::after {
      width: 120px;
      height: 120px;
      bottom: -65px;
      left: -38px;
      background: rgba(255,255,255,0.10);
    }
    .card > * {
      position: relative;
      z-index: 1;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .brand-mark {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      flex-shrink: 0;
      display: grid;
      place-items: center;
      padding: 6px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.18);
      overflow: hidden;
    }
    .brand-mark img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .brand-mark span {
      color: #ffffff;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.02em;
    }
    .brand-copy {
      min-width: 0;
    }
    .brand-copy strong,
    .brand-copy span {
      display: block;
    }
    .brand-copy strong {
      font-size: 14px;
      font-weight: 800;
    }
    .brand-copy span {
      margin-top: 2px;
      color: var(--text-soft);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }
    .front-body {
      display: flex;
      flex-direction: column;
      gap: 10px;
      height: calc(100% - 50px);
    }
    .identity {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;
    }
    .photo-shell {
      width: 84px;
      height: 84px;
      padding: 5px;
      border-radius: 999px;
      background: rgba(255,255,255,0.14);
      border: 1px solid rgba(255,255,255,0.18);
      box-shadow: 0 12px 28px rgba(0,0,0,0.22);
    }
    .photo-shell img,
    .photo-fallback {
      width: 100%;
      height: 100%;
      border-radius: 999px;
    }
    .photo-shell img {
      object-fit: cover;
      display: block;
      background: rgba(255,255,255,0.1);
    }
    .photo-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #223750;
      color: #ffffff;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.04em;
    }
    .name {
      margin: 0;
      font-size: 20px;
      line-height: 1.05;
      font-weight: 800;
    }
    .role {
      margin: 0;
      color: var(--text-soft);
      font-size: 12px;
      font-weight: 600;
    }
    .info-list {
      display: grid;
      gap: 8px;
      margin-top: auto;
    }
    .info-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 10px;
      border-radius: 10px;
      background: rgba(255,255,255,0.10);
      border: 1px solid rgba(255,255,255,0.10);
    }
    .info-icon {
      width: 30px;
      height: 30px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      color: #ffffff;
      background: rgba(81, 118, 204, 0.8);
      font-size: 14px;
      font-weight: 700;
    }
    .info-copy {
      min-width: 0;
    }
    .info-copy span,
    .info-copy strong {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .info-copy span {
      color: rgba(255,255,255,0.58);
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }
    .info-copy strong {
      margin-top: 2px;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
    }
    .back-body {
      height: calc(100% - 50px);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      text-align: center;
    }
    .qr-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      margin-top: 2px;
    }
    .qr-shell {
      width: 144px;
      height: 144px;
      padding: 12px;
      border-radius: 10px;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 0 0 1px rgba(16, 35, 61, 0.08);
    }
    .qr-shell img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .qr-fallback {
      color: #10233d;
      font-size: 12px;
      font-weight: 700;
    }
    .qr-caption {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.68);
    }
    .back-footer {
      display: grid;
      gap: 6px;
      width: 100%;
    }
    .back-footer p {
      margin: 0;
      text-align: center;
    }
    .back-address {
      font-size: 11px;
      line-height: 1.45;
      font-weight: 600;
      color: #ffffff;
    }
    .back-note {
      font-size: 10px;
      line-height: 1.45;
      color: rgba(255,255,255,0.72);
    }
    @media print {
      @page {
        margin: 12mm;
      }
      body {
        padding: 0;
        background: #ffffff;
      }
      .sheet {
        justify-content: flex-start;
        gap: 6mm;
      }
      .panel {
        width: var(--card-width);
      }
      .side-label {
        display: none;
      }
      .card {
        width: var(--card-width);
        height: var(--card-height);
        min-height: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <section class="panel">
      <p class="side-label">Front</p>
      <article class="card front">
        <div class="header">
          <div class="brand">
            <div class="brand-mark">
              ${
                logoUrl
                  ? `<img src="${escapeHtml(logoUrl)}" alt="VibeSphere Media logo">`
                  : `<span>VS</span>`
              }
            </div>
            <div class="brand-copy">
              <strong>VibeSphere Media</strong>
              <span>Staff ID Card</span>
            </div>
          </div>
        </div>
        <div class="front-body">
          <div class="identity">
            <div class="photo-shell">
              ${
                profile?.profilePhoto
                  ? `<img src="${escapeHtml(profile.profilePhoto)}" alt="${escapeHtml(
                      profile?.name || 'Staff Member'
                    )}">`
                  : `<div class="photo-fallback">${escapeHtml(initials)}</div>`
              }
            </div>
            <div>
              <h1 class="name">${escapeHtml(profile?.name || 'Staff Member')}</h1>
              <p class="role">${escapeHtml(roleLabel)}</p>
            </div>
          </div>
          <div class="info-list">
            <div class="info-row">
              <div class="info-icon">ID</div>
              <div class="info-copy">
                <span>Employee ID</span>
                <strong>${escapeHtml(employeeId)}</strong>
              </div>
            </div>
            <div class="info-row">
              <div class="info-icon">PH</div>
              <div class="info-copy">
                <span>Phone</span>
                <strong>${escapeHtml(phoneLabel)}</strong>
              </div>
            </div>
            <div class="info-row">
              <div class="info-icon">@</div>
              <div class="info-copy">
                <span>Email</span>
                <strong>${escapeHtml(emailLabel)}</strong>
              </div>
            </div>
          </div>
        </div>
      </article>
    </section>
    <section class="panel">
      <p class="side-label">Back</p>
      <article class="card back">
        <div class="header">
          <div class="brand">
            <div class="brand-mark">
              ${
                logoUrl
                  ? `<img src="${escapeHtml(logoUrl)}" alt="VibeSphere Media logo">`
                  : `<span>VS</span>`
              }
            </div>
            <div class="brand-copy">
              <strong>VibeSphere Media</strong>
              <span>Staff ID Card</span>
            </div>
          </div>
        </div>
        <div class="back-body">
          <div class="qr-wrap">
            <div class="qr-shell">
              ${
                qrImageUrl
                  ? `<img src="${escapeHtml(qrImageUrl)}" alt="Verification QR code">`
                  : `<span class="qr-fallback">QR unavailable</span>`
              }
            </div>
            <div class="qr-caption">Scan to verify</div>
          </div>
          <div class="back-footer">
            <p class="back-address">${escapeHtml(COMPANY_ADDRESS)}</p>
            <p class="back-note">${escapeHtml(RETURN_NOTE)}</p>
          </div>
        </div>
      </article>
    </section>
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

function BrandLogo({ uri, size = 40 }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [uri]);

  return (
    <View
      style={[
        styles.brandLogoBadge,
        {
          width: size,
          height: size,
        },
      ]}
    >
      {uri && !hasError ? (
        <Image
          source={{ uri }}
          resizeMode="contain"
          style={styles.brandLogoImage}
          onError={() => setHasError(true)}
        />
      ) : (
        <Text style={styles.brandLogoBadgeText}>VS</Text>
      )}
    </View>
  );
}

function QrBlock({ seed }) {
  return (
    <View style={styles.qrShell}>
      <QRCode
        value={seed || 'VIBESPHERE-STAFF'}
        size={118}
        color="#000000"
        backgroundColor="#ffffff"
        quietZone={10}
      />
    </View>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <View style={styles.detailItem}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={15} color={COLORS.white} />
      </View>

      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={1}>
          {value}
        </Text>
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
        variant === 'secondary'
          ? styles.actionButtonSecondary
          : styles.actionButtonPrimary,
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
    const verificationUrl = getVerificationSeed(profile);
    const joiningDate = formatJoiningDate(profile.joiningDate);
    const phoneLabel = getStaffPhoneValue(profile);

    setSharing(true);

    try {
      const message = [
        'VibeSphere Media Staff Identity',
        `Name: ${profile.name || 'Staff Member'}`,
        `Role: ${profile.role || 'Sales Executive'}`,
        `Employee ID: ${employeeId}`,
        `Phone: ${phoneLabel}`,
        `Email: ${profile.email || FALLBACK_EMAIL}`,
        `Date of Joining: ${joiningDate}`,
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
      const verificationSeed = getVerificationSeed(profile);
      const targetDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;

      if (!targetDir) {
        throw new Error('No writable directory is available on this device.');
      }

      const sanitizedEmployeeId = employeeId.replace(/[^a-z0-9_-]/gi, '_');
      const fileUri = `${targetDir}VibeSphere_ID_${sanitizedEmployeeId}.html`;
      const html = buildIdCardExportHtml(profile, verificationSeed);

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
  const phoneLabel = getStaffPhoneValue(profile);
  const emailLabel = profile?.email || FALLBACK_EMAIL;
  const verificationUrl = getVerificationSeed(profile);
  const qrSeed = verificationUrl || employeeId;
  const brandLogoUri = useMemo(() => getBrandLogoUrl(), []);

  const detailRows = useMemo(
    () => [
      {
        icon: 'card-outline',
        label: 'Employee ID',
        value: employeeId,
      },
      {
        icon: 'call-outline',
        label: 'Phone',
        value: phoneLabel,
      },
      {
        icon: 'mail-outline',
        label: 'Email',
        value: emailLabel,
      },
    ],
    [employeeId, phoneLabel, emailLabel]
  );

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
          <Text style={styles.topBarTitle}>Staff ID Cards</Text>
          <Text style={styles.topBarSubtitle}>
            Front and back CR80-style identity cards synced from your live staff profile
          </Text>
        </View>

        <HeaderButton icon="refresh-outline" onPress={() => hydrateProfile(true)} />
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
            <Text style={styles.loadingText}>Loading your staff ID cards...</Text>
          </View>
        ) : null}

        {!loading && !profile ? <EmptyProfileState onRetry={() => hydrateProfile(true)} /> : null}

        {profile ? (
          <>
            <View style={styles.cardDeck}>
              <View style={styles.cardPanel}>
                <Text style={styles.sideLabel}>Front</Text>
                <View style={[styles.idCard, styles.idCardFront]}>
                  <View style={[styles.cardOrb, styles.cardOrbBlue]} />
                  <View style={[styles.cardOrb, styles.cardOrbSlate]} />
                  <View style={[styles.cardOrb, styles.cardOrbGlow]} />
                  <View style={styles.cardEdge} />

                  <View style={styles.cardHeader}>
                    <View style={styles.brandRow}>
                      <BrandLogo uri={brandLogoUri} size={42} />
                      <View style={styles.brandCopy}>
                        <Text style={styles.brandTitle}>VibeSphere Media</Text>
                        <Text style={styles.brandSubtitle}>STAFF ID CARD</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.frontBody}>
                    <View style={styles.identityBlock}>
                      <View style={styles.photoShell}>
                        <View style={styles.photoFrame}>
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

                      <View style={styles.identityTextWrap}>
                        <Text style={styles.staffName} numberOfLines={2}>
                          {profile.name || 'Staff Member'}
                        </Text>
                        <Text style={styles.staffRole} numberOfLines={1}>
                          {roleLabel}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailsPanel}>
                      {detailRows.map((item) => (
                        <DetailItem
                          key={item.label}
                          icon={item.icon}
                          label={item.label}
                          value={item.value}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.cardPanel}>
                <Text style={styles.sideLabel}>Back</Text>
                <View style={[styles.idCard, styles.idCardBack]}>
                  <View style={[styles.cardOrb, styles.cardOrbBlue]} />
                  <View style={[styles.cardOrb, styles.cardOrbSlate]} />
                  <View style={[styles.cardOrb, styles.cardOrbGlow]} />
                  <View style={styles.cardEdge} />

                  <View style={styles.cardHeader}>
                    <View style={styles.brandRow}>
                      <BrandLogo uri={brandLogoUri} size={40} />
                      <View style={styles.brandCopy}>
                        <Text style={styles.brandTitle}>VibeSphere Media</Text>
                        <Text style={styles.brandSubtitle}>STAFF ID CARD</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.backBody}>
                    <View style={styles.qrPanel}>
                      <QrBlock seed={qrSeed} />
                      <Text style={styles.qrCaption}>Scan to verify</Text>
                    </View>

                    <View style={styles.backFooter}>
                      <Text style={styles.backAddress}>{COMPANY_ADDRESS}</Text>
                      <Text style={styles.backNote}>{RETURN_NOTE}</Text>
                    </View>
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
  cardDeck: {
    gap: 18,
  },
  cardPanel: {
    gap: 8,
  },
  sideLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.56)',
    textAlign: 'center',
  },
  idCard: {
    position: 'relative',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000000',
    shadowOpacity: 0.26,
    shadowRadius: 22,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    elevation: 12,
  },
  idCardFront: {
    backgroundColor: '#102033',
  },
  idCardBack: {
    backgroundColor: '#12263B',
  },
  cardEdge: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  cardOrbBlue: {
    width: 170,
    height: 170,
    top: -92,
    right: -46,
    backgroundColor: 'rgba(73, 116, 228, 0.30)',
  },
  cardOrbSlate: {
    width: 126,
    height: 126,
    bottom: -64,
    left: -36,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  cardOrbGlow: {
    width: 110,
    height: 110,
    top: 84,
    right: -36,
    backgroundColor: 'rgba(142, 164, 193, 0.12)',
  },
  cardHeader: {
    zIndex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogoBadge: {
    borderRadius: 10,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  brandLogoImage: {
    width: '100%',
    height: '100%',
  },
  brandLogoBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.2,
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
  brandSubtitle: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.68)',
  },
  frontBody: {
    flex: 1,
    marginTop: 10,
    justifyContent: 'space-between',
  },
  identityBlock: {
    alignItems: 'center',
    gap: 8,
  },
  photoShell: {
    width: 88,
    height: 88,
    padding: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  photoFrame: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.10)',
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
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -1,
  },
  identityTextWrap: {
    alignItems: 'center',
    gap: 4,
  },
  staffName: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.6,
    textAlign: 'center',
    maxWidth: '92%',
  },
  staffRole: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
  },
  detailsPanel: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  detailIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(81, 118, 204, 0.78)',
  },
  detailCopy: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.56)',
  },
  detailValue: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  backBody: {
    flex: 1,
    marginTop: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrPanel: {
    alignItems: 'center',
    gap: 8,
  },
  qrShell: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10233D',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  qrCaption: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
  },
  backFooter: {
    width: '100%',
    gap: 6,
    alignItems: 'center',
  },
  backAddress: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  backNote: {
    fontSize: 10,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.72)',
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
});
