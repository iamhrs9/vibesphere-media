import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import apiClient from '../api/client';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, getInitials } from '../utils/staffWorkspace';

const CATEGORY_META = {
  all: {
    label: 'All Resources',
    icon: 'grid-outline',
    tone: 'accent',
  },
  hr: {
    label: 'HR Policies',
    icon: 'people-outline',
    tone: 'primary',
  },
  it: {
    label: 'IT Setup',
    icon: 'hardware-chip-outline',
    tone: 'accent',
  },
  sales: {
    label: 'Sales Guides',
    icon: 'trending-up-outline',
    tone: 'success',
  },
  documents: {
    label: 'Forms & Docs',
    icon: 'document-text-outline',
    tone: 'warning',
  },
  links: {
    label: 'Quick Links',
    icon: 'link-outline',
    tone: 'accent',
  },
  training: {
    label: 'SOP & Training',
    icon: 'school-outline',
    tone: 'success',
  },
  general: {
    label: 'General Help',
    icon: 'sparkles-outline',
    tone: 'primary',
  },
};

const TONE_PALETTE = {
  accent: {
    background: COLORS.accentSoft,
    strongBackground: COLORS.accent,
    text: COLORS.accent,
    border: 'rgba(78, 123, 255, 0.2)',
  },
  primary: {
    background: COLORS.primarySoft,
    strongBackground: COLORS.primary,
    text: COLORS.primary,
    border: 'rgba(22, 35, 59, 0.14)',
  },
  success: {
    background: COLORS.successSoft,
    strongBackground: COLORS.success,
    text: COLORS.success,
    border: 'rgba(20, 134, 109, 0.18)',
  },
  warning: {
    background: COLORS.warningSoft,
    strongBackground: COLORS.warning,
    text: COLORS.warning,
    border: 'rgba(201, 135, 43, 0.22)',
  },
  neutral: {
    background: COLORS.surfaceAlt,
    strongBackground: COLORS.textSecondary,
    text: COLORS.textSecondary,
    border: COLORS.border,
  },
};

function getApiErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function getTonePalette(tone = 'neutral') {
  return TONE_PALETTE[tone] || TONE_PALETTE.neutral;
}

function normalizeUrl(value) {
  const input = String(value || '').trim();

  if (!input) {
    return '';
  }

  if (/^https?:\/\//i.test(input)) {
    return input;
  }

  return `https://${input}`;
}

function guessCategory(resource) {
  const haystack = `${resource?.title || ''} ${resource?.content || ''}`
    .toLowerCase()
    .trim();
  const type = String(resource?.type || '').toLowerCase();

  if (
    haystack.includes('policy') ||
    haystack.includes('leave') ||
    haystack.includes('attendance') ||
    haystack.includes('payroll') ||
    haystack.includes('holiday') ||
    haystack.includes('hr') ||
    haystack.includes('employee') ||
    haystack.includes('id card')
  ) {
    return 'hr';
  }

  if (
    haystack.includes('it') ||
    haystack.includes('laptop') ||
    haystack.includes('wifi') ||
    haystack.includes('vpn') ||
    haystack.includes('email setup') ||
    haystack.includes('password') ||
    haystack.includes('software') ||
    haystack.includes('device')
  ) {
    return 'it';
  }

  if (
    haystack.includes('sales') ||
    haystack.includes('lead') ||
    haystack.includes('pricing') ||
    haystack.includes('pitch') ||
    haystack.includes('script') ||
    haystack.includes('proposal') ||
    haystack.includes('closing')
  ) {
    return 'sales';
  }

  if (
    haystack.includes('training') ||
    haystack.includes('onboarding') ||
    haystack.includes('process') ||
    haystack.includes('workflow') ||
    haystack.includes('sop') ||
    haystack.includes('tutorial')
  ) {
    return 'training';
  }

  if (type === 'pdf') {
    return 'documents';
  }

  if (type === 'link') {
    return 'links';
  }

  return 'general';
}

function buildSnippet(resource) {
  const content = String(resource?.content || '').trim();
  const type = String(resource?.type || '').toLowerCase();

  if (!content) {
    return 'Open this resource to view the full details.';
  }

  if (type === 'link') {
    return 'Quick access link for staff workflows, portals, or dashboards.';
  }

  if (type === 'pdf') {
    return 'Download the attached PDF for the official document or guide.';
  }

  if (content.length <= 128) {
    return content;
  }

  return `${content.slice(0, 125).trim()}...`;
}

