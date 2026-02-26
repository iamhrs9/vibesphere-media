import React from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TextInputProps,
    ViewStyle,
} from 'react-native';
import { Colors, Radius, FontSize, Spacing } from '@/constants/theme';

interface InputFieldProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
}

export default function InputField({
    label,
    error,
    containerStyle,
    ...props
}: InputFieldProps) {
    return (
        <View style={[styles.container, containerStyle]}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                placeholderTextColor={Colors.textFaint}
                selectionColor={Colors.primary}
                {...props}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: Spacing.md,
    },
    label: {
        color: Colors.textMuted,
        fontSize: FontSize.sm,
        fontWeight: '600',
        marginBottom: Spacing.xs,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    input: {
        backgroundColor: Colors.surfaceAlt,
        color: Colors.textPrimary,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        fontSize: FontSize.md,
        minHeight: 52,
    },
    inputError: {
        borderColor: Colors.danger,
    },
    error: {
        color: Colors.danger,
        fontSize: FontSize.xs,
        marginTop: Spacing.xs,
    },
});
