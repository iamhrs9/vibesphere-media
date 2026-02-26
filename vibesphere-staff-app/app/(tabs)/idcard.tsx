import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, Platform, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getStaffData } from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';

export default function IDCardScreen() {
    const [staff, setStaff] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const staffData = await getStaffData();
        if (staffData) {
            setStaff(staffData);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#7d5fff" />
                <Text style={styles.loaderText}>Loading ID...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar style="light" />
            <View style={styles.container}>

                <View style={styles.idCardOuter}>
                    <View style={styles.idCardInner}>

                        <View style={styles.headerArea}>
                            <Text style={styles.brandTitle}>VibeSphere<Text style={{ color: '#c4b5fd' }}>. Media</Text></Text>
                            <Text style={styles.tagline}>Official Staff ID</Text>
                        </View>

                        <View style={styles.photoContainer}>
                            {staff?.profilePhoto ? (
                                <Image source={{ uri: staff.profilePhoto }} style={styles.photo} />
                            ) : (
                                <View style={styles.photoPlaceholder}>
                                    <Text style={styles.photoInitial}>{staff?.name?.charAt(0) || 'S'}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.infoArea}>
                            <Text style={styles.staffName}>{staff?.name || 'Staff Member'}</Text>
                            <Text style={styles.staffRole}>{staff?.role || 'VibeSphere Agent'}</Text>

                            <View style={styles.divider} />

                            <View style={styles.detailRow}>
                                <Ionicons name="finger-print-outline" size={16} color="#c4b5fd" />
                                <Text style={styles.detailText}>ID: {staff?.empId || 'VS-XXX'}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Ionicons name="mail-outline" size={16} color="#c4b5fd" />
                                <Text style={styles.detailText}>{staff?.email || 'email@vibespheremedia.com'}</Text>
                            </View>
                        </View>

                        <View style={styles.qrArea}>
                            {/* Dummy QR Placeholder */}
                            <Ionicons name="qr-code-outline" size={80} color="#ffffff" />
                            <Text style={styles.qrText}>Scan to Verify</Text>
                        </View>

                    </View>
                </View>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0f172a' }, // Dark background outside card
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
    loaderText: { marginTop: 15, fontSize: 16, color: '#f8fafc', fontWeight: '500' },

    idCardOuter: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 8,
        shadowColor: '#7d5fff',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 15,
    },
    idCardInner: {
        backgroundColor: '#7d5fff', // Primary Brand Purple
        borderRadius: 15,
        paddingVertical: 30,
        paddingHorizontal: 20,
        alignItems: 'center',
        overflow: 'hidden',
    },
    headerArea: {
        alignItems: 'center',
        marginBottom: 30,
    },
    brandTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: 1,
    },
    tagline: {
        fontSize: 12,
        color: '#e0e7ff',
        fontWeight: '500',
        textTransform: 'uppercase',
        marginTop: 4,
        letterSpacing: 2,
    },
    photoContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    photo: {
        width: '100%',
        height: '100%',
        borderRadius: 60,
    },
    photoPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 60,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoInitial: {
        fontSize: 48,
        fontWeight: '700',
        color: '#94a3b8',
    },
    infoArea: {
        alignItems: 'center',
        width: '100%',
    },
    staffName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 4,
    },
    staffRole: {
        fontSize: 15,
        color: '#c4b5fd',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    divider: {
        width: 40,
        height: 3,
        backgroundColor: '#a78bfa',
        borderRadius: 2,
        marginVertical: 20,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 10,
        width: '100%',
    },
    detailText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 10,
    },
    qrArea: {
        marginTop: 30,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 15,
        borderRadius: 15,
    },
    qrText: {
        color: '#e0e7ff',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 10,
        letterSpacing: 1,
    }
});
