import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Dimensions,
    ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import InputField from '@/components/ui/InputField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { API, STORAGE_KEY_TOKEN } from '@/constants/api';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Shake animation for wrong password
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const handleLogin = async () => {
        if (!password.trim()) {
            setError('Please enter the admin password.');
            shake();
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(API.login, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            const data = await res.json();

            if (data.success && data.token) {
                // Save token to AsyncStorage
                await AsyncStorage.setItem(STORAGE_KEY_TOKEN, data.token);

                // Fade out before navigating
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start(() => {
                    router.replace('/dashboard');
                });
            } else {
                setError('Incorrect password. Access denied. 🚫');
                shake();
                setPassword('');
            }
        } catch (err) {
            setError('Cannot connect to server. Check your network or server URL.');
            shake();
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <LinearGradient
                colors={['#0d0d1a', '#0a0a0a']}
                style={StyleSheet.absoluteFill}
            />

            {/* Decorative glow blob */}
            <View style={styles.glow} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.kav}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View style={[styles.card, Shadow.glow, { opacity: fadeAnim, transform: [{ translateX: shakeAnim }] }]}>

                        {/* Logo / Brand */}
                        <View style={styles.brandRow}>
                            <LinearGradient
                                colors={['#6c63ff', '#5a52d5']}
                                style={styles.logoCircle}
                            >
                                <Text style={styles.logoText}>V</Text>
                            </LinearGradient>
                        </View>

                        <Text style={styles.title}>VibeSphere</Text>
                        <Text style={styles.subtitle}>Admin Console</Text>

                        <View style={styles.divider} />

                        <Text style={styles.hint}>🔒 Authorized Personnel Only</Text>

                        {/* Password Input */}
                        <InputField
                            label="Admin Password"
                            placeholder="Enter secret password"
                            value={password}
                            onChangeText={text => {
                                setPassword(text);
                                if (error) setError('');
                            }}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="done"
                            onSubmitEditing={handleLogin}
                            error={error}
                        />

                        {/* Login Button */}
                        <PrimaryButton
                            label={loading ? 'Verifying...' : 'Access Dashboard →'}
                            onPress={handleLogin}
                            loading={loading}
                            disabled={loading}
                        />

                        <Text style={styles.footer}>
                            VibeSphere Media · Jaipur, India
                        </Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    kav: {
        flex: 1,
    },
    scroll: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: Spacing.lg,
        minHeight: height,
    },
    glow: {
        position: 'absolute',
        top: -80,
        left: -80,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(108,99,255,0.08)',
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 24,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    brandRow: {
        marginBottom: Spacing.md,
        marginTop: Spacing.sm,
    },
    logoCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        color: '#fff',
        fontSize: 36,
        fontWeight: '800',
    },
    title: {
        color: Colors.textPrimary,
        fontSize: FontSize.xxl,
        fontWeight: '800',
        letterSpacing: 1,
        marginTop: Spacing.sm,
    },
    subtitle: {
        color: Colors.primary,
        fontSize: FontSize.md,
        fontWeight: '600',
        letterSpacing: 3,
        textTransform: 'uppercase',
        marginBottom: Spacing.sm,
    },
    divider: {
        width: 40,
        height: 3,
        backgroundColor: Colors.primary,
        borderRadius: 2,
        marginVertical: Spacing.md,
    },
    hint: {
        color: Colors.textMuted,
        fontSize: FontSize.sm,
        marginBottom: Spacing.lg,
        alignSelf: 'flex-start',
    },
    footer: {
        color: Colors.textFaint,
        fontSize: FontSize.xs,
        marginTop: Spacing.lg,
        letterSpacing: 0.5,
    },
});
