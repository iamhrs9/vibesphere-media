import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, Alert, TextInput, Linking
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

// ─────────────────────────────────────────────────────────────────────────────
// 🎨 INTERNAL THEME (Taaki bahar ki files ki zaroorat na pade)
const Colors = {
    bg: '#0a0a0a',
    surface: '#111',
    surfaceAlt: '#1a1a1a',
    border: '#222',
    primary: '#6c63ff',
    primaryGlow: 'rgba(108, 99, 255, 0.1)',
    success: '#10b981',
    dangerBg: '#991b1b',
    textPrimary: '#ffffff',
    textSecondary: '#dddddd',
    textMuted: '#888888',
    textFaint: '#555555'
};
const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 40 };
const FontSize = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 };
const Radius = { sm: 6, md: 10, lg: 15 };

// 🔗 INTERNAL API SETTINGS
const BASE_URL = 'http://192.168.31.186:3000'; // Isko apna sahi IP daal lena baad mein phone ke liye
// ─────────────────────────────────────────────────────────────────────────────

interface FieldProps {
    label: string; val: string; set: (v: string) => void;
    placeholder: string; required?: boolean; hint?: string;
}

function HandoverField({ label, val, set, placeholder, required = false, hint = '' }: FieldProps) {
    return (
        <View style={{ marginBottom: Spacing.md }}>
            <Text style={fStyles.label}>{label}{required ? ' *' : ''}</Text>
            {hint ? <Text style={fStyles.hint}>{hint}</Text> : null}
            <TextInput
                style={fStyles.input} value={val} onChangeText={set}
                placeholder={placeholder} placeholderTextColor={Colors.textFaint}
                selectionColor={Colors.primary} autoCapitalize="none"
            />
        </View>
    );
}

const fStyles = StyleSheet.create({
    label: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
    hint: { color: Colors.textFaint, fontSize: FontSize.xs, marginBottom: 4 },
    input: { backgroundColor: Colors.surfaceAlt, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, minHeight: 52 },
});

interface Handover {
    _id: string; certId: string; orderNumber: string; clientName: string;
    projectName: string; deliveryDate: string; dateGenerated: string;
}

