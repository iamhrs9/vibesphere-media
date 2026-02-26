import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    Linking,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import OrderCard, { Order } from '@/components/ui/OrderCard';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { API, ADMIN_HEADERS, STORAGE_KEY_TOKEN } from '@/constants/api';

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Done', 'Cancelled'];

export default function OrdersScreen() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    // Bottom sheet modal
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [sendingInvoice, setSendingInvoice] = useState(false);

    useEffect(() => {
        checkAuth();
        fetchOrders();
    }, []);

    const checkAuth = async () => {
        const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
        if (!token) router.replace('/');
    };

    const fetchOrders = async () => {
        setError('');
        try {
            const res = await fetch(API.orders, {
                method: 'GET',
                headers: ADMIN_HEADERS,
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data: Order[] = await res.json();
            setOrders(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load orders. Check your server connection.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchOrders();
    }, []);

    const handleCardPress = (order: Order) => {
        setSelectedOrder(order);
        setModalVisible(true);
    };

    // ── Status Update ──────────────────────────────────────
    const updateStatus = async (newStatus: string) => {
        if (!selectedOrder) return;
        setUpdatingStatus(true);
        try {
            const res = await fetch(API.updateStatus, {
                method: 'POST',
                headers: ADMIN_HEADERS,
                body: JSON.stringify({ id: selectedOrder.orderId, status: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                setOrders(prev =>
                    prev.map(o =>
                        o.orderId === selectedOrder.orderId ? { ...o, status: newStatus } : o
                    )
                );
                setModalVisible(false);
                setSelectedOrder(null);
                Alert.alert('✅ Updated', `Status changed to "${newStatus}"`);
            } else {
                Alert.alert('Error', 'Failed to update status.');
            }
        } catch {
            Alert.alert('Error', 'Network error. Try again.');
        } finally {
            setUpdatingStatus(false);
        }
    };

    // ── Send Invoice Email ─────────────────────────────────
    const handleSendInvoice = async () => {
        if (!selectedOrder) return;
        if (!selectedOrder.email) {
            Alert.alert('⚠️ No Email', 'This order has no client email on file.');
            return;
        }
        Alert.alert(
            'Send Invoice',
            `Email invoice to ${selectedOrder.email}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send',
                    onPress: async () => {
                        setSendingInvoice(true);
                        try {
                            const res = await fetch(API.resendInvoice, {
                                method: 'POST',
                                headers: ADMIN_HEADERS,
                                body: JSON.stringify({ orderId: selectedOrder.orderId }),
                            });
                            const data = await res.json();
                            if (data.success) {
                                Alert.alert('📧 Sent!', `Invoice emailed to ${selectedOrder.email}`);
                                setModalVisible(false);
                            } else {
                                Alert.alert('Failed', data.message || 'Could not send invoice.');
                            }
                        } catch {
                            Alert.alert('Error', 'Network error. Try again.');
                        } finally {
                            setSendingInvoice(false);
                        }
                    },
                },
            ]
        );
    };

    // ── Download Invoice PDF ───────────────────────────────
    const handleDownloadInvoice = async () => {
        if (!selectedOrder) return;
        const url = API.downloadInvoice(selectedOrder.orderId);
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
                setModalVisible(false);
            } else {
                Alert.alert('Error', 'Cannot open URL. Make sure your server is reachable.');
            }
        } catch {
            Alert.alert('Error', 'Could not open invoice URL.');
        }
    };

    // ── Render helpers ─────────────────────────────────────
    const renderOrder = ({ item }: { item: Order }) => (
        <OrderCard order={item} onCardPress={handleCardPress} />
    );

    const renderEmpty = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptyDesc}>
                Orders from your payment gateway will appear here automatically.
            </Text>
        </View>
    );

    const renderError = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Text style={styles.emptyTitle}>Connection Error</Text>
            <Text style={styles.emptyDesc}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchOrders}>
                <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <LinearGradient colors={['#0d0d1a', '#0a0a0a']} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Recent Orders</Text>
                <Text style={styles.count}>
                    {orders.length > 0 ? `${orders.length} total` : ''}
                </Text>
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading orders...</Text>
                </View>
            ) : error ? (
                renderError()
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={item => item._id || item.orderId}
                    renderItem={renderOrder}
                    contentContainerStyle={[
                        styles.listContent,
                        orders.length === 0 && { flex: 1 },
                    ]}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={renderEmpty}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={Colors.primary}
                            colors={[Colors.primary]}
                        />
                    }
                />
            )}

            {/* ── Action Bottom Sheet Modal ── */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => !updatingStatus && !sendingInvoice && setModalVisible(false)}
                >
                    <Pressable style={styles.modalSheet} onPress={() => { }}>
                        <View style={styles.modalHandle} />

                        {/* Order info header */}
                        <View style={styles.modalOrderInfo}>
                            <Text style={styles.modalOrderId}>{selectedOrder?.orderId}</Text>
                            <Text style={styles.modalCustomerName}>{selectedOrder?.customerName}</Text>
                            {selectedOrder?.email ? (
                                <Text style={styles.modalEmail}>📧 {selectedOrder.email}</Text>
                            ) : null}
                        </View>

                        {/* ── Invoice Actions ── */}
                        <Text style={styles.modalSectionLabel}>INVOICE</Text>
                        <View style={styles.invoiceActions}>
                            <TouchableOpacity
                                style={[styles.invoiceBtn, { borderColor: Colors.success }]}
                                onPress={handleSendInvoice}
                                disabled={sendingInvoice}
                                activeOpacity={0.75}
                            >
                                {sendingInvoice ? (
                                    <ActivityIndicator size="small" color={Colors.success} />
                                ) : (
                                    <>
                                        <Text style={styles.invoiceBtnIcon}>📧</Text>
                                        <Text style={[styles.invoiceBtnText, { color: Colors.success }]}>
                                            Send Invoice
                                        </Text>
                                        <Text style={styles.invoiceBtnSub}>Email to client</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.invoiceBtn, { borderColor: Colors.primary }]}
                                onPress={handleDownloadInvoice}
                                activeOpacity={0.75}
                            >
                                <Text style={styles.invoiceBtnIcon}>⬇️</Text>
                                <Text style={[styles.invoiceBtnText, { color: Colors.primary }]}>
                                    Download PDF
                                </Text>
                                <Text style={styles.invoiceBtnSub}>Open in browser</Text>
                            </TouchableOpacity>
                        </View>

                        {/* ── Status Update ── */}
                        <Text style={[styles.modalSectionLabel, { marginTop: Spacing.lg }]}>
                            UPDATE STATUS
                        </Text>
                        <View style={styles.statusOptions}>
                            {STATUS_OPTIONS.map(status => {
                                const isActive = selectedOrder?.status?.toLowerCase() === status.toLowerCase();
                                return (
                                    <TouchableOpacity
                                        key={status}
                                        style={[styles.statusOption, isActive && styles.statusOptionActive]}
                                        onPress={() => !updatingStatus && updateStatus(status)}
                                        activeOpacity={0.75}
                                    >
                                        {updatingStatus && isActive ? (
                                            <ActivityIndicator size="small" color={Colors.primary} />
                                        ) : (
                                            <Text style={[
                                                styles.statusOptionText,
                                                isActive && styles.statusOptionTextActive,
                                            ]}>
                                                {isActive ? '✓  ' : ''}{status}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity
                            style={styles.cancelModalBtn}
                            onPress={() => setModalVisible(false)}
                            disabled={updatingStatus || sendingInvoice}
                        >
                            <Text style={styles.cancelModalText}>Close</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backBtn: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.sm,
    },
    backText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
    headerTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '800' },
    count: { color: Colors.textMuted, fontSize: FontSize.sm, minWidth: 60, textAlign: 'right' },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
    loadingText: { color: Colors.textMuted, fontSize: FontSize.sm },
    listContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
    emptyState: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl,
    },
    emptyIcon: { fontSize: 56, marginBottom: Spacing.md },
    emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700', marginBottom: Spacing.sm },
    emptyDesc: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },
    retryBtn: {
        marginTop: Spacing.lg, backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.md,
    },
    retryText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },

    // ── Modal ──
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: Spacing.xl, paddingBottom: Spacing.xxl,
        borderWidth: 1, borderColor: Colors.border,
    },
    modalHandle: {
        width: 40, height: 4, backgroundColor: Colors.border,
        borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg,
    },
    modalOrderInfo: { marginBottom: Spacing.lg },
    modalOrderId: {
        color: Colors.primary, fontSize: FontSize.sm, fontWeight: '800',
        letterSpacing: 1, marginBottom: 2,
    },
    modalCustomerName: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '800' },
    modalEmail: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 4 },
    modalSectionLabel: {
        color: Colors.textFaint, fontSize: FontSize.xs, fontWeight: '800',
        letterSpacing: 2, textTransform: 'uppercase', marginBottom: Spacing.sm,
    },

    // ── Invoice action buttons ──
    invoiceActions: { flexDirection: 'row', gap: Spacing.sm },
    invoiceBtn: {
        flex: 1, backgroundColor: Colors.surfaceAlt,
        borderRadius: Radius.md, borderWidth: 1,
        padding: Spacing.md, alignItems: 'center', minHeight: 90,
        justifyContent: 'center',
    },
    invoiceBtnIcon: { fontSize: 24, marginBottom: Spacing.xs },
    invoiceBtnText: { fontSize: FontSize.sm, fontWeight: '800' },
    invoiceBtnSub: { color: Colors.textFaint, fontSize: FontSize.xs, marginTop: 2 },

    // ── Status options ──
    statusOptions: { gap: Spacing.sm },
    statusOption: {
        backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
        paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
        borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
    },
    statusOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow },
    statusOptionText: { color: Colors.textMuted, fontSize: FontSize.md, fontWeight: '600' },
    statusOptionTextActive: { color: Colors.primary, fontWeight: '700' },
    cancelModalBtn: { marginTop: Spacing.lg, alignItems: 'center', padding: Spacing.md },
    cancelModalText: { color: Colors.textMuted, fontSize: FontSize.md, fontWeight: '600' },
});
