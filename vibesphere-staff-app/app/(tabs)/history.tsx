import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { BASE_URL, getStaffData } from '../../utils/api';

interface Task {
    _id: string;
    clientName: string;
    clientType: string;
    contactNumber: string;
    servicePitch: string;
    status: string;
    notes: string;
}

export default function HistoryScreen() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const staffData = await getStaffData();
        if (staffData && staffData.email) {
            await fetchTasks(staffData.email);
        }
        setLoading(false);
    };

    const fetchTasks = async (email: string) => {
        try {
            const response = await fetch(`${BASE_URL}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (data.success) {
                setTasks(data.tasks);
            }
        } catch (e) {
            console.error("Error fetching tasks history", e);
        }
    };

    const getStatusDisplay = (status: string) => {
        switch (status) {
            case 'interested': return '✅ Interested';
            case 'rejected': return '❌ Rejected';
            case 'not-answering': return '📵 Not Answering';
            case 'call-back': return '📞 Call Back Tom';
            default: return '⏳ Pending';
        }
    };

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#7d5fff" />
                <Text style={styles.loaderText}>Loading History...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar style="dark" />
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

                <View style={styles.taskSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>All Assigned Leads (History)</Text>
                    </View>

                    {tasks.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="cafe-outline" size={40} color="#cbd5e1" style={{ marginBottom: 10 }} />
                            <Text style={styles.emptyStateText}>No leads assigned yet! Relax 🎉</Text>
                        </View>
                    ) : (
                        tasks.map((task) => (
                            <View key={task._id.toString()} style={styles.taskCard}>
                                <View style={styles.taskCardHeader}>
                                    <View>
                                        <Text style={styles.clientName}>{task.clientName}</Text>
                                        <Text style={styles.clientType}>{task.clientType || 'Lead'}</Text>
                                    </View>
                                    <View style={styles.badgeService}>
                                        <Text style={styles.badgeServiceText}>{task.servicePitch}</Text>
                                    </View>
                                </View>

                                <View style={styles.taskDetails}>
                                    <Text style={styles.taskPhone}><Ionicons name="call-outline" size={14} /> {task.contactNumber}</Text>
                                    <Text style={styles.taskStatus}>{getStatusDisplay(task.status)}</Text>
                                </View>

                                {task.notes ? (
                                    <Text style={styles.taskNotes}>Notes: {task.notes}</Text>
                                ) : null}
                            </View>
                        ))
                    )}
                </View>

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
    taskSection: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 15, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
    sectionHeader: { marginBottom: 20 },
    sectionTitle: { fontSize: 20, color: '#1e293b', fontWeight: '700' },
    emptyState: { padding: 40, alignItems: 'center' },
    emptyStateText: { fontSize: 16, color: '#64748b', fontWeight: '500' },
    taskCard: { padding: 15, borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 15, marginBottom: 15, backgroundColor: '#fafbfc' },
    taskCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    clientName: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
    clientType: { fontSize: 13, color: '#94a3b8' },
    badgeService: { backgroundColor: '#f3e8ff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
    badgeServiceText: { color: '#7e22ce', fontSize: 12, fontWeight: '600' },
    taskDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    taskPhone: { fontSize: 14, color: '#475569', fontWeight: '500' },
    taskStatus: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
    taskNotes: { fontSize: 13, color: '#64748b', fontStyle: 'italic', backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8 },
});
