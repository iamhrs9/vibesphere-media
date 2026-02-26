import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radius, FontSize, Shadow } from '@/constants/theme';

export interface Order {
    _id: string;
    orderId: string;
    paymentId?: string;
    customerName: string;
    email?: string;
    package: string;
    price: string;
    status: string;
    date?: string;
    targetLink?: string;
}

interface OrderCardProps {
    order: Order;
    onCardPress?: (order: Order) => void;
}

export default function OrderCard({ order, onCardPress }: OrderCardProps) {
    const isDone = order.status?.toLowerCase() === 'done';
    const isPending = order.status?.toLowerCase() === 'pending';

    const statusColor = isDone
        ? Colors.successBg
        : isPending
            ? Colors.dangerBg
            : '#1e3a5f';

    const statusLabel = order.status || 'Pending';

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => onCardPress?.(order)}
            activeOpacity={onCardPress ? 0.75 : 1}
        >
            {/* Header Row */}
            <View style={styles.header}>
                <Text style={styles.orderId}>{order.orderId || '#ORD-???'}</Text>
                <View style={[styles.badge, { backgroundColor: statusColor }]}>
                    <Text style={styles.badgeText}>{statusLabel.toUpperCase()}</Text>
                </View>
            </View>

            {/* Customer Name */}
            <Text style={styles.customerName} numberOfLines={1}>
                {order.customerName || 'Unknown Client'}
            </Text>

            {/* Package */}
            <Text style={styles.package} numberOfLines={1}>
                📦 {order.package || 'N/A'}
            </Text>

            {/* Target Link */}
            {order.targetLink ? (
                <Text style={styles.link} numberOfLines={1}>
                    🔗 {order.targetLink}
                </Text>
            ) : null}

            {/* Date */}
            {order.date ? (
                <Text style={styles.date}>
                    🗓 {new Date(order.date).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                    })}
                </Text>
            ) : null}

            {/* Footer: Price + Hint */}
            <View style={styles.footer}>
                <Text style={styles.price}>{order.price || '₹0'}</Text>
                {onCardPress ? (
                    <Text style={styles.actionText}>Tap to manage →</Text>
                ) : null}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.card,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    orderId: {
        color: Colors.primary,
        fontSize: FontSize.sm,
        fontWeight: '700',
        letterSpacing: 1,
    },
    badge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: Radius.full,
    },
    badgeText: {
        color: '#fff',
        fontSize: FontSize.xs,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    customerName: {
        color: Colors.textPrimary,
        fontSize: FontSize.lg,
        fontWeight: '700',
        marginBottom: Spacing.xs,
    },
    package: {
        color: Colors.textMuted,
        fontSize: FontSize.sm,
        marginBottom: Spacing.xs,
    },
    link: {
        color: Colors.textMuted,
        fontSize: FontSize.xs,
        marginBottom: Spacing.xs,
    },
    date: {
        color: Colors.textFaint,
        fontSize: FontSize.xs,
        marginBottom: Spacing.md,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingTop: Spacing.md,
        marginTop: Spacing.xs,
    },
    price: {
        color: Colors.success,
        fontSize: FontSize.lg,
        fontWeight: '800',
    },
    actionBtn: {
        backgroundColor: Colors.surfaceAlt,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.sm,
    },
    actionText: {
        color: Colors.textSecondary,
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
});
