import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL, saveStaffData, getStaffData } from '../utils/api';

export default function StaffLoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [success, setSuccess] = useState(false);

    // Auto-login check
    useEffect(() => {
        const checkLoginInfo = async () => {
            const staff = await getStaffData();
            if (staff && staff.email) {
                // If already logged in, redirect right away
                router.replace('/(tabs)');
            }
        };
        checkLoginInfo();
    }, []);

    const handleLogin = async () => {
        if (!email || !password) {
            setErrorMsg('Please enter both Staff ID / Email and Password.');
            return;
        }

        setLoading(true);
        setErrorMsg('');

        try {
            const response = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                // Save staff details locally
                await saveStaffData(data.staff);
                setSuccess(true);

                setTimeout(() => {
                    setLoading(false);
                    router.replace('/(tabs)');
                }, 1000);
            } else {
                setErrorMsg(data.message || 'Invalid Email or Password');
                setLoading(false);
            }
        } catch (err) {
            console.error('Login error', err);
            setErrorMsg('Server disconnected! Ensure your Mac server is running on the same network.');
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.card}>
                    <Text style={styles.title}>
                        VibeSphere<Text style={styles.dot}>.</Text>
                    </Text>
                    <Text style={styles.subtitle}>Secure Staff Portal Login</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Staff ID / Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. rahul@vibespheremedia.com"
                            placeholderTextColor="#94a3b8"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="#94a3b8"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                    <TouchableOpacity
                        style={[
                            styles.loginBtn,
                            loading && styles.loginBtnDisabled,
                            success && styles.loginBtnSuccess
                        ]}
                        onPress={handleLogin}
                        disabled={loading || success}
                    >
                        {loading && !success ? (
                            <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                            <Text style={styles.loginBtnText}>
                                {success ? 'Success! Redirecting...' : 'Login to Dashboard'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.backLink}>
                        <Ionicons name="arrow-back" size={14} color="#7d5fff" style={styles.backIcon} />
                        <Text style={styles.backLinkText}>Back to Main Website</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f7fe',
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: '#ffffff',
        padding: 40,
        borderRadius: 20,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 40,
        elevation: 5,
    },
    title: {
        fontSize: 28,
        color: '#111',
        fontWeight: '700',
        marginBottom: 5,
    },
    dot: {
        color: '#7d5fff',
    },
    subtitle: {
        color: '#64748b',
        fontSize: 14,
        marginBottom: 30,
    },
    inputGroup: {
        width: '100%',
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 8,
    },
    input: {
        width: '100%',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 10,
        fontSize: 14,
        color: '#334155',
        backgroundColor: '#ffffff',
    },
    errorText: {
        color: '#dc2626',
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'left',
        width: '100%',
        marginBottom: 15,
    },
    loginBtn: {
        width: '100%',
        padding: 14,
        backgroundColor: '#1e293b',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5,
        flexDirection: 'row',
        height: 50,
    },
    loginBtnDisabled: {
        backgroundColor: '#475569',
    },
    loginBtnSuccess: {
        backgroundColor: '#16a34a',
    },
    loginBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
    },
    backIcon: {
        marginRight: 6,
    },
    backLinkText: {
        fontSize: 14,
        color: '#7d5fff',
        fontWeight: '500',
    }
});
