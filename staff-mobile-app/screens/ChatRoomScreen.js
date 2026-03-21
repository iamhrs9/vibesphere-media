import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import apiClient from '../api/client';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/staffWorkspace';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

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
};

const ATTACHMENT_ACTIONS = [
  {
    key: 'take-photo',
    label: 'Take Photo',
    icon: 'camera-outline',
    tone: 'accent',
  },
  {
    key: 'choose-gallery',
    label: 'Choose from Gallery',
    icon: 'images-outline',
    tone: 'success',
  },
  {
    key: 'upload-document',
    label: 'Upload Document',
    icon: 'document-attach-outline',
    tone: 'warning',
  },
];

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

function formatMessageTime(value) {
  if (!value) {
    return 'Now';
  }

  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRecordingTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds || 0));
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
  const remainder = String(safeSeconds % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function getMessagePreviewText(message) {
  if (message?.message) {
    return String(message.message).trim().slice(0, 90);
  }

  if (message?.fileName) {
    return message.fileName;
  }

  if (message?.fileType === 'audio') {
    return 'Voice note';
  }

  if (message?.fileUrl) {
    return 'Attachment';
  }

  return 'Pinned update';
}

function isImageMessage(message) {
  return String(message?.fileType || '').toLowerCase() === 'image';
}

function isAudioMessage(message) {
  return String(message?.fileType || '').toLowerCase() === 'audio';
}

function isPdfMessage(message) {
  return String(message?.fileType || '').toLowerCase() === 'pdf';
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

function Avatar({ name, profilePhoto, tone = 'neutral' }) {
  if (profilePhoto) {
    return <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />;
  }

  const palette = getPalette(tone);

  return (
    <View style={[styles.avatarFallback, { backgroundColor: palette.background }]}>
      <Text style={[styles.avatarFallbackText, { color: palette.text }]}>
        {getInitials(name)}
      </Text>
    </View>
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
      <Ionicons name={icon} size={13} color={palette.text} />
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function MessageAttachment({ item, isMine }) {
  if (!item.fileUrl) {
    return null;
  }

  if (isImageMessage(item)) {
    return (
      <Pressable
        onPress={() =>
          openExternalUrl(item.fileUrl, 'Image preview is unavailable right now.')
        }
        style={({ pressed }) => [
          styles.imageAttachmentWrap,
          pressed && styles.attachmentPressed,
        ]}
      >
        <Image source={{ uri: item.fileUrl }} style={styles.imageAttachment} />
      </Pressable>
    );
  }

  const iconName = isAudioMessage(item)
    ? 'mic-outline'
    : isPdfMessage(item)
      ? 'document-text-outline'
      : 'attach-outline';

  return (
    <Pressable
      onPress={() =>
        openExternalUrl(item.fileUrl, 'Attachment preview is unavailable right now.')
      }
      style={({ pressed }) => [
        styles.attachmentCard,
        isMine && styles.attachmentCardMine,
        pressed && styles.attachmentPressed,
      ]}
    >
      <View
        style={[
          styles.attachmentIconWrap,
          isMine && styles.attachmentIconWrapMine,
        ]}
      >
        <Ionicons
          name={iconName}
          size={18}
          color={isMine ? COLORS.white : COLORS.primary}
        />
      </View>

      <View style={styles.attachmentCopy}>
        <Text
          style={[styles.attachmentTitle, isMine && styles.attachmentTitleMine]}
          numberOfLines={1}
        >
          {item.fileName || (isAudioMessage(item) ? 'Voice note' : 'Attachment')}
        </Text>
        <Text
          style={[
            styles.attachmentSubtitle,
            isMine && styles.attachmentSubtitleMine,
          ]}
        >
          Tap to open
        </Text>
      </View>
    </Pressable>
  );
}

function MessageBubble({ item, currentEmail }) {
  const isMine =
    String(item.senderEmail || '').trim().toLowerCase() ===
    String(currentEmail || '').trim().toLowerCase();
  const isAdmin = String(item.role || '').trim() === 'Admin';

  return (
    <View
      style={[
        styles.messageRow,
        isMine ? styles.messageRowMine : styles.messageRowOther,
      ]}
    >
      {!isMine ? (
        <Avatar
          name={item.senderName || (isAdmin ? 'Admin' : 'Staff')}
          profilePhoto={item.profilePhoto}
          tone={isAdmin ? 'warning' : 'neutral'}
        />
      ) : null}

      <View style={[styles.messageColumn, isMine && styles.messageColumnMine]}>
        {!isMine ? (
          <View style={styles.senderRow}>
            <Text style={styles.senderName}>
              {item.senderName || item.senderEmail || 'Team Member'}
            </Text>
            {isAdmin ? <ToneBadge icon="shield-outline" label="Admin" tone="warning" /> : null}
          </View>
        ) : null}

        <View
          style={[
            styles.messageBubble,
            isMine ? styles.messageBubbleMine : styles.messageBubbleOther,
          ]}
        >
          {item.replyTo?.senderName || item.replyTo?.previewText ? (
            <View
              style={[
                styles.replyCard,
                isMine ? styles.replyCardMine : styles.replyCardOther,
              ]}
            >
              <Text
                style={[
                  styles.replyLabel,
                  isMine ? styles.replyLabelMine : styles.replyLabelOther,
                ]}
              >
                Replying to {item.replyTo.senderName || 'Message'}
              </Text>
              <Text
                style={[
                  styles.replyText,
                  isMine ? styles.replyTextMine : styles.replyTextOther,
                ]}
                numberOfLines={2}
              >
                {item.replyTo.previewText || ''}
              </Text>
            </View>
          ) : null}

          <MessageAttachment item={item} isMine={isMine} />

          {item.message ? (
            <Text
              style={[
                styles.messageText,
                isMine ? styles.messageTextMine : styles.messageTextOther,
              ]}
            >
              {item.message}
            </Text>
          ) : null}
        </View>

        <Text
          style={[
            styles.messageTime,
            isMine ? styles.messageTimeMine : styles.messageTimeOther,
          ]}
        >
          {formatMessageTime(item.date)}
        </Text>
      </View>
    </View>
  );
}

function PinnedMessageStrip({ message, onPress }) {
  if (!message?._id) {
    return null;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pinnedStrip,
        pressed && styles.pinnedStripPressed,
      ]}
    >
      <Ionicons name="bookmark-outline" size={16} color={COLORS.accent} />
      <Text style={styles.pinnedStripText} numberOfLines={1}>
        {getMessagePreviewText(message)}
      </Text>
    </Pressable>
  );
}

function AttachmentSheet({
  visible,
  onClose,
  onSelectAction,
  bottomInset,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />

        <View
          style={[
            styles.sheetCard,
            { paddingBottom: Math.max(bottomInset, 16) },
          ]}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Add to conversation</Text>
          <Text style={styles.sheetSubtitle}>
            Choose how you want to add media or files to this chat.
          </Text>

          <View style={styles.sheetActionGroup}>
            {ATTACHMENT_ACTIONS.map((action) => {
              const palette = getPalette(action.tone);

              return (
                <Pressable
                  key={action.key}
                  onPress={() => onSelectAction(action.key)}
                  style={({ pressed }) => [
                    styles.sheetActionButton,
                    pressed && styles.sheetActionButtonPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.sheetActionIconWrap,
                      { backgroundColor: palette.background },
                    ]}
                  >
                    <Ionicons name={action.icon} size={18} color={palette.text} />
                  </View>
                  <Text style={styles.sheetActionLabel}>{action.label}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={COLORS.textTertiary}
                  />
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.sheetCancelButton,
              pressed && styles.sheetCancelButtonPressed,
            ]}
          >
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function ChatRoomScreen({ navigation, route }) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const listRef = useRef(null);
  const pollTimerRef = useRef(null);
  const group = route.params?.group || {
    id: 'agency-global',
    name: 'Agency Global Chat',
    kind: 'live',
    description: '',
  };

  const [profile, setProfile] = useState(auth?.profile || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [isChatBlocked, setIsChatBlocked] = useState(false);
  const [messages, setMessages] = useState([]);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [isAttachmentSheetVisible, setIsAttachmentSheetVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const isLiveGroup = group.kind === 'live';

  useEffect(() => {
    if (auth?.profile) {
      setProfile(auth.profile);
    }
  }, [auth?.profile]);

  useEffect(() => {
    if (!isRecording) {
      return undefined;
    }

    const timer = setInterval(() => {
      setRecordingSeconds((current) => current + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isRecording]);

  function MapsToGroupDetails() {
    console.log('MapsToGroupDetails', {
      groupId: group.id,
      groupName: group.name,
    });
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable
          onPress={MapsToGroupDetails}
          style={({ pressed }) => [
            styles.headerTitleButton,
            pressed && styles.headerTitleButtonPressed,
          ]}
        >
          <Text style={styles.headerTitleText} numberOfLines={1}>
            {group.name}
          </Text>
          <Text style={styles.headerSubtitleText} numberOfLines={1}>
            {isLiveGroup
              ? isChatBlocked
                ? 'Paused'
                : 'Tap for group details'
              : 'Tap for group details'}
          </Text>
        </Pressable>
      ),
    });
  }, [group.id, group.name, isChatBlocked, isLiveGroup, navigation]);

  useEffect(() => {
    if (!isFocused || !isLiveGroup) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      if (!isLiveGroup) {
        setMessages([]);
        setPinnedMessage(null);
        setIsChatBlocked(false);
        setLoading(false);
      }

      return undefined;
    }

    hydrateChatRoom();

    pollTimerRef.current = setInterval(() => {
      hydrateChatRoom(false, true);
    }, 8000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isFocused, isLiveGroup, auth?.profile?.email]);

  useEffect(() => {
    if (!messages.length) {
      return;
    }

    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd?.({ animated: true });
    }, 120);

    return () => clearTimeout(timer);
  }, [messages.length]);

  const roomSummary = useMemo(() => {
    const participants = new Set();

    messages.forEach((item) => {
      const email = String(item.senderEmail || '').trim().toLowerCase();
      if (email) {
        participants.add(email);
      }
    });

    return {
      participantCount: participants.size || (isLiveGroup ? 1 : 0),
    };
  }, [messages, isLiveGroup]);

  async function hydrateChatRoom(isPullToRefresh = false, isSilent = false) {
    if (!isLiveGroup) {
      return;
    }

    if (isPullToRefresh) {
      setRefreshing(true);
    } else if (!isSilent) {
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
          console.error('Chat room profile refresh failed.', error?.message || error);
        }
      }

      const [settingsResult, historyResult] = await Promise.allSettled([
        apiClient.get('chat/settings'),
        apiClient.get('chat/history'),
      ]);

      setIsChatBlocked(
        settingsResult.status === 'fulfilled' && settingsResult.value.data?.success
          ? Boolean(settingsResult.value.data.isChatBlocked)
          : false
      );
      setMessages(
        historyResult.status === 'fulfilled' && historyResult.value.data?.success
          ? historyResult.value.data.messages || []
          : []
      );
      setPinnedMessage(
        historyResult.status === 'fulfilled' && historyResult.value.data?.success
          ? historyResult.value.data.pinnedMessage || null
          : null
      );
    } catch (error) {
      if (!isSilent) {
        Alert.alert(
          'Could not load chat',
          getApiErrorMessage(error, 'Please try again in a moment.')
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleSendMessage() {
    const text = draftMessage.trim();

    if (!text || !isLiveGroup || isRecording) {
      return;
    }

    if (!profile?.email) {
      Alert.alert('Profile missing', 'Please sign in again before sending a message.');
      return;
    }

    if (isChatBlocked) {
      Alert.alert('Chat paused', 'Admin has temporarily paused this group chat.');
      return;
    }

    setSending(true);

    try {
      const response = await apiClient.post('chat/send', {
        senderName: profile?.name || 'Staff Member',
        senderEmail: profile.email,
        role: 'Staff',
        message: text,
        profilePhoto: profile?.profilePhoto || '',
      });
      const payload = response.data || {};

      if (!payload.success || !payload.chatMessage) {
        throw new Error(payload.message || 'Message could not be sent.');
      }

      setDraftMessage('');
      setMessages((current) => [...current, payload.chatMessage]);
    } catch (error) {
      Alert.alert(
        'Send failed',
        getApiErrorMessage(error, 'Unable to send your message right now.')
      );
    } finally {
      setSending(false);
    }
  }

  function openAttachmentSheet() {
    setIsAttachmentSheetVisible(true);
  }

  function closeAttachmentSheet() {
    setIsAttachmentSheetVisible(false);
  }

  async function handleAttachmentAction(actionKey) {
    closeAttachmentSheet();

    try {
      if (actionKey === 'take-photo') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission needed', 'Camera access is required to take a photo.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
        if (!result.canceled && result.assets?.[0]) {
          console.log('📷 Camera photo URI:', result.assets[0].uri);
        }
      } else if (actionKey === 'choose-gallery') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission needed', 'Gallery access is required to choose an image.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
        if (!result.canceled && result.assets?.[0]) {
          console.log('🖼️ Gallery image URI:', result.assets[0].uri);
        }
      } else if (actionKey === 'upload-document') {
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets?.[0]) {
          console.log('📄 Document URI:', result.assets[0].uri);
          console.log('📄 Document name:', result.assets[0].name);
        }
      }
    } catch (error) {
      console.error('Attachment picker error:', error?.message || error);
      Alert.alert('Picker error', 'Could not open the file picker.');
    }
  }

  function handleToggleRecording() {
    if (isRecording) {
      setIsRecording(false);
      setRecordingSeconds(0);
      return;
    }

    setIsAttachmentSheetVisible(false);
    setIsRecording(true);
    setRecordingSeconds(0);
  }

  function handleCancelRecording() {
    setIsRecording(false);
    setRecordingSeconds(0);
  }

  function jumpToPinnedMessage() {
    const pinnedId = pinnedMessage?._id;
    if (!pinnedId) {
      return;
    }

    const index = messages.findIndex((item) => item._id === pinnedId);
    if (index === -1) {
      return;
    }

    listRef.current?.scrollToIndex?.({
      index,
      animated: true,
      viewPosition: 0.35,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <View style={styles.screenContent}>
        <View style={styles.threadWrap}>
          {isLiveGroup ? (
            <PinnedMessageStrip
              message={pinnedMessage}
              onPress={jumpToPinnedMessage}
            />
          ) : null}

          <FlatList
            ref={listRef}
            style={styles.threadList}
            data={messages}
            keyExtractor={(item, index) => item._id || `${item.senderEmail}-${item.date}-${index}`}
            renderItem={({ item }) => (
              <MessageBubble item={item} currentEmail={profile?.email} />
            )}
            contentContainerStyle={[
              styles.threadContent,
              !messages.length && styles.threadContentEmpty,
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              isLiveGroup ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => hydrateChatRoom(true)}
                  tintColor={COLORS.accent}
                />
              ) : undefined
            }
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            onScrollToIndexFailed={() => {
              listRef.current?.scrollToEnd?.({ animated: true });
            }}
            ListHeaderComponent={
              isLiveGroup ? (
                <View style={styles.roomMetaRow}>
                  <Text style={styles.roomMetaText}>
                    {roomSummary.participantCount} participant
                    {roomSummary.participantCount === 1 ? '' : 's'}
                  </Text>
                  <ToneBadge
                    icon={isChatBlocked ? 'pause-circle-outline' : 'flash-outline'}
                    label={isChatBlocked ? 'Paused' : 'Live'}
                    tone={isChatBlocked ? 'danger' : 'success'}
                  />
                </View>
              ) : null
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyStateIconWrap}>
                    <Ionicons
                      name={isLiveGroup ? 'chatbubble-ellipses-outline' : 'folder-open-outline'}
                      size={22}
                      color={COLORS.accent}
                    />
                  </View>
                  <Text style={styles.emptyStateTitle}>
                    {isLiveGroup ? 'No messages yet' : `${group.name} is getting ready`}
                  </Text>
                  <Text style={styles.emptyStateBody}>
                    {isLiveGroup
                      ? 'Start the first conversation and the room will behave like a native team thread.'
                      : 'This is a placeholder project room so your chat architecture can expand cleanly into multiple groups later.'}
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              loading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="small" color={COLORS.accent} />
                </View>
              ) : null
            }
          />
        </View>

        <View
          style={[
            styles.composerShell,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          <View style={styles.composerRow}>
            <Pressable
              onPress={openAttachmentSheet}
              style={({ pressed }) => [
                styles.iconAction,
                pressed && styles.iconActionPressed,
              ]}
            >
              <Ionicons name="attach-outline" size={18} color={COLORS.textSecondary} />
            </Pressable>

            <Pressable
              onPress={openAttachmentSheet}
              style={({ pressed }) => [
                styles.iconAction,
                pressed && styles.iconActionPressed,
              ]}
            >
              <Ionicons name="camera-outline" size={18} color={COLORS.textSecondary} />
            </Pressable>

            <Pressable
              onPress={handleToggleRecording}
              style={({ pressed }) => [
                styles.iconAction,
                isRecording && styles.iconActionRecording,
                pressed && styles.iconActionPressed,
              ]}
            >
              <Ionicons
                name={isRecording ? 'stop-circle-outline' : 'mic-outline'}
                size={18}
                color={isRecording ? COLORS.danger : COLORS.textSecondary}
              />
            </Pressable>

            {isRecording ? (
              <View style={styles.recordingWrap}>
                <View style={styles.recordingIndicator} />
                <View style={styles.recordingCopy}>
                  <Text style={styles.recordingTitle}>Recording...</Text>
                  <Text style={styles.recordingTimer}>
                    {formatRecordingTime(recordingSeconds)}
                  </Text>
                </View>
                <Pressable
                  onPress={handleCancelRecording}
                  style={({ pressed }) => [
                    styles.recordingCancelButton,
                    pressed && styles.recordingCancelButtonPressed,
                  ]}
                >
                  <Ionicons
                    name="close-outline"
                    size={18}
                    color={COLORS.textSecondary}
                  />
                </Pressable>
              </View>
            ) : (
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={draftMessage}
                  onChangeText={setDraftMessage}
                  editable={isLiveGroup && !isChatBlocked && !sending}
                  multiline
                  placeholder={
                    isLiveGroup
                      ? isChatBlocked
                        ? 'Chat is paused by Admin'
                        : 'Type a message...'
                      : 'This room is not live yet'
                  }
                  placeholderTextColor={COLORS.textTertiary}
                  textAlignVertical="center"
                />
              </View>
            )}

            <Pressable
              onPress={handleSendMessage}
              disabled={
                !draftMessage.trim() ||
                sending ||
                !isLiveGroup ||
                isChatBlocked ||
                isRecording
              }
              style={({ pressed }) => [
                styles.sendButton,
                (!draftMessage.trim() ||
                  sending ||
                  !isLiveGroup ||
                  isChatBlocked ||
                  isRecording) &&
                  styles.sendButtonDisabled,
                pressed &&
                  draftMessage.trim() &&
                  !sending &&
                  isLiveGroup &&
                  !isChatBlocked &&
                  !isRecording &&
                  styles.sendButtonPressed,
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="send" size={18} color={COLORS.white} />
              )}
            </Pressable>
          </View>
        </View>
      </View>

      <AttachmentSheet
        visible={isAttachmentSheetVisible}
        onClose={closeAttachmentSheet}
        onSelectAction={handleAttachmentAction}
        bottomInset={insets.bottom}
      />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screenContent: {
    flex: 1,
    minHeight: 0,
  },
  headerTitleButton: {
    alignItems: 'flex-start',
    gap: 1,
    maxWidth: 220,
  },
  headerTitleButtonPressed: {
    opacity: 0.82,
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSubtitleText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  threadWrap: {
    flex: 1,
    minHeight: 0,
  },
  threadList: {
    flex: 1,
  },
  pinnedStrip: {
    marginHorizontal: SIZES.lg,
    marginTop: SIZES.md,
    marginBottom: SIZES.sm,
    borderRadius: 16,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(78, 123, 255, 0.18)',
    paddingHorizontal: SIZES.lg,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  pinnedStripPressed: {
    opacity: 0.82,
  },
  pinnedStripText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  roomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SIZES.md,
    marginBottom: SIZES.md,
    paddingHorizontal: 2,
  },
  roomMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  threadContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.xl,
    gap: SIZES.md,
  },
  threadContentEmpty: {
    justifyContent: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
    maxWidth: '100%',
  },
  messageRowMine: {
    alignSelf: 'flex-end',
  },
  messageRowOther: {
    alignSelf: 'flex-start',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  avatarFallbackText: {
    fontSize: 12,
    fontWeight: '800',
  },
  messageColumn: {
    maxWidth: '82%',
    gap: 5,
  },
  messageColumnMine: {
    alignItems: 'flex-end',
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingHorizontal: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  messageBubble: {
    borderRadius: 22,
    paddingHorizontal: SIZES.lg,
    paddingVertical: 12,
    gap: SIZES.sm,
  },
  messageBubbleMine: {
    backgroundColor: COLORS.accent,
    borderBottomRightRadius: 8,
  },
  messageBubbleOther: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 8,
    ...SHADOWS.soft,
  },
  replyCard: {
    borderRadius: 14,
    paddingHorizontal: SIZES.md,
    paddingVertical: 10,
    gap: 4,
  },
  replyCardMine: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  replyCardOther: {
    backgroundColor: COLORS.surfaceAlt,
  },
  replyLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  replyLabelMine: {
    color: 'rgba(255,255,255,0.88)',
  },
  replyLabelOther: {
    color: COLORS.primary,
  },
  replyText: {
    fontSize: 12,
    lineHeight: 17,
  },
  replyTextMine: {
    color: 'rgba(255,255,255,0.8)',
  },
  replyTextOther: {
    color: COLORS.textSecondary,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextMine: {
    color: COLORS.white,
  },
  messageTextOther: {
    color: COLORS.text,
  },
  messageTime: {
    fontSize: 11,
    paddingHorizontal: 4,
  },
  messageTimeMine: {
    color: COLORS.textTertiary,
    textAlign: 'right',
  },
  messageTimeOther: {
    color: COLORS.textTertiary,
  },
  imageAttachmentWrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageAttachment: {
    width: 190,
    height: 150,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
  },
  attachmentPressed: {
    opacity: 0.84,
  },
  attachmentCard: {
    minWidth: 180,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    padding: SIZES.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  attachmentCardMine: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  attachmentIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  attachmentIconWrapMine: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  attachmentCopy: {
    flex: 1,
    gap: 2,
  },
  attachmentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  attachmentTitleMine: {
    color: COLORS.white,
  },
  attachmentSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  attachmentSubtitleMine: {
    color: 'rgba(255,255,255,0.72)',
  },
  composerShell: {
    flexShrink: 0,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.md,
    paddingTop: SIZES.sm,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SIZES.sm,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.sm,
    ...SHADOWS.soft,
  },
  iconAction: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  iconActionRecording: {
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(211, 91, 91, 0.18)',
  },
  iconActionPressed: {
    opacity: 0.8,
  },
  inputWrap: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  input: {
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.text,
  },
  recordingWrap: {
    flex: 1,
    minHeight: 44,
    borderRadius: 18,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(211, 91, 91, 0.18)',
    paddingHorizontal: SIZES.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  recordingIndicator: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: COLORS.danger,
  },
  recordingCopy: {
    flex: 1,
    gap: 1,
  },
  recordingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
  },
  recordingTimer: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  recordingCancelButton: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  recordingCancelButtonPressed: {
    opacity: 0.82,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
  },
  sendButtonPressed: {
    opacity: 0.84,
  },
  emptyState: {
    alignItems: 'center',
    gap: SIZES.sm,
    paddingHorizontal: SIZES.xl,
  },
  emptyStateIconWrap: {
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
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SIZES.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: SIZES.radiusPill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10, 18, 32, 0.32)',
  },
  sheetBackdrop: {
    flex: 1,
  },
  sheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.xl,
    paddingTop: SIZES.md,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    borderRadius: 5,
    backgroundColor: COLORS.borderStrong || COLORS.border,
    alignSelf: 'center',
    marginBottom: SIZES.lg,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    marginTop: SIZES.xs,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  sheetActionGroup: {
    marginTop: SIZES.xl,
    gap: SIZES.sm,
  },
  sheetActionButton: {
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
  sheetActionButtonPressed: {
    opacity: 0.82,
  },
  sheetActionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  sheetCancelButton: {
    marginTop: SIZES.lg,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelButtonPressed: {
    opacity: 0.82,
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
});
