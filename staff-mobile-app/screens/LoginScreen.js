import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import apiClient from '../api/client';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

function FeatureChip({ icon, label }) {
  return (
    <View style={styles.featureChip}>
      <Ionicons name={icon} size={16} color={COLORS.primary} />
      <Text style={styles.featureChipText}>{label}</Text>
    </View>
  );
}

function InputField({
  icon,
  label,
  placeholder,
  secureTextEntry,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  returnKeyType,
  onSubmitEditing,
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputShell}>
        <View style={styles.inputIconWrap}>
          <Ionicons name={icon} size={18} color={COLORS.textSecondary} />
        </View>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textTertiary}
          secureTextEntry={secureTextEntry}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
        />
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = Boolean(email.trim() && password.trim() && !loading);

  async function handleLogin() {
    const normalizedEmail = email.trim().toLowerCase();
    const sanitizedPassword = password.trim();

    if (!normalizedEmail || !sanitizedPassword) {
      Alert.alert('Missing details', 'Enter your staff email and password to continue.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('staff/login', {
        email: normalizedEmail,
        password: sanitizedPassword,
      });

      const payload = response.data || {};

      if (!payload.success || !payload.token) {
        Alert.alert(
          'Login failed',
          payload.message || 'Your staff credentials could not be verified.'
        );
        return;
      }

      await auth?.signIn({
        token: payload.token,
        staff: payload.staff || {
          email: normalizedEmail,
        },
      });
    } catch (error) {
      const serverMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Please check the server URL and your internet connection.';

      Alert.alert('Could not sign in', serverMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.background}>
        <View style={[styles.glowOrb, styles.glowOrbPrimary]} />
        <View style={[styles.glowOrb, styles.glowOrbSecondary]} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroBlock}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles-outline" size={14} color={COLORS.accent} />
              <Text style={styles.heroBadgeText}>Staff Mobile Experience</Text>
            </View>

            <Text style={styles.heroTitle}>
              A calmer way to run the staff desk.
            </Text>
            <Text style={styles.heroSubtitle}>
              Native mobile access for attendance, lead follow-ups, wallet
              visibility, notices, and meetings without the web-wrapper feel.
            </Text>

            <View style={styles.featureRow}>
              <FeatureChip icon="shield-checkmark-outline" label="Secure session" />
              <FeatureChip icon="time-outline" label="Live attendance" />
              <FeatureChip icon="wallet-outline" label="Wallet insights" />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardSubtitle}>
                Sign in with the same credentials you use for the staff dashboard.
              </Text>
            </View>

            <InputField
              icon="mail-outline"
              label="Email address"
              placeholder="staff@vibespheremedia.in"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />

            <InputField
              icon="lock-closed-outline"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <Pressable
              onPress={handleLogin}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.signInButton,
                !canSubmit && styles.signInButtonDisabled,
                pressed && canSubmit && styles.signInButtonPressed,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.signInButtonText}>Enter workspace</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={COLORS.white}
                  />
                </>
              )}
            </Pressable>

            <View style={styles.helpRow}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={COLORS.textSecondary}
              />
              <Text style={styles.helpText}>
                If login succeeds on web but not here, double-check the mobile
                API base URL in `api/client.js`.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  background: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowOrbPrimary: {
    top: -30,
    right: -40,
    width: 220,
    height: 220,
    backgroundColor: COLORS.primarySoft,
  },
  glowOrbSecondary: {
    bottom: 100,
    left: -70,
    width: 200,
    height: 200,
    backgroundColor: COLORS.accentSoft,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.xxxl,
    gap: SIZES.xxl,
  },
  heroBlock: {
    gap: SIZES.lg,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: SIZES.radiusPill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.textSecondary,
    maxWidth: 360,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: SIZES.radiusPill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  card: {
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.surface,
    padding: SIZES.xxl,
    gap: SIZES.xl,
    ...SHADOWS.strong,
  },
  cardHeader: {
    gap: 6,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.6,
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  fieldGroup: {
    gap: SIZES.sm,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 58,
    overflow: 'hidden',
  },
  inputIconWrap: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingRight: SIZES.lg,
    paddingVertical: SIZES.lg,
  },
  signInButton: {
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    ...SHADOWS.medium,
  },
  signInButtonDisabled: {
    opacity: 0.55,
  },
  signInButtonPressed: {
    opacity: 0.9,
  },
  signInButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
    paddingTop: SIZES.sm,
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
});
