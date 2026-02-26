import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, Alert, ScrollView, TextInput, Image
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, Radius, Shadow } from '@/constants/theme';
import { API, ADMIN_HEADERS, STORAGE_KEY_TOKEN, BASE_URL } from '@/constants/api';

interface Blog {
    _id: string;
    title: string;
    slug: string;
    image: string;
    content: string;
    date: string;
}

export default function BlogScreen() {
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Form
    const [editId, setEditId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [image, setImage] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { checkAuth(); fetchBlogs(); }, []);

    const checkAuth = async () => {
        const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
        if (!token) router.replace('/');
    };

    const fetchBlogs = async () => {
        try {
            const res = await fetch(API.blogs);
            const data: Blog[] = await res.json();
            setBlogs(data);
        } catch { } finally { setLoading(false); setRefreshing(false); }
    };

    const onRefresh = useCallback(() => { setRefreshing(true); fetchBlogs(); }, []);

    const generateSlug = (text: string) => {
        return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
    };

    const handleTitleChange = (text: string) => {
        setTitle(text);
        if (!editId) setSlug(generateSlug(text));
    };

    const resetForm = () => {
        setEditId(null); setTitle(''); setSlug(''); setImage(''); setContent('');
    };

    const loadForEdit = (blog: Blog) => {
        setEditId(blog._id); setTitle(blog.title); setSlug(blog.slug);
        setImage(blog.image); setContent(blog.content);
    };

    const submitBlog = async () => {
        if (!title.trim() || !slug.trim() || !image.trim() || !content.trim()) {
            Alert.alert('Missing Fields', 'All fields are required.'); return;
        }
        setSubmitting(true);
        try {
            const url = editId ? `${BASE_URL}/api/edit-blog/${editId}` : API.addBlog;
            const method = editId ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method, headers: ADMIN_HEADERS,
                body: JSON.stringify({ title, slug, image, content }),
            });
            const data = await res.json();
            if (data.success) {
                Alert.alert(editId ? '✅ Blog Updated!' : '🚀 Blog Published!', data.message || 'Done.');
                resetForm(); fetchBlogs();
            } else { Alert.alert('Failed', data.error || 'Could not save blog.'); }
        } catch { Alert.alert('Error', 'Network error.'); }
        finally { setSubmitting(false); }
    };

    const deleteBlog = (blog: Blog) => {
        Alert.alert('Delete Blog', `Delete "${blog.title}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await fetch(`${BASE_URL}/api/delete-blog/${blog._id}`, { method: 'DELETE', headers: ADMIN_HEADERS });
                        const data = await res.json();
                        if (data.success) fetchBlogs();
                    } catch { Alert.alert('Error', 'Network error.'); }
                }
            }
        ]);
    };

    const renderBlog = ({ item }: { item: Blog }) => (
        <View style={styles.card}>
            {item.image ? (
                <Image source={{ uri: item.image }} style={styles.blogImage} resizeMode="cover" />
            ) : null}
            <View style={styles.cardBody}>
                <Text style={styles.blogTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.blogSlug}>/{item.slug}</Text>
                <Text style={styles.blogDate}>
                    {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                <View style={styles.blogActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => loadForEdit(item)}>
                        <Text style={styles.editBtnText}>✏️ Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteBlog(item)}>
                        <Text style={styles.deleteBtnText}>🗑 Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <LinearGradient colors={['#0d0d1a', '#0a0a0a']} style={StyleSheet.absoluteFill} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>✍️ Blog</Text>
                <Text style={styles.count}>{blogs.length} posts</Text>
            </View>

            <FlatList
                data={blogs}
                keyExtractor={i => i._id}
                renderItem={renderBlog}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                ListEmptyComponent={
                    loading
                        ? <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
                        : <View style={styles.center}><Text style={styles.emptyText}>No blog posts yet. Write one!</Text></View>
                }
                ListHeaderComponent={
                    <View style={styles.form}>
                        <View style={styles.formTitleRow}>
                            <Text style={styles.formTitle}>{editId ? '✏️ Edit Blog' : '📝 New Blog Post'}</Text>
                            {editId ? (
                                <TouchableOpacity onPress={resetForm}>
                                    <Text style={styles.cancelEdit}>Cancel Edit</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {[
                            { label: 'Title', val: title, set: handleTitleChange, placeholder: 'e.g. How to Grow on Instagram' },
                            { label: 'Slug (URL)', val: slug, set: setSlug, placeholder: 'how-to-grow-on-instagram' },
                            { label: 'Image URL', val: image, set: setImage, placeholder: 'https://your-image-url.com/img.jpg' },
                        ].map(f => (
                            <View key={f.label} style={{ marginBottom: Spacing.md }}>
                                <Text style={styles.fieldLabel}>{f.label}</Text>
                                <TextInput style={styles.input} value={f.val} onChangeText={f.set} placeholder={f.placeholder} placeholderTextColor={Colors.textFaint} selectionColor={Colors.primary} autoCapitalize="none" />
                            </View>
                        ))}

                        <Text style={styles.fieldLabel}>Content (Full Article)</Text>
                        <TextInput
                            style={[styles.input, styles.contentArea]} value={content} onChangeText={setContent}
                            placeholder="Write your full blog content here..." placeholderTextColor={Colors.textFaint}
                            multiline selectionColor={Colors.primary}
                        />

                        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={submitBlog} disabled={submitting}>
                            <LinearGradient colors={['#ec4899', '#db2777']} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{editId ? 'Update Blog ✅' : 'Publish Blog 🚀'}</Text>}
                            </LinearGradient>
                        </TouchableOpacity>

                        <Text style={styles.sectionLabel}>EXISTING POSTS</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
    backBtn: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm },
    backText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
    headerTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '800' },
    count: { color: Colors.textMuted, fontSize: FontSize.sm },
    form: { padding: Spacing.lg, paddingBottom: 0 },
    formTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
    formTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '800' },
    cancelEdit: { color: Colors.danger, fontSize: FontSize.sm, fontWeight: '600' },
    fieldLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.xs },
    input: { backgroundColor: Colors.surfaceAlt, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, minHeight: 52 },
    contentArea: { minHeight: 160, textAlignVertical: 'top', marginBottom: Spacing.md },
    submitBtn: { borderRadius: Radius.md, overflow: 'hidden', marginBottom: Spacing.xl },
    submitGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
    submitText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
    sectionLabel: { color: Colors.textFaint, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 2, marginBottom: Spacing.md },
    listContent: { paddingBottom: Spacing.xxl },
    center: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    emptyText: { color: Colors.textMuted, fontSize: FontSize.md, textAlign: 'center', padding: Spacing.lg },
    card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadow.card },
    blogImage: { width: '100%', height: 140 },
    cardBody: { padding: Spacing.md },
    blogTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700', marginBottom: 4 },
    blogSlug: { color: Colors.textFaint, fontSize: FontSize.xs, marginBottom: 4 },
    blogDate: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: Spacing.md },
    blogActions: { flexDirection: 'row', gap: Spacing.sm },
    editBtn: { flex: 1, backgroundColor: Colors.primaryGlow, borderWidth: 1, borderColor: Colors.primary, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
    editBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700' },
    deleteBtn: { flex: 1, backgroundColor: Colors.dangerBg, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
    deleteBtnText: { color: '#fca5a5', fontSize: FontSize.sm, fontWeight: '700' },
});
