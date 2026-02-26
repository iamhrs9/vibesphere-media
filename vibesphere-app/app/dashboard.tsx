import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    FlatList,
    Animated,
    Dimensions,
    Alert,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { STORAGE_KEY_TOKEN } from '@/constants/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.md) / 2;

interface MenuItem {
    id: string;
    label: string;
    icon: string;
    description: string;
    route: string;
    color: string;
    available: boolean;
}

const MENU_ITEMS: MenuItem[] = [
    {
        id: 'orders',
        label: 'Orders',
        icon: '📦',
        description: 'View & manage all recent orders',
        route: '/orders',
        color: Colors.primary,
        available: true,
    },
    {
        id: 'staff',
        label: 'Staff',
        icon: '👥',
        description: 'Manage team & assign leads',
        route: '/staff',
        color: '#3b82f6',
        available: true,
    },
    {
        id: 'notices',
        label: 'Notices',
        icon: '📢',
        description: 'Post & view staff notices',
        route: '/notices',
        color: '#f59e0b',
        available: true,
    },
    {
        id: 'jobs',
        label: 'Careers',
        icon: '💼',
        description: 'Post & manage job openings',
        route: '/jobs',
        color: '#8b5cf6',
        available: true,
    },
    {
        id: 'handovers',
        label: 'Handovers',
        icon: '📄',
        description: 'Generate verified project certificates',
        route: '/handovers',
        color: Colors.success,
        available: true,
    },
    {
        id: 'blog',
        label: 'Blog',
        icon: '✍️',
        description: 'Write & manage blog posts',
        route: '/blog',
        color: '#ec4899',
        available: true,
    },
];

export default function DashboardScreen() {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        checkAuth();
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();
    }, []);

    const checkAuth = async () => {
        const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
        if (!token) {
            router.replace('/');
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.removeItem(STORAGE_KEY_TOKEN);
                        router.replace('/');
                    },
                },
            ]
        );
    };

    const handleMenuPress = (item: MenuItem) => {
        if (!item.available) {
            Alert.alert('Coming Soon', `${item.label} module is under development. 🚀`);
            return;
        }
        router.push(item.route as any);
    };

    const renderMenuItem = ({ item, index }: { item: MenuItem; index: number }) => {
        const isLeft = index % 2 === 0;
        return (
            <Animated.View
                style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                }}
            >
                <TouchableOpacity
                    style={[
                        styles.menuCard,
                        !item.available && styles.menuCardDisabled,
                        isLeft ? { marginRight: Spacing.sm / 2 } : { marginLeft: Spacing.sm / 2 },
                    ]}
                    onPress={() => handleMenuPress(item)}
                    activeOpacity={0.75}
                >
                    {/* Accent top border */}
                    <View style={[styles.cardAccent, { backgroundColor: item.color }]} />

                    <Text style={styles.menuIcon}>{item.icon}</Text>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuDesc} numberOfLines={2}>{item.description}</Text>

                    {!item.available && (
                        <View style={styles.soonBadge}>
                            <Text style={styles.soonText}>SOON</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <LinearGradient colors={['#0d0d1a', '#0a0a0a']} style={StyleSheet.absoluteFill} />

            {/* Decorative glow */}
            <View style={styles.glowRight} />

            <FlatList
                data={MENU_ITEMS}
                keyExtractor={item => item.id}
                numColumns={2}
                ListHeaderComponent={
                    <>
                        {/* Header */}
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.greeting}>Welcome back 👋</Text>
                                <Text style={styles.title}>Admin Console</Text>
                            </View>
                            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                                <Text style={styles.logoutText}>Logout</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Brand strip */}
                        <LinearGradient
                            colors={['#6c63ff20', '#0a0a0a00']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.brandStrip}
                        >
                            <Text style={styles.brandName}>⚡ VibeSphere Media</Text>
                            <Text style={styles.brandSub}>Jaipur, India</Text>
                        </LinearGradient>

                        <Text style={styles.sectionTitle}>Quick Access</Text>
                    </>
                }
                renderItem={renderMenuItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={styles.row}
                ListFooterComponent={
                    <Text style={styles.footerNote}>
                        All modules live · VibeSphere Admin v1.0
                    </Text>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.md,
    },
    greeting: {
        color: Colors.textMuted,
        fontSize: FontSize.sm,
        marginBottom: 2,
    },
    title: {
        color: Colors.textPrimary,
        fontSize: FontSize.xxl,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    logoutBtn: {
        backgroundColor: Colors.dangerBg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: '#7f1d1d',
        marginTop: 4,
    },
    logoutText: {
        color: '#fca5a5',
        fontSize: FontSize.sm,
        fontWeight: '700',
    },
    brandStrip: {
        marginHorizontal: Spacing.lg,
        borderRadius: Radius.md,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    brandName: {
        color: Colors.primary,
        fontSize: FontSize.md,
        fontWeight: '700',
    },
    brandSub: {
        color: Colors.textMuted,
        fontSize: FontSize.xs,
    },
    sectionTitle: {
        color: Colors.textMuted,
        fontSize: FontSize.xs,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
    },
    listContent: {
        paddingBottom: Spacing.xxl,
        paddingHorizontal: Spacing.lg,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    menuCard: {
        width: CARD_WIDTH,
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        ...Shadow.card,
    },
    menuCardDisabled: {
        opacity: 0.6,
    },
    cardAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
    },
    menuIcon: {
        fontSize: 32,
        marginTop: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    menuLabel: {
        color: Colors.textPrimary,
        fontSize: FontSize.md,
        fontWeight: '700',
        marginBottom: Spacing.xs,
    },
    menuDesc: {
        color: Colors.textMuted,
        fontSize: FontSize.xs,
        lineHeight: 16,
        marginBottom: Spacing.sm,
    },
    soonBadge: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.borderLight,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    soonText: {
        color: Colors.textFaint,
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1,
    },
    glowRight: {
        position: 'absolute',
        top: 200,
        right: -100,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: 'rgba(108,99,255,0.06)',
    },
    footerNote: {
        color: Colors.textFaint,
        fontSize: FontSize.xs,
        textAlign: 'center',
        marginTop: Spacing.xl,
        letterSpacing: 0.5,
    },
});
