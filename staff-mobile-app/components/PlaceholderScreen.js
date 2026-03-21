import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, SHADOWS, SIZES } from '../constants/theme';

export default function PlaceholderScreen({
  navigation,
  title,
  subtitle,
}) {
  const insets = useSafeAreaInsets();

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
          <Text style={styles.topBarTitle}>{title}</Text>
          <Text style={styles.topBarSubtitle}>Navigation skeleton placeholder</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 44 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.badge}>
            <Ionicons name="construct-outline" size={14} color={COLORS.accent} />
            <Text style={styles.badgeText}>Step 1 placeholder</Text>
          </View>
          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroBody}>{subtitle}</Text>
        </View>

        <View style={styles.contentCard}>
          <Text style={styles.contentTitle}>Screen ready for feature extraction</Text>
          <Text style={styles.contentBody}>
            Detailed UI and logic from `staff-dashboard.html` will be moved into
            this screen in the next pass.
          </Text>
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
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: SIZES.radiusPill,
    backgroundColor: COLORS.accentSoft,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accent,
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
  contentCard: {
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.surface,
    padding: SIZES.xxl,
    gap: SIZES.md,
    ...SHADOWS.soft,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  contentBody: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
});