function normalizeResource(resource) {
  const categoryKey = guessCategory(resource);
  const categoryMeta = CATEGORY_META[categoryKey] || CATEGORY_META.general;
  const type = String(resource?.type || 'text').toLowerCase();
  const attachmentUrl =
    type === 'pdf' || type === 'link' ? normalizeUrl(resource?.content) : '';

  return {
    ...resource,
    type,
    categoryKey,
    categoryLabel: categoryMeta.label,
    tone: categoryMeta.tone,
    icon: categoryMeta.icon,
    attachmentUrl,
    snippet: buildSnippet(resource),
    searchText: [
      resource?.title,
      resource?.content,
      categoryMeta.label,
      type,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };
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

function SummaryChip({ icon, label, value, tone = 'accent' }) {
  const palette = getTonePalette(tone);

  return (
    <View style={styles.summaryChip}>
      <View
        style={[
          styles.summaryChipIconWrap,
          { backgroundColor: palette.background },
        ]}
      >
        <Ionicons name={icon} size={16} color={palette.text} />
      </View>
      <View style={styles.summaryChipCopy}>
        <Text style={styles.summaryChipValue}>{value}</Text>
        <Text style={styles.summaryChipLabel}>{label}</Text>
      </View>
    </View>
  );
}

function CategoryCard({
  category,
  count,
  selected,
  onPress,
}) {
  const palette = getTonePalette(category.tone);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryCard,
        {
          backgroundColor: selected ? palette.strongBackground : COLORS.surface,
          borderColor: selected ? palette.strongBackground : palette.border,
        },
        pressed && !selected && styles.categoryCardPressed,
      ]}
    >
      <View
        style={[
          styles.categoryIconWrap,
          {
            backgroundColor: selected
              ? 'rgba(255,255,255,0.16)'
              : palette.background,
          },
        ]}
      >
        <Ionicons
          name={category.icon}
          size={18}
          color={selected ? COLORS.white : palette.text}
        />
      </View>
      <Text
        style={[
          styles.categoryLabel,
          selected && styles.categoryLabelSelected,
        ]}
      >
        {category.label}
      </Text>
      <Text
        style={[
          styles.categoryCount,
          selected && styles.categoryCountSelected,
        ]}
      >
        {count}
      </Text>
    </Pressable>
  );
}

