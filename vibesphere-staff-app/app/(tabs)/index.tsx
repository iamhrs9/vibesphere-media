import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Platform, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { BASE_URL, getStaffData, removeStaffData } from '../../utils/api';

// Status Types
type TaskStatus = 'pending' | 'interested' | 'not-answering' | 'call-back' | 'rejected';

interface Task {
    _id: string;
    clientName: string;
    clientType: string;
    contactNumber: string;
    servicePitch: string;
    status: TaskStatus;
    notes: string;
}

export default function StaffDashboardScreen() {
    const [staff, setStaff] = useState<any>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    // Update Modal State
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [updateModalVisible, setUpdateModalVisible] = useState(false);
    const [tempStatus, setTempStatus] = useState<TaskStatus>('pending');
    const [tempNotes, setTempNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // Profile Modal State
    const [isModalVisible, setModalVisible] = useState(false);
    const [profileImage, setProfileImage] = useState<string | null>(null);

    // Password Modal State
    const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
    const [password, setPassword] = useState('');
    const [updatingPassword, setUpdatingPassword] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const staffData = await getStaffData();
        if (!staffData || !staffData.email) {
            router.replace('/');
            return;
        }
        setStaff(staffData);
        await fetchTasks(staffData.email);
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
            console.error("Error fetching tasks", e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        setModalVisible(false);
        await removeStaffData();
        router.replace('/');
    };

    const handleChangePhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            alert('Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setProfileImage(result.assets[0].uri);
        }
    };

    const handleUpdatePassword = async () => {
        if (!password) {
            alert('Please enter a new password.');
            return;
        }
        setUpdatingPassword(true);
        try {
            const response = await fetch(`${BASE_URL}/update-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: staff.email, newPassword: password })
            });
            const data = await response.json();
            if (data.success) {
                alert('Password updated successfully!');
                setPassword('');
            } else {
                alert(data.message || 'Failed to update password.');
            }
        } catch (e) {
            alert('Network Error! Could not update password.');
        } finally {
            setUpdatingPassword(false);
        }
    };

    const openUpdateModal = (task: Task) => {
        setSelectedTask(task);
        setTempStatus(task.status || 'pending');
        setTempNotes(task.notes || '');
        setUpdateModalVisible(true);
    };

    const handleSaveTask = async () => {
        if (!selectedTask) return;
        setSaving(true);
        try {
            const response = await fetch(`${BASE_URL}/update-task`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: selectedTask._id,
                    status: tempStatus,
                    notes: tempNotes
                })
            });
            const data = await response.json();
            if (data.success) {
                // Optimistically update local state instead of doing a full refetch
                setTasks(prevTasks => prevTasks.map(t =>
                    t._id === selectedTask._id ? { ...t, status: tempStatus, notes: tempNotes } : t
                ));
                setUpdateModalVisible(false);
            } else {
                alert("Failed to update task.");
            }
        } catch (e) {
            alert("Network Error!");
        } finally {
            setSaving(false);
        }
    };

    // derived stats
    const totalAssigned = tasks.length;
    const completed = tasks.filter(t => t.status === 'interested' || t.status === 'rejected').length;
    const pending = tasks.filter(t => t.status === 'pending' || t.status === 'not-answering' || t.status === 'call-back').length;

    // Render Status Text/Icon Helper
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
                <Text style={styles.loaderText}>Loading Dashboard...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar style="dark" />
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Welcome back, {staff?.name?.split(' ')[0] || 'Staff'}! 👋</Text>
                        <Text style={styles.subtitle}>Here is your summary for today.</Text>
                    </View>
                    <TouchableOpacity style={styles.profileCircle} onPress={() => setModalVisible(true)}>
                        {profileImage ? (
                            <Image source={{ uri: profileImage }} style={styles.profileImageSmall} />
                        ) : (
                            <Text style={styles.profileInitial}>{staff?.name?.charAt(0) || 'S'}</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconBadge, { backgroundColor: '#e0e7ff' }]}>
                            <Ionicons name="briefcase-outline" size={24} color="#4f46e5" />
                        </View>
                        <View>
                            <Text style={styles.statNumber}>{totalAssigned}</Text>
                            <Text style={styles.statLabel}>Total Assigned</Text>
                        </View>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIconBadge, { backgroundColor: '#dcfce7' }]}>
                            <Ionicons name="checkmark-circle-outline" size={24} color="#16a34a" />
                        </View>
                        <View>
                            <Text style={styles.statNumber}>{completed}</Text>
                            <Text style={styles.statLabel}>Completed</Text>
                        </View>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIconBadge, { backgroundColor: '#fee2e2' }]}>
                            <Ionicons name="time-outline" size={24} color="#dc2626" />
                        </View>
                        <View>
                            <Text style={styles.statNumber}>{pending}</Text>
                            <Text style={styles.statLabel}>Pending Calls</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.taskSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Today's Pending Leads</Text>
                    </View>

                    {tasks.filter(t => ['pending', 'not-answering', 'call-back'].includes(t.status)).length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="checkbox" size={40} color="#16a34a" style={{ marginBottom: 10 }} />
                            <Text style={styles.emptyStateText}>All caught up for today!</Text>
                        </View>
                    ) : (
                        tasks.filter(t => ['pending', 'not-answering', 'call-back'].includes(t.status)).map((task) => (
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

                                <View style={styles.actionRow}>
                                    <TouchableOpacity style={styles.btnUpdate} onPress={() => openUpdateModal(task)}>
                                        <Text style={styles.btnUpdateText}>Update Status</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>

            </ScrollView>



            {/* PROFILE MODAL */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Profile Settings</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#1e293b" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.profileModalInfo}>
                            <View style={styles.profileCircleLarge}>
                                {profileImage ? (
                                    <Image source={{ uri: profileImage }} style={styles.profileImageLarge} />
                                ) : (
                                    <Text style={styles.profileInitialLarge}>{staff?.name?.charAt(0) || 'S'}</Text>
                                )}
                            </View>
                            <Text style={styles.profileNameLarge}>{staff?.name}</Text>
                            <Text style={styles.profileEmailLarge}>{staff?.email}</Text>

                            <TouchableOpacity style={styles.btnChangePhoto} onPress={handleChangePhoto}>
                                <Text style={styles.btnChangePhotoText}>Change Photo</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.btnAction} onPress={() => {
                            setModalVisible(false);
                            setPasswordModalVisible(true);
                        }}>
                            <Ionicons name="lock-closed-outline" size={18} color="#475569" style={{ marginRight: 10 }} />
                            <Text style={styles.btnActionText}>Change Password</Text>
                            <Ionicons name="chevron-forward" size={18} color="#94a3b8" style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.btnAction, { marginTop: 15, marginBottom: 25 }]} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={18} color="#dc2626" style={{ marginRight: 10 }} />
                            <Text style={[styles.btnActionText, { color: '#dc2626' }]}>Logout</Text>
                        </TouchableOpacity>

                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* PASSWORD MODAL */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isPasswordModalVisible}
                onRequestClose={() => setPasswordModalVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => {
                                setPasswordModalVisible(false);
                                setModalVisible(true);
                            }}>
                                <Ionicons name="arrow-back" size={24} color="#1e293b" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Change Password</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <View style={{ marginTop: 20 }}>
                            <Text style={styles.inputLabel}>New Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter new password"
                                placeholderTextColor="#94a3b8"
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />

                            <TouchableOpacity
                                style={[styles.btnSaveModal, updatingPassword && { backgroundColor: '#475569' }, { marginTop: 10, marginBottom: 15 }]}
                                onPress={handleUpdatePassword}
                                disabled={updatingPassword}
                            >
                                <Text style={styles.btnSaveModalText}>{updatingPassword ? 'Updating...' : 'Update Password'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* UPDATE MODAL */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={updateModalVisible}
                onRequestClose={() => setUpdateModalVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Update Lead Status</Text>
                            <TouchableOpacity onPress={() => setUpdateModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#1e293b" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSub}>{selectedTask?.clientName}</Text>

                        <Text style={styles.inputLabel}>Status</Text>
                        <View style={styles.statusChipsGrid}>
                            {['pending', 'interested', 'call-back', 'not-answering', 'rejected'].map(statusVal => (
                                <TouchableOpacity
                                    key={statusVal}
                                    style={[styles.statusChip, tempStatus === statusVal && styles.statusChipActive]}
                                    onPress={() => setTempStatus(statusVal as TaskStatus)}
                                >
                                    <Text style={[styles.statusChipText, tempStatus === statusVal && styles.statusChipTextActive]}>
                                        {getStatusDisplay(statusVal).split(' ')[1]} {getStatusDisplay(statusVal).split(' ')[2] || ''}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Feedback / Notes</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="e.g. Client requested callback tomorrow at 5PM"
                            placeholderTextColor="#94a3b8"
                            value={tempNotes}
                            onChangeText={setTempNotes}
                            multiline
                            numberOfLines={3}
                        />

                        <TouchableOpacity
                            style={[styles.btnSaveModal, saving && { backgroundColor: '#475569' }]}
                            onPress={handleSaveTask}
                            disabled={saving}
                        >
                            <Text style={styles.btnSaveModalText}>{saving ? 'Saving...' : 'Save Updates'}</Text>
                        </TouchableOpacity>

                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f4f7fe' },
    container: { flex: 1 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f7fe' },
    loaderText: { marginTop: 15, fontSize: 16, color: '#475569', fontWeight: '500' },
    contentContainer: { padding: 20, paddingBottom: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30, paddingTop: Platform.OS === 'android' ? 20 : 0 },
    greeting: { fontSize: 24, color: '#1e293b', fontWeight: '700', marginBottom: 4 },
    subtitle: { color: '#64748b', fontSize: 15 },
    profileCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#7d5fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff', overflow: 'hidden' },
    profileInitial: { fontSize: 18, color: '#ffffff', fontWeight: '700' },
    profileImageSmall: { width: '100%', height: '100%', borderRadius: 22.5 },
    profileCircleLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#7d5fff', alignItems: 'center', justifyContent: 'center', marginBottom: 15, overflow: 'hidden' },
    profileInitialLarge: { fontSize: 32, color: '#ffffff', fontWeight: '700' },
    profileImageLarge: { width: '100%', height: '100%', borderRadius: 40 },
    profileModalInfo: { alignItems: 'center', marginBottom: 20 },
    profileNameLarge: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
    profileEmailLarge: { fontSize: 14, color: '#64748b', marginBottom: 15 },
    btnChangePhoto: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#f1f5f9', borderRadius: 20 },
    btnChangePhotoText: { color: '#475569', fontSize: 13, fontWeight: '600' },
    btnAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    btnActionText: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
    btnLogoutOutlined: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderWidth: 1, borderColor: '#fca5a5', borderRadius: 12, backgroundColor: '#fef2f2' },
    btnLogoutText: { color: '#dc2626', fontSize: 16, fontWeight: '600', marginLeft: 8 },
    divider: { height: 1, backgroundColor: '#e2e8f0', width: '100%', marginBottom: 20 },
    input: { width: '100%', paddingVertical: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, fontSize: 14, color: '#334155', backgroundColor: '#f8fafc', marginBottom: 20 },

    statsGrid: { marginBottom: 30, gap: 15 },
    statCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 15, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
    statIconBadge: { width: 55, height: 55, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 20 },
    statNumber: { fontSize: 28, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
    statLabel: { fontSize: 14, color: '#64748b', fontWeight: '500' },
    taskSection: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 15, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
    sectionHeader: { marginBottom: 20 },
    sectionTitle: { fontSize: 20, color: '#1e293b', fontWeight: '700' },
    emptyState: { padding: 40, alignItems: 'center' },
    emptyStateText: { fontSize: 16, color: '#16a34a', fontWeight: '600' },
    taskCard: { padding: 15, borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 15, marginBottom: 15, backgroundColor: '#fafbfc' },
    taskCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    clientName: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
    clientType: { fontSize: 13, color: '#94a3b8' },
    badgeService: { backgroundColor: '#f3e8ff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
    badgeServiceText: { color: '#7e22ce', fontSize: 12, fontWeight: '600' },
    taskDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    taskPhone: { fontSize: 14, color: '#475569', fontWeight: '500' },
    taskStatus: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
    taskNotes: { fontSize: 13, color: '#64748b', fontStyle: 'italic', marginBottom: 15, backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8 },
    actionRow: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 15, marginTop: 5 },
    btnUpdate: { backgroundColor: '#1e293b', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    btnUpdateText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },


    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
    modalSub: { fontSize: 14, color: '#64748b', marginBottom: 25 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 10 },
    statusChipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
    statusChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
    statusChipActive: { backgroundColor: '#7d5fff', borderColor: '#7d5fff' },
    statusChipText: { fontSize: 13, fontWeight: '500', color: '#475569' },
    statusChipTextActive: { color: '#fff' },
    textArea: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 15, fontSize: 14, color: '#1e293b', backgroundColor: '#f8fafc', height: 100, textAlignVertical: 'top', marginBottom: 25 },
    btnSaveModal: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, alignItems: 'center' },
    btnSaveModalText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
