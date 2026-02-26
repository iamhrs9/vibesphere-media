import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BASE_URL } from '../../utils/api';

interface Notice {
    _id: string;
    title: string;
    message: string;
    author: string;
    date: string;
}

export default function NoticesScreen() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        try {
            const response = await fetch(`${BASE_URL}/notices`);
            const data = await response.json();
            if (data.success) {
                setNotices(data.notices);
            }
        } catch (e) {
            console.error("Error fetching notices", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#7d5fff" />
                <Text style={styles.loaderText}>Loading Notices...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar style="dark" />
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>📢 Official Notice Board</Text>
                </View>

                {notices.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No new notices at the moment.</Text>
                    </View>
                ) : (
                    notices.map((notice, index) => {
                        const isPurple = index % 2 === 0;
                        return (
                            <View key={notice._id.toString()} style={[styles.noticeCard, { borderLeftColor: isPurple ? '#6c63ff' : '#10b981' }]}>
                                <Text style={styles.noticeDate}>{new Date(notice.date).toLocaleString()}</Text>
                                <Text style={styles.noticeTitle}>{notice.title}</Text>
                                <Text style={styles.noticeMessage}>{notice.message}</Text>
                                <View style={styles.noticeAuthorBadge}>
                                    <Text style={styles.noticeAuthorText}>By {notice.author}</Text>
                                </View>
                            </View>
                        );
                    })
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f4f7fe' },
    container: { flex: 1 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f7fe' },
    loaderText: { marginTop: 15, fontSize: 16, color: '#475569', fontWeight: '500' },
    contentContainer: { padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 20 },
    sectionHeader: { marginBottom: 20 },
    sectionTitle: { fontSize: 22, color: '#1e293b', fontWeight: '700' },
    emptyState: { padding: 40, alignItems: 'center' },
    emptyStateText: { fontSize: 16, color: '#64748b', fontWeight: '500' },
    noticeCard: { backgroundColor: '#ffffff', padding: 25, borderRadius: 15, marginBottom: 20, borderLeftWidth: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 15, elevation: 2 },
    noticeDate: { fontSize: 12, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
    noticeTitle: { fontSize: 18, color: '#1e293b', fontWeight: '700', marginBottom: 8 },
    noticeMessage: { color: '#475569', fontSize: 15, lineHeight: 22, marginBottom: 15 },
    noticeAuthorBadge: { alignSelf: 'flex-start', backgroundColor: '#f1f5f9', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20 },
    noticeAuthorText: { fontSize: 13, fontWeight: '600', color: '#111' },
});