export default function HandoversScreen() {
    const [certs, setCerts] = useState<Handover[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [emailingId, setEmailingId] = useState<string | null>(null);

    const [orderNum, setOrderNum] = useState('');
    const [clientName, setClientName] = useState('');
    const [projectName, setProjectName] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [supportDate, setSupportDate] = useState('');
    const [liveLink, setLiveLink] = useState('');
    const [notes, setNotes] = useState('');

    const [generating, setGenerating] = useState(false);
    const [emailing, setEmailing] = useState(false);

    useEffect(() => { fetchHandovers(); }, []);

    const getAuthHeader = async () => {
        const token = await AsyncStorage.getItem('adminToken');
        if (!token) {
            router.replace('/');
            return null;
        }
        return `Bearer ${token}`;
    };

    const fetchHandovers = async () => {
        try {
            const authHeader = await getAuthHeader();
            if (!authHeader) return;

            const res = await fetch(`${BASE_URL}/api/admin/handovers`, {
                headers: { 'Authorization': authHeader }
            });
            const data = await res.json();

            // ⚠️ Ensure your backend returns data.certs or just data
            if (data.success || Array.isArray(data)) {
                setCerts(data.certs || data);
            }
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => { setRefreshing(true); fetchHandovers(); }, []);

    const buildPayload = () => ({
        orderNumber: orderNum.trim(), clientName: clientName.trim(), projectName: projectName.trim(),
        deliveryDate: deliveryDate.trim(), supportDate: supportDate.trim(), liveLink: liveLink.trim(), remarks: notes.trim(),
    });

    const clearForm = () => {
        setOrderNum(''); setClientName(''); setProjectName('');
        setDeliveryDate(''); setSupportDate(''); setLiveLink(''); setNotes('');
    };

    const generateHandover = async () => {
        const payload = buildPayload();
        if (!payload.orderNumber || !payload.clientName || !payload.projectName || !payload.deliveryDate || !payload.supportDate || !payload.liveLink) {
            Alert.alert('Missing Fields', 'Please fill all required (*) fields.'); return;
        }

        const authHeader = await getAuthHeader();
        if (!authHeader) return;

        setGenerating(true);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${BASE_URL}/api/admin/generate-handover`);
        xhr.setRequestHeader('Authorization', authHeader);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.responseType = 'blob';

        xhr.onload = () => {
            setGenerating(false);
            if (xhr.status >= 200 && xhr.status < 300) {
                clearForm();
                fetchHandovers();
                Alert.alert('✅ Generated!', 'Check the list below.');
            } else {
                Alert.alert('Failed', `Server returned ${xhr.status}.`);
            }
        };

        xhr.onerror = () => {
            setGenerating(false);
            fetchHandovers();
            Alert.alert('⚠️ Error', 'Check your connection. Item might be saved.');
        };

        xhr.send(JSON.stringify(payload));
    };

    const emailFromForm = async () => {
        const payload = buildPayload();
        if (!payload.orderNumber || !payload.clientName || !payload.projectName) {
            Alert.alert('⚠️ Required', 'Fill Order No, Client Name, and Project Title first.'); return;
        }

        const authHeader = await getAuthHeader();
        if (!authHeader) return;

        setEmailing(true);
        try {
            const res = await fetch(`${BASE_URL}/api/admin/email-handover`, {
                method: 'POST',
                headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (res.ok || result.success) {
                Alert.alert('✅ Email Sent!', result.message || 'Sent successfully');
                clearForm();
                fetchHandovers();
            } else {
                Alert.alert('❌ Failed', result.message || 'Could not send email.');
            }
        } catch {
            Alert.alert('Network Error', 'Could not reach server.');
        } finally {
            setEmailing(false);
        }
    };

    const downloadCert = async (cert: Handover) => {
        const url = `${BASE_URL}/api/admin/download-saved-handover/${cert._id}`;
        try {
            if (await Linking.canOpenURL(url)) await Linking.openURL(url);
            else Alert.alert('Error', 'Cannot open URL.');
        } catch { Alert.alert('Error', 'Failed to open PDF.'); }
    };

    const reEmailCert = async (cert: Handover) => {
        const authHeader = await getAuthHeader();
        if (!authHeader) return;

        setEmailingId(cert._id);
        try {
            const res = await fetch(`${BASE_URL}/api/admin/re-email-handover/${cert._id}`, {
                method: 'POST', headers: { 'Authorization': authHeader }
            });
            const data = await res.json();
            if (res.ok || data.success) Alert.alert('✅ Sent!', data.message || "Emailed successfully");
            else Alert.alert('❌ Failed', data.message || 'Could not send email.');
        } catch { Alert.alert('Network Error', 'Could not reach server.'); }
        finally { setEmailingId(null); }
    };

    const deleteCert = (cert: Handover) => {
        Alert.alert('Delete?', `Remove ${cert.clientName}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    const authHeader = await getAuthHeader();
                    if (!authHeader) return;
                    try {
                        const res = await fetch(`${BASE_URL}/api/admin/delete-handover/${cert._id}`, {
                            method: 'DELETE', headers: { 'Authorization': authHeader }
                        });
                        if (res.ok) fetchHandovers();
                    } catch { Alert.alert('Error', 'Network error.'); }
                },
            },
        ]);
    };

    const renderCert = ({ item }: { item: Handover }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.certId}>{item.certId || "NO ID"}</Text>
                    <Text style={styles.certClient}>{item.clientName}</Text>
                    <Text style={styles.certProject}>{item.projectName}</Text>
                </View>
                <View style={styles.orderBadge}>
                    <Text style={styles.orderNum}>{item.orderNumber}</Text>
                </View>
            </View>
            <Text style={styles.certDate}>
                🗓 {new Date(item.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>

            <TouchableOpacity style={[styles.resendBtn, emailingId === item._id && { opacity: 0.6 }]} onPress={() => reEmailCert(item)} disabled={emailingId === item._id}>
                {emailingId === item._id ? <ActivityIndicator size="small" color={Colors.success} /> : <Text style={styles.resendText}>📧 Resend to Client</Text>}
            </TouchableOpacity>

            <View style={styles.cardActions}>
                <TouchableOpacity style={styles.downloadBtn} onPress={() => downloadCert(item)}>
                    <Text style={styles.downloadText}>⬇️ Download PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteCert(item)}>
                    <Text style={styles.deleteBtnText}>🗑</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar style="light" />
            <LinearGradient colors={['#0d0d1a', '#0a0a0a']} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>📄 Handovers</Text>
            </View>

            <FlatList
                data={certs} keyExtractor={i => i._id || Math.random().toString()} renderItem={renderCert}
                contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                ListEmptyComponent={loading ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} /> : <Text style={styles.emptyText}>No certificates yet.</Text>}
                ListHeaderComponent={
                    <View style={styles.form}>
                        <Text style={styles.formTitle}>Generate Handover</Text>
                        <HandoverField label="Order Number" val={orderNum} set={setOrderNum} placeholder="#ORD-123456" required />
                        <HandoverField label="Client Name" val={clientName} set={setClientName} placeholder="Full client name" required />
                        <HandoverField label="Project Title" val={projectName} set={setProjectName} placeholder="e.g. Website" required />
                        <HandoverField label="Delivery Date" val={deliveryDate} set={setDeliveryDate} placeholder="YYYY-MM-DD" required />
                        <HandoverField label="Support Valid Till" val={supportDate} set={setSupportDate} placeholder="YYYY-MM-DD" required />
                        <HandoverField label="Live URL" val={liveLink} set={setLiveLink} placeholder="https://client.com" required />
                        <HandoverField label="Admin Notes" val={notes} set={setNotes} placeholder="Optional remarks" />

                        <TouchableOpacity style={[styles.actionBtn, styles.btnGreen]} onPress={generateHandover} disabled={generating || emailing}>
                            {generating ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>📄 Generate PDF</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.actionBtn, styles.btnBlue, { marginBottom: Spacing.xl }]} onPress={emailFromForm} disabled={emailing || generating}>
                            {emailing ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>📧 Send Email</Text>}
                        </TouchableOpacity>

                        <Text style={styles.sectionLabel}>SAVED CERTIFICATES</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 50, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
    backBtn: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm, marginRight: 15 },
    backText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
    headerTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '800' },
    form: { padding: Spacing.lg, paddingBottom: 0 },
    formTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '800', marginBottom: Spacing.lg },
    actionBtn: { width: '100%', paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', minHeight: 52, marginBottom: Spacing.sm },
    btnGreen: { backgroundColor: '#059669' },
    btnBlue: { backgroundColor: '#3b82f6' },
    actionBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
    sectionLabel: { color: Colors.textFaint, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 2, marginBottom: Spacing.md },
    listContent: { paddingBottom: Spacing.xxl },
    emptyText: { color: Colors.textMuted, fontSize: FontSize.md, textAlign: 'center', padding: Spacing.lg },
    card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
    certId: { color: Colors.success, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
    certClient: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700' },
    certProject: { color: Colors.textMuted, fontSize: FontSize.sm },
    orderBadge: { backgroundColor: Colors.primaryGlow, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm, marginLeft: Spacing.sm },
    orderNum: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700' },
    certDate: { color: Colors.textFaint, fontSize: FontSize.xs, marginBottom: Spacing.md },
    resendBtn: { backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: Colors.success, paddingVertical: Spacing.md, borderRadius: Radius.sm, alignItems: 'center', marginBottom: Spacing.sm },
    resendText: { color: Colors.success, fontSize: FontSize.sm, fontWeight: '700' },
    cardActions: { flexDirection: 'row', gap: Spacing.sm },
    downloadBtn: { flex: 1, backgroundColor: Colors.primaryGlow, borderWidth: 1, borderColor: Colors.primary, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
    downloadText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700' },
    deleteBtn: { backgroundColor: Colors.dangerBg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm },
    deleteBtnText: { color: '#fff', fontSize: FontSize.md },
});