import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, Alert, Modal, ScrollView, TextInput
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { API, ADMIN_HEADERS, STORAGE_KEY_TOKEN } from '@/constants/api';

type Tab = 'list' | 'add' | 'assign';

interface StaffMember {
    _id: string;
    empId: string;
    name: string;
    email: string;
    role: string;
}

const ROLES = ['Sales Executive', 'Manager', 'Editor'];

export default function StaffScreen() {
    const [activeTab, setActiveTab] = useState<Tab>('list');
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Add staff form
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Sales Executive');
    const [submitting, setSubmitting] = useState(false);

    // Assign lead form
    const [leadClient, setLeadClient] = useState('');
    const [leadContact, setLeadContact] = useState('');
    const [leadService, setLeadService] = useState('Instagram Growth');
    const [leadAssignTo, setLeadAssignTo] = useState('');
    const [assigningLead, setAssigningLead] = useState(false);

    // Performance modal
    const [perfModal, setPerfModal] = useState(false);
    const [perfData, setPerfData] = useState<any>(null);
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

    useEffect(() => {
        checkAuth();
        fetchStaff();
    }, []);

    const checkAuth = async () => {
        const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
        if (!token) router.replace('/');
    };

    const fetchStaff = async () => {
        try {
            const res = await fetch(API.staff, { headers: ADMIN_HEADERS });
            const data = await res.json();
            if (data.success) setStaff(data.staff);
        } catch { } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => { setRefreshing(true); fetchStaff(); }, []);

    const addStaff = async () => {
        if (!name.trim() || !email.trim() || !password.trim()) {
            Alert.alert('Missing Fields', 'Please fill all fields.'); return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(API.addStaff, {
                method: 'POST', headers: ADMIN_HEADERS,
                body: JSON.stringify({ name, email, password, role }),
            });
            const data = await res.json();
            if (data.success) {
                Alert.alert('✅ Staff Added', data.message);
                setName(''); setEmail(''); setPassword(''); setRole('Sales Executive');
                setActiveTab('list'); fetchStaff();
            } else {
                Alert.alert('Failed', data.error || 'Could not add staff.');
            }
        } catch { Alert.alert('Error', 'Network error.'); }
        finally { setSubmitting(false); }
    };

    const deleteStaff = (member: StaffMember) => {
        Alert.alert('Delete Staff', `Remove ${member.name} (${member.empId})?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await fetch(API.deleteStaff(member._id), { method: 'DELETE', headers: ADMIN_HEADERS });
                        const data = await res.json();
                        if (data.success) { fetchStaff(); Alert.alert('Deleted', `${member.name} removed.`); }
                    } catch { Alert.alert('Error', 'Network error.'); }
                }
            }
        ]);
    };

    const viewPerformance = async (member: StaffMember) => {
        setSelectedStaff(member);
        setPerfModal(true);
        try {
            const res = await fetch(API.staffPerformance, { headers: ADMIN_HEADERS });
            const data = await res.json();
            if (data.success) setPerfData(data.performance[member.email] || null);
        } catch { setPerfData(null); }
    };

    const assignLead = async () => {
        if (!leadClient.trim() || !leadContact.trim() || !leadAssignTo) {
            Alert.alert('Missing Fields', 'Fill all fields and select a staff member.'); return;
        }
        setAssigningLead(true);
        try {
            const res = await fetch(API.addTask, {
                method: 'POST', headers: ADMIN_HEADERS,
                body: JSON.stringify({ clientName: leadClient, contactNumber: leadContact, servicePitch: leadService, assignedTo: leadAssignTo }),
            });
            const data = await res.json();
            if (data.success) {
                Alert.alert('✅ Lead Assigned!', `Lead sent to ${leadAssignTo}`);
                setLeadClient(''); setLeadContact(''); setLeadAssignTo('');
            } else { Alert.alert('Failed', data.error || 'Could not assign lead.'); }
        } catch { Alert.alert('Error', 'Network error.'); }
        finally { setAssigningLead(false); }
    };

    const renderStaffCard = ({ item }: { item: StaffMember }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.staffName}>{item.name}</Text>
                    <Text style={styles.staffEmail}>{item.email}</Text>
                </View>
                <View style={styles.empBadge}>
                    <Text style={styles.empBadgeText}>{item.empId}</Text>
                </View>
            </View>
            <View style={styles.cardFooter}>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{item.role}</Text>
                </View>
                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.perfBtn} onPress={() => viewPerformance(item)}>
                        <Text style={styles.perfBtnText}>📊 Stats</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteStaff(item)}>
                        <Text style={styles.deleteBtnText}>🗑</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const SERVICES = ['Instagram Growth', 'Web Development', 'Combo Package'];

    return (
        <SafeAreaView style={styles.safe}>
            <LinearGradient colors={['#0d0d1a', '#0a0a0a']} style={StyleSheet.absoluteFill} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Staff Management</Text>
                <Text style={styles.count}>{staff.length} members</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                {(['list', 'add', 'assign'] as Tab[]).map(tab => (
                    <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab === 'list' ? '👥 Staff' : tab === 'add' ? '➕ Add' : '🎯 Assign Lead'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {activeTab === 'list' && (
                loading ? (
                    <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
                ) : (
                    <FlatList
                        data={staff}
                        keyExtractor={i => i._id}
                        renderItem={renderStaffCard}
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                        ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No staff members yet.</Text></View>}
                    />
                )
            )}

            {activeTab === 'add' && (
                <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
                    <Text style={styles.formTitle}>Add New Staff Member</Text>
                    {[
                        { label: 'Full Name', val: name, set: setName, placeholder: 'e.g. Rahul Sharma' },
                        { label: 'Login Email', val: email, set: setEmail, placeholder: 'staff@email.com', keyboard: 'email-address' as any },
                        { label: 'Password', val: password, set: setPassword, placeholder: 'Set a strong password', secure: true },
                    ].map(f => (
                        <View key={f.label} style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>{f.label}</Text>
                            <TextInput style={styles.input} value={f.val} onChangeText={f.set} placeholder={f.placeholder} placeholderTextColor={Colors.textFaint} secureTextEntry={f.secure} keyboardType={f.keyboard} autoCapitalize="none" selectionColor={Colors.primary} />
                        </View>
                    ))}
                    <Text style={styles.fieldLabel}>Role</Text>
                    <View style={styles.roleRow}>
                        {ROLES.map(r => (
                            <TouchableOpacity key={r} style={[styles.roleChip, role === r && styles.roleChipActive]} onPress={() => setRole(r)}>
                                <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>{r}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={addStaff} disabled={submitting}>
                        <LinearGradient colors={['#6c63ff', '#5a52d5']} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Staff ID 🚀</Text>}
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            )}

            {activeTab === 'assign' && (
                <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
                    <Text style={styles.formTitle}>Assign New Lead</Text>
                    {[
                        { label: 'Client / Business Name', val: leadClient, set: setLeadClient, placeholder: 'e.g. Sharma Enterprises' },
                        { label: 'Contact (Phone/Insta)', val: leadContact, set: setLeadContact, placeholder: '+91 XXXXX XXXXX' },
                    ].map(f => (
                        <View key={f.label} style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>{f.label}</Text>
                            <TextInput style={styles.input} value={f.val} onChangeText={f.set} placeholder={f.placeholder} placeholderTextColor={Colors.textFaint} selectionColor={Colors.primary} />
                        </View>
                    ))}
                    <Text style={styles.fieldLabel}>Service to Pitch</Text>
                    <View style={styles.roleRow}>
                        {SERVICES.map(s => (
                            <TouchableOpacity key={s} style={[styles.roleChip, leadService === s && styles.roleChipActive]} onPress={() => setLeadService(s)}>
                                <Text style={[styles.roleChipText, leadService === s && styles.roleChipTextActive]}>{s}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>Assign To</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
                        {staff.map(m => (
                            <TouchableOpacity key={m._id} style={[styles.staffChip, leadAssignTo === m.email && styles.staffChipActive]} onPress={() => setLeadAssignTo(m.email)}>
                                <Text style={[styles.staffChipText, leadAssignTo === m.email && styles.staffChipTextActive]}>{m.name}</Text>
                                <Text style={styles.staffChipSub}>{m.role}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <TouchableOpacity style={[styles.submitBtn, assigningLead && { opacity: 0.5 }]} onPress={assignLead} disabled={assigningLead}>
                        <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            {assigningLead ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Assign Lead 🎯</Text>}
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* Performance Modal */}
            <Modal visible={perfModal} transparent animationType="slide" onRequestClose={() => setPerfModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>📊 {selectedStaff?.name}</Text>
                        <Text style={styles.modalSub}>{selectedStaff?.empId} · {selectedStaff?.role}</Text>
                        {perfData ? (
                            <View style={styles.statsRow}>
                                {[
                                    { label: 'Total Leads', val: perfData.total, color: Colors.primary },
                                    { label: 'Completed', val: perfData.completed, color: Colors.success },
                                    { label: 'Pending', val: perfData.pending, color: Colors.warning },
                                ].map(s => (
                                    <View key={s.label} style={styles.statBox}>
                                        <Text style={[styles.statNum, { color: s.color }]}>{s.val}</Text>
                                        <Text style={styles.statLabel}>{s.label}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.emptyText}>No performance data yet.</Text>
                        )}
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { setPerfModal(false); setPerfData(null); }}>
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border },
    tab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
    tabText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' },
    tabTextActive: { color: Colors.primary },
    listContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    emptyText: { color: Colors.textMuted, fontSize: FontSize.md, textAlign: 'center' },
    card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
    avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryGlow, borderWidth: 1, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: '800' },
    staffName: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700' },
    staffEmail: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
    empBadge: { backgroundColor: Colors.border, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
    empBadgeText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
    roleBadge: { backgroundColor: Colors.primaryGlow, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
    roleBadgeText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700' },
    cardActions: { flexDirection: 'row', gap: Spacing.sm },
    perfBtn: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.sm },
    perfBtnText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },
    deleteBtn: { backgroundColor: Colors.dangerBg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.sm },
    deleteBtnText: { fontSize: FontSize.md },
    // Form
    formScroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
    formTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '800', marginBottom: Spacing.lg },
    fieldGroup: { marginBottom: Spacing.md },
    fieldLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.xs },
    input: { backgroundColor: Colors.surfaceAlt, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, minHeight: 52 },
    roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
    roleChip: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
    roleChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow },
    roleChipText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' },
    roleChipTextActive: { color: Colors.primary },
    staffChip: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, borderRadius: Radius.md, marginRight: Spacing.sm, minWidth: 100, alignItems: 'center' },
    staffChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow },
    staffChipText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '700' },
    staffChipTextActive: { color: Colors.primary },
    staffChipSub: { color: Colors.textFaint, fontSize: FontSize.xs, marginTop: 2 },
    submitBtn: { borderRadius: Radius.md, overflow: 'hidden', marginTop: Spacing.md },
    submitGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
    submitText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: Spacing.xxl, borderWidth: 1, borderColor: Colors.border },
    modalHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
    modalTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '800' },
    modalSub: { color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.lg },
    statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
    statBox: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
    statNum: { fontSize: FontSize.xxl, fontWeight: '800' },
    statLabel: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
    modalCloseBtn: { alignItems: 'center', padding: Spacing.md },
    modalCloseText: { color: Colors.textMuted, fontSize: FontSize.md, fontWeight: '600' },
    // Notice-shared reuse
    warning: { color: Colors.warning },
});
