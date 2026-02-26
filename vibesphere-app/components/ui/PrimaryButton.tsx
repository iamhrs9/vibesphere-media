import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, FontSize, Spacing } from '@/constants/theme';

interface PrimaryButtonProps {
    label: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    variant?: 'primary' | 'danger' | 'ghost';
}

export default function PrimaryButton({
    label,
    onPress,
    loading = false,
    disabled = false,
    style,
    textStyle,
    variant = 'primary',
}: PrimaryButtonProps) {
    const isDisabled = disabled || loading;

    if (variant === 'ghost') {
        return (
            <TouchableOpacity
                style={[styles.btn, styles.ghost, isDisabled && styles.disabled, style]}
                onPress={onPress}
                disabled={isDisabled}
                activeOpacity={0.7}
            >
                {loading ? (
                    <ActivityIndicator color={Colors.primary} size="small" />
                ) : (
                    <Text style={[styles.ghostText, textStyle]}>{label}</Text>
                )}
            </TouchableOpacity>
        );
    }

    if (variant === 'danger') {
        return (
            <TouchableOpacity
                style={[styles.btn, styles.danger, isDisabled && styles.disabled, style]}
                onPress={onPress}
                disabled={isDisabled}
                activeOpacity={0.7}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text style={[styles.text, textStyle]}>{label}</Text>
                )}
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={[styles.btn, isDisabled && styles.disabled, style]}
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.85}
        >
            <LinearGradient
                colors={['#6c63ff', '#5a52d5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text style={[styles.text, textStyle]}>{label}</Text>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btn: {
        borderRadius: Radius.md,
        overflow: 'hidden',
        width: '100%',
    },
    gradient: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    text: {
        color: Colors.textPrimary,
        fontSize: FontSize.md,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    ghost: {
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: 'transparent',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    ghostText: {
        color: Colors.textMuted,
        fontSize: FontSize.md,
        fontWeight: '600',
    },
    danger: {
        backgroundColor: Colors.dangerBg,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    disabled: {
        opacity: 0.45,
    },
});
