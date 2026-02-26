import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, Alert, ScrollView, TextInput
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { API, ADMIN_HEADERS, STORAGE_KEY_TOKEN } from '@/constants/api';

interface Notice {
    _id: string;
    title: string;
    message: string;
    date: string;
}

export default function NoticesScreen() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        checkAuth();
        fetchNotices();
    }, []);

    const checkAuth = async () => {
        const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
        if (!token) router.replace('/');
    };

    const fetchNotices = async () => {
        try {
            const res = await fetch(API.notices, { headers: ADMIN_HEADERS });
            const data = await res.json();
            if (data.success) setNotices(data.notices);
        } catch { } finally { setLoading(false); setRefreshing(false); }
    };

    const onRefresh = useCallback(() => { setRefreshing(true); fetchNotices(); }, []);

    const postNotice = async () => {
        if (!title.trim() || !message.trim()) {
            Alert.alert('Missing Fields', 'Both title and message are required.'); return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(API.addNotice, {
                method: 'POST', headers: ADMIN_HEADERS,
                body: JSON.stringify({ title, message }),
            });
            const data = await res.json();
            if (data.success) {
                Alert.alert('📢 Notice Posted!', 'Staff board updated.');
                setTitle(''); setMessage('');
                fetchNotices();
            } else { Alert.alert('Failed', data.error || 'Could not post notice.'); }
        } catch { Alert.alert('Error', 'Network error.'); }
        finally { setSubmitting(false); }
    };

    const deleteNotice = (notice: Notice) => {
        Alert.alert('Delete Notice', `Delete "${notice.title}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await fetch(API.deleteNotice(notice._id), { method: 'DELETE', headers: ADMIN_HEADERS });
                        const data = await res.json();
                        if (data.success) fetchNotices();
                    } catch { Alert.alert('Error', 'Network error.'); }
                }
            }
        ]);
    };

    const renderNotice = ({ item }: { item: Notice }) => (
        <View style={styles.card}>
            <View style={styles.cardTop}>
                <Text style={styles.noticeTitle}>{item.title}</Text>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteNotice(item)}>
                    <Text style={styles.deleteBtnText}>🗑</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.noticeMsg}>{item.message}</Text>
            <Text style={styles.noticeDate}>
                🗓 {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <LinearGradient colors={['#0d0d1a', '#0a0a0a']} style={StyleSheet.absoluteFill} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>📢 Notices</Text>
                <Text style={styles.count}>{notices.length} posted</Text>
            </View>

            <FlatList
                data={notices}
                keyExtractor={i => i._id}
                renderItem={renderNotice}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                ListEmptyComponent={
                    loading
                        ? <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
                        : <View style={styles.center}><Text style={styles.emptyText}>No notices posted yet.</Text></View>
                }
                ListHeaderComponent={
                    <View style={styles.form}>
                        <Text style={styles.formTitle}>Post a Notice</Text>
                        <Text style={styles.fieldLabel}>Title</Text>
                        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Target Update — Feb" placeholderTextColor={Colors.textFaint} selectionColor={Colors.primary} />
                        <Text style={styles.fieldLabel}>Message</Text>
                        <TextInput
                            style={[styles.input, styles.textarea]} value={message} onChangeText={setMessage}
                            placeholder="Type your full notice here..." placeholderTextColor={Colors.textFaint}
                            multiline numberOfLines={5} selectionColor={Colors.primary}
                        />
                        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={postNotice} disabled={submitting}>
                            <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Send Notice 🔔</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                        <Text style={styles.sectionLabel}>POSTED NOTICES</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
    backBtn: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm },
    backText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
    headerTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '800' },
    count: { color: Colors.textMuted, fontSize: FontSize.sm },
    form: { padding: Spacing.lg, paddingBottom: 0 },
    formTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '800', marginBottom: Spacing.lg },
    fieldLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.xs },
    input: { backgroundColor: Colors.surfaceAlt, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, minHeight: 52, marginBottom: Spacing.md },
    textarea: { minHeight: 120, textAlignVertical: 'top' },
    submitBtn: { borderRadius: Radius.md, overflow: 'hidden', marginBottom: Spacing.xl },
    submitGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
    submitText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
    sectionLabel: { color: Colors.textFaint, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 2, marginBottom: Spacing.md },
    listContent: { paddingBottom: Spacing.xxl },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    emptyText: { color: Colors.textMuted, fontSize: FontSize.md, textAlign: 'center', padding: Spacing.lg },
    card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
    noticeTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700', flex: 1, marginRight: Spacing.sm },
    noticeMsg: { color: Colors.textMuted, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.sm },
    noticeDate: { color: Colors.textFaint, fontSize: FontSize.xs },
    deleteBtn: { backgroundColor: Colors.dangerBg, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm },
    deleteBtnText: { fontSize: FontSize.md },
});