function ResourceTypeBadge({ type }) {
  const tone =
    type === 'pdf' ? 'warning' : type === 'link' ? 'accent' : 'success';
  const palette = getTonePalette(tone);
  const icon =
    type === 'pdf'
      ? 'document-outline'
      : type === 'link'
      ? 'link-outline'
      : 'create-outline';
  const label =
    type === 'pdf' ? 'PDF' : type === 'link' ? 'Link' : 'Article';

  return (
    <View
      style={[
        styles.typeBadge,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
      ]}
    >
      <Ionicons name={icon} size={13} color={palette.text} />
      <Text style={[styles.typeBadgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function ResourceAccordion({
  resource,
  expanded,
  onToggle,
  onOpenAttachment,
}) {
  const palette = getTonePalette(resource.tone);

  return (
    <View style={styles.resourceCard}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.resourceHeaderPressable,
          pressed && styles.resourceHeaderPressed,
        ]}
      >
        <View style={styles.resourceHeader}>
          <View
            style={[
              styles.resourceIconWrap,
              { backgroundColor: palette.background },
            ]}
          >
            <Ionicons name={resource.icon} size={20} color={palette.text} />
          </View>

          <View style={styles.resourceCopy}>
            <View style={styles.resourceMetaRow}>
              <ResourceTypeBadge type={resource.type} />
              <Text style={styles.resourceDate}>{formatDateTime(resource.date)}</Text>
            </View>

            <Text style={styles.resourceTitle}>{resource.title || 'Untitled resource'}</Text>
            <Text style={styles.resourceCategory}>{resource.categoryLabel}</Text>
            <Text style={styles.resourceSnippet} numberOfLines={expanded ? 0 : 2}>
              {resource.snippet}
            </Text>
          </View>

          <View style={styles.resourceActions}>
            {resource.type === 'pdf' && resource.attachmentUrl ? (
              <Pressable
                onPress={() => onOpenAttachment(resource)}
                style={({ pressed }) => [
                  styles.inlineActionButton,
                  pressed && styles.inlineActionButtonPressed,
                ]}
              >
                <Ionicons
                  name="download-outline"
                  size={18}
                  color={COLORS.primary}
                />
              </Pressable>
            ) : null}

            <Ionicons
              name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={18}
              color={COLORS.textSecondary}
            />
          </View>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.resourceExpandedBody}>
          {resource.type === 'text' ? (
            <Text style={styles.resourceBodyText}>
              {resource.content || 'No article body available yet.'}
            </Text>
          ) : (
            <View style={styles.attachmentPanel}>
              <View style={styles.attachmentMeta}>
                <View
                  style={[
                    styles.attachmentIconWrap,
                    { backgroundColor: palette.background },
                  ]}
                >
                  <Ionicons
                    name={
                      resource.type === 'pdf'
                        ? 'document-text-outline'
                        : 'open-outline'
                    }
                    size={18}
                    color={palette.text}
                  />
                </View>
                <View style={styles.attachmentCopy}>
                  <Text style={styles.attachmentTitle}>
                    {resource.type === 'pdf'
                      ? 'Open or download the attached PDF'
                      : 'Open the linked resource'}
                  </Text>
                  <Text style={styles.attachmentSubtitle} numberOfLines={2}>
                    {resource.attachmentUrl || 'Attachment link unavailable'}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => onOpenAttachment(resource)}
                style={({ pressed }) => [
                  styles.attachmentButton,
                  pressed && styles.attachmentButtonPressed,
                ]}
              >
                <Ionicons
                  name={
                    resource.type === 'pdf'
                      ? 'download-outline'
                      : 'arrow-up-right-circle-outline'
                  }
                  size={16}
                  color={COLORS.white}
                />
                <Text style={styles.attachmentButtonText}>
                  {resource.type === 'pdf' ? 'Download PDF' : 'Open Resource'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function EmptyState({ icon, title, body }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={24} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export default function KnowledgeBaseScreen({ navigation }) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const profile = auth?.profile;

  const [resources, setResources] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedId, setExpandedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      fetchResources();
    }
  }, [isFocused]);

  async function fetchResources(options = {}) {
    const isRefresh = Boolean(options.refresh);

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await apiClient.get('resources');
      const items = Array.isArray(response?.data?.resources)
        ? response.data.resources.map(normalizeResource)
        : [];

      setResources(items);
    } catch (error) {
      Alert.alert(
        'Unable to load resources',
        getApiErrorMessage(
          error,
          'Please try again in a moment.'
        )
      );
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }

  async function handleOpenAttachment(resource) {
    const url = resource?.attachmentUrl;

    if (!url) {
      Alert.alert(
        'Attachment unavailable',
        'This resource does not have a downloadable file or valid link yet.'
      );
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(
        'Unable to open resource',
        getApiErrorMessage(error, 'Please try again later.')
      );
    }
  }

  function toggleExpanded(resourceId) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((current) => (current === resourceId ? '' : resourceId));
  }

  const categoryCounts = useMemo(() => {
    const counts = {
      all: resources.length,
    };

    Object.keys(CATEGORY_META).forEach((key) => {
      if (key !== 'all') {
        counts[key] = 0;
      }
    });

    resources.forEach((resource) => {
      counts[resource.categoryKey] = (counts[resource.categoryKey] || 0) + 1;
    });

    return counts;
  }, [resources]);

  const categoryOptions = useMemo(() => {
    return Object.entries(CATEGORY_META).map(([key, meta]) => ({
      key,
      ...meta,
      count: categoryCounts[key] || 0,
    }));
  }, [categoryCounts]);

  const filteredResources = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return resources.filter((resource) => {
      const matchesCategory =
        selectedCategory === 'all' || resource.categoryKey === selectedCategory;

      const matchesSearch =
        !query ||
        resource.searchText.includes(query) ||
        String(resource.title || '').toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [resources, searchQuery, selectedCategory]);

  const summary = useMemo(() => {
    const pdfCount = resources.filter((item) => item.type === 'pdf').length;
    const linkCount = resources.filter((item) => item.type === 'link').length;
    const articleCount = resources.filter((item) => item.type === 'text').length;

    return {
      total: resources.length,
      pdfCount,
      linkCount,
      articleCount,
    };
  }, [resources]);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: insets.top + SIZES.lg,
            paddingBottom: insets.bottom + SIZES.xxxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchResources({ refresh: true })}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.headerRow}>
          <HeaderButton
            icon="menu-outline"
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          />

          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{getInitials(profile?.name)}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroAccentOrbOne} />
          <View style={styles.heroAccentOrbTwo} />

          <View style={styles.heroLabelRow}>
            <View style={styles.heroLabelBadge}>
              <Ionicons name="book-outline" size={14} color={COLORS.white} />
              <Text style={styles.heroLabelText}>Resource Center</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Knowledge Base 📚</Text>
          <Text style={styles.heroSubtitle}>
            Search policies, training notes, sales scripts, and downloadable
            documents without digging through a web-style grid.
          </Text>

          <View style={styles.heroSummaryRow}>
            <SummaryChip
              icon="layers-outline"
              label="Total"
              value={summary.total}
              tone="accent"
            />
            <SummaryChip
              icon="document-text-outline"
              label="PDFs"
              value={summary.pdfCount}
              tone="warning"
            />
            <SummaryChip
              icon="link-outline"
              label="Links"
              value={summary.linkCount}
              tone="success"
            />
          </View>
        </View>

        <View style={styles.searchShell}>
          <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search policies, setup guides, FAQs..."
            placeholderTextColor={COLORS.textTertiary}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery ? (
            <Pressable
              onPress={() => setSearchQuery('')}
              style={({ pressed }) => [
                styles.clearSearchButton,
                pressed && styles.clearSearchButtonPressed,
              ]}
            >
              <Ionicons name="close-outline" size={18} color={COLORS.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="apps-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Categories</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Tap a category to narrow the resource feed instantly.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRail}
        >
          {categoryOptions.map((category) => (
            <CategoryCard
              key={category.key}
              category={category}
              count={category.count}
              selected={selectedCategory === category.key}
              onPress={() => setSelectedCategory(category.key)}
            />
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="reader-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Articles & FAQs</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Expand any card to read the answer or open the attached file.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading staff resources...</Text>
          </View>
        ) : filteredResources.length ? (
          filteredResources.map((resource) => (
            <ResourceAccordion
              key={resource._id || resource.title}
              resource={resource}
              expanded={expandedId === resource._id}
              onToggle={() => toggleExpanded(resource._id)}
              onOpenAttachment={handleOpenAttachment}
            />
          ))
        ) : resources.length ? (
          <EmptyState
            icon="search-outline"
            title="No matching resources"
            body="Try a broader search term or switch to another category."
          />
        ) : (
          <EmptyState
            icon="book-outline"
            title="No resources available yet"
            body="As soon as your team publishes PDFs, links, or internal notes, they will appear here."
          />
        )}

        {!loading && resources.length ? (
          <View style={styles.footerNote}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.footerNoteText}>
              {summary.articleCount} text articles, {summary.pdfCount} downloadable
              PDFs, and {summary.linkCount} quick links are ready for the team.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SIZES.lg,
    gap: SIZES.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    opacity: 0.76,
  },
  headerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    ...SHADOWS.soft,
  },
  headerAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },
  heroCard: {
    overflow: 'hidden',
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.primary,
    padding: SIZES.xxl,
    ...SHADOWS.medium,
  },
  heroAccentOrbOne: {
    position: 'absolute',
    top: -24,
    right: -16,
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroAccentOrbTwo: {
    position: 'absolute',
    bottom: -48,
    left: -18,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroLabelRow: {
    flexDirection: 'row',
    marginBottom: SIZES.md,
  },
  heroLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: SIZES.radiusPill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    marginTop: SIZES.sm,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.76)',
  },
  heroSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
    marginTop: SIZES.xl,
  },
  summaryChip: {
    minWidth: 94,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryChipIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryChipCopy: {
    flex: 1,
  },
  summaryChipValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
  },
  summaryChipLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.lg,
    paddingVertical: 4,
    minHeight: 60,
    ...SHADOWS.soft,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 14,
  },
  clearSearchButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  clearSearchButtonPressed: {
    opacity: 0.72,
  },
  sectionHeader: {
    gap: 6,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  categoryRail: {
    gap: SIZES.sm,
    paddingRight: SIZES.xs,
  },
  categoryCard: {
    width: 144,
    minHeight: 120,
    borderRadius: 24,
    borderWidth: 1,
    padding: SIZES.lg,
    justifyContent: 'space-between',
    ...SHADOWS.soft,
  },
  categoryCardPressed: {
    opacity: 0.82,
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 19,
  },
  categoryLabelSelected: {
    color: COLORS.white,
  },
  categoryCount: {
    marginTop: SIZES.sm,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  categoryCountSelected: {
    color: 'rgba(255,255,255,0.72)',
  },
  loadingCard: {
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SIZES.xxxl,
    paddingHorizontal: SIZES.lg,
    ...SHADOWS.soft,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  resourceCard: {
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  resourceHeaderPressable: {
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.lg,
    paddingBottom: SIZES.md,
  },
  resourceHeaderPressed: {
    opacity: 0.9,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.md,
  },
  resourceIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  resourceCopy: {
    flex: 1,
    gap: 6,
  },
  resourceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: SIZES.radiusPill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  resourceDate: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 22,
  },
  resourceCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  resourceSnippet: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  resourceActions: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
  },
  inlineActionButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  inlineActionButtonPressed: {
    opacity: 0.76,
  },
  resourceExpandedBody: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.lg,
    paddingTop: SIZES.lg,
  },
  resourceBodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  attachmentPanel: {
    gap: SIZES.md,
  },
  attachmentMeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.md,
  },
  attachmentIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentCopy: {
    flex: 1,
    gap: 5,
  },
  attachmentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  attachmentSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  attachmentButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  attachmentButtonPressed: {
    opacity: 0.82,
  },
  attachmentButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.white,
  },
  emptyState: {
    alignItems: 'center',
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.xxxl,
    ...SHADOWS.soft,
  },
  emptyIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
    marginBottom: SIZES.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: SIZES.sm,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.lg,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
});
