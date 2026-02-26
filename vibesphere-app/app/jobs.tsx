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

interface Job {
    _id: string;
    title: string;
    type: string;
    location: string;
    description: string;
    date: string;
}

const JOB_TYPES = ['Full-time', 'Part-time', 'Internship', 'Freelance'];
const LOCATIONS = ['Remote', 'On-site', 'Hybrid'];

const TYPE_COLORS: Record<string, string> = {
    'Full-time': Colors.success,
    'Internship': Colors.warning,
    'Freelance': '#ec4899',
    'Part-time': '#3b82f6',
};

export default function JobsScreen() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [jobTitle, setJobTitle] = useState('');
    const [jobType, setJobType] = useState('Full-time');
    const [jobLocation, setJobLocation] = useState('Remote');
    const [jobDesc, setJobDesc] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { checkAuth(); fetchJobs(); }, []);

    const checkAuth = async () => {
        const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
        if (!token) router.replace('/');
    };

    const fetchJobs = async () => {
        try {
            const res = await fetch(API.jobs, { headers: ADMIN_HEADERS });
            const data = await res.json();
            if (data.success) setJobs(data.jobs);
        } catch { } finally { setLoading(false); setRefreshing(false); }
    };

    const onRefresh = useCallback(() => { setRefreshing(true); fetchJobs(); }, []);

    const postJob = async () => {
        if (!jobTitle.trim() || !jobDesc.trim()) {
            Alert.alert('Missing Fields', 'Title and description are required.'); return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(API.addJob, {
                method: 'POST', headers: ADMIN_HEADERS,
                body: JSON.stringify({ title: jobTitle, type: jobType, location: jobLocation, description: jobDesc }),
            });
            const data = await res.json();
            if (data.success) {
                Alert.alert('🚀 Job Posted!', `"${jobTitle}" is now live.`);
                setJobTitle(''); setJobDesc(''); setJobType('Full-time'); setJobLocation('Remote');
                fetchJobs();
            } else { Alert.alert('Failed', data.error || 'Could not post job.'); }
        } catch { Alert.alert('Error', 'Network error.'); }
        finally { setSubmitting(false); }
    };

    const deleteJob = (job: Job) => {
        Alert.alert('Delete Job', `Remove "${job.title}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await fetch(API.deleteJob(job._id), { method: 'DELETE', headers: ADMIN_HEADERS });
                        const data = await res.json();
                        if (data.success) fetchJobs();
                    } catch { Alert.alert('Error', 'Network error.'); }
                }
            }
        ]);
    };

    const renderJob = ({ item }: { item: Job }) => (
        <View style={styles.card}>
            <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.jobTitle}>{item.title}</Text>
                    <View style={styles.tagsRow}>
                        <View style={[styles.tag, { borderColor: TYPE_COLORS[item.type] || Colors.border }]}>
                            <Text style={[styles.tagText, { color: TYPE_COLORS[item.type] || Colors.textMuted }]}>{item.type}</Text>
                        </View>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>📍 {item.location}</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteJob(item)}>
                    <Text style={styles.deleteBtnText}>🗑</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.jobDesc} numberOfLines={3}>{item.description}</Text>
            <Text style={styles.jobDate}>
                Posted {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                <Text style={styles.headerTitle}>💼 Careers</Text>
                <Text style={styles.count}>{jobs.length} active</Text>
            </View>

            <FlatList
                data={jobs}
                keyExtractor={i => i._id}
                renderItem={renderJob}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                ListEmptyComponent={
                    loading
                        ? <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
                        : <View style={styles.center}><Text style={styles.emptyText}>No active job postings.</Text></View>
                }
                ListHeaderComponent={
                    <View style={styles.form}>
                        <Text style={styles.formTitle}>Post a New Job</Text>
                        <Text style={styles.fieldLabel}>Job Title</Text>
                        <TextInput style={styles.input} value={jobTitle} onChangeText={setJobTitle} placeholder="e.g. Video Editor" placeholderTextColor={Colors.textFaint} selectionColor={Colors.primary} />
                        <Text style={styles.fieldLabel}>Job Type</Text>
                        <View style={styles.chipRow}>
                            {JOB_TYPES.map(t => (
                                <TouchableOpacity key={t} style={[styles.chip, jobType === t && styles.chipActive]} onPress={() => setJobType(t)}>
                                    <Text style={[styles.chipText, jobType === t && styles.chipTextActive]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.fieldLabel}>Location</Text>
                        <View style={styles.chipRow}>
                            {LOCATIONS.map(l => (
                                <TouchableOpacity key={l} style={[styles.chip, jobLocation === l && styles.chipActive]} onPress={() => setJobLocation(l)}>
                                    <Text style={[styles.chipText, jobLocation === l && styles.chipTextActive]}>{l}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.fieldLabel}>Description</Text>
                        <TextInput style={[styles.input, styles.textarea]} value={jobDesc} onChangeText={setJobDesc} placeholder="Short description of the role..." placeholderTextColor={Colors.textFaint} multiline numberOfLines={4} selectionColor={Colors.primary} />
                        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={postJob} disabled={submitting}>
                            <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Post Job 🚀</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                        <Text style={styles.sectionLabel}>ACTIVE LISTINGS</Text>
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
    textarea: { minHeight: 100, textAlignVertical: 'top' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
    chip: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
    chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow },
    chipText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' },
    chipTextActive: { color: Colors.primary },
    submitBtn: { borderRadius: Radius.md, overflow: 'hidden', marginBottom: Spacing.xl },
    submitGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
    submitText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
    sectionLabel: { color: Colors.textFaint, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 2, marginBottom: Spacing.md },
    listContent: { paddingBottom: Spacing.xxl },
    center: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    emptyText: { color: Colors.textMuted, fontSize: FontSize.md, textAlign: 'center', padding: Spacing.lg },
    card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
    jobTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.xs },
    tagsRow: { flexDirection: 'row', gap: Spacing.sm },
    tag: { borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full },
    tagText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
    jobDesc: { color: Colors.textMuted, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.sm },
    jobDate: { color: Colors.textFaint, fontSize: FontSize.xs },
    deleteBtn: { backgroundColor: Colors.dangerBg, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm, marginLeft: Spacing.sm },
    deleteBtnText: { fontSize: FontSize.md },
});
