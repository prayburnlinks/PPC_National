import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  ActivityIndicator,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import { ROLES } from '../constants/config';
import { getDocuments, uploadDocument } from '../services/documentsService';
import * as DocumentPicker from 'expo-document-picker';

const emptyUploadForm = { name: '', description: '', category: '', file: null };

const FILE_ICONS = {
  PDF: '📄',
  JPG: '🖼',
  PNG: '🖼',
  DOCX: '📝',
  DOC: '📝',
  XLSX: '📊',
  XLS: '📊',
};

const DocumentsScreen = ({ navigation }) => {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const isAdmin = user?.role === ROLES.ADMIN;
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState(emptyUploadForm);
  const [uploading, setUploading] = useState(false);

  const loadDocuments = useCallback(() => {
    return getDocuments()
      .then(docs => setDocuments(docs))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.role !== ROLES.ADMIN && user?.role !== ROLES.LEADER) {
      navigation.goBack();
      return;
    }
    loadDocuments();
  }, []);

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    setUploadForm(f => ({ ...f, file: result.assets[0] }));
  };

  const handleUpload = async () => {
    if (!uploadForm.name.trim() || !uploadForm.file) {
      Alert.alert('Missing Info', 'Please choose a file and give it a name before uploading.');
      return;
    }
    setUploading(true);
    try {
      await uploadDocument(user, {
        name: uploadForm.name.trim(),
        description: uploadForm.description.trim(),
        category: uploadForm.category.trim(),
        file: uploadForm.file,
      });
      setShowUploadForm(false);
      setUploadForm(emptyUploadForm);
      setLoading(true);
      loadDocuments();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const supported = await Linking.canOpenURL(doc.downloadUrl);
      if (supported) {
        await Linking.openURL(doc.downloadUrl);
      } else {
        Alert.alert('Error', 'Cannot open this document.');
      }
    } catch {
      Alert.alert('Error', 'Failed to open the document.');
    }
  };

  const categories = ['All', ...new Set(documents.map(d => d.category).filter(Boolean))];
  const filtered = activeCategory === 'All'
    ? documents
    : documents.filter(d => d.category === activeCategory);

  return (
    <View style={styles.container}>
      {/* Frozen Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          onPress={() => (showUploadForm ? setShowUploadForm(false) : navigation.goBack())}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Image source={require('../assets/emblem.jpg')} style={styles.emblem} resizeMode="contain" />
        <Text style={styles.headerTitle}>{showUploadForm ? 'Upload Document' : 'Documents'}</Text>
      </View>

      {showUploadForm ? (
        <ScrollView
          contentContainerStyle={[styles.formContent, { paddingBottom: spacing.xxxl + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <TouchableOpacity style={styles.filePicker} onPress={handlePickFile}>
            <Text style={styles.filePickerText}>
              {uploadForm.file ? `📎 ${uploadForm.file.name}` : '📎 Choose File (PDF, image, Word or Excel)'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Church Constitution"
            placeholderTextColor={colors.placeholder}
            value={uploadForm.name}
            onChangeText={(v) => setUploadForm(f => ({ ...f, name: v }))}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the document (optional)"
            placeholderTextColor={colors.placeholder}
            value={uploadForm.description}
            onChangeText={(v) => setUploadForm(f => ({ ...f, description: v }))}
            multiline
          />

          <Text style={styles.label}>Category</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Policies (optional)"
            placeholderTextColor={colors.placeholder}
            value={uploadForm.category}
            onChangeText={(v) => setUploadForm(f => ({ ...f, category: v }))}
          />

          <TouchableOpacity style={[styles.saveButton, uploading && styles.buttonDisabled]} onPress={handleUpload} disabled={uploading}>
            {uploading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveButtonText}>Upload Document</Text>}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
      {/* Category Filter */}
      {!loading && documents.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterContent}
        >
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, activeCategory === cat && styles.chipActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={styles.loadingText}>Loading documents...</Text>
        </View>
      ) : documents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📁</Text>
          <Text style={styles.emptyTitle}>No Documents Yet</Text>
          <Text style={styles.emptyText}>
            {isAdmin
              ? "Tap \"+ Upload Document\" below to add the first one."
              : 'Documents uploaded by an admin will appear here.'}
          </Text>
          {isAdmin && (
            <TouchableOpacity style={styles.addButton} onPress={() => setShowUploadForm(true)}>
              <Text style={styles.addButtonText}>+ Upload Document</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {isAdmin && (
            <TouchableOpacity style={styles.addButton} onPress={() => setShowUploadForm(true)}>
              <Text style={styles.addButtonText}>+ Upload Document</Text>
            </TouchableOpacity>
          )}
          {filtered.map(doc => {
            const ext = doc.fileType?.toUpperCase();
            const icon = FILE_ICONS[ext] || '📎';
            return (
              <View key={doc.id} style={styles.docCard}>
                <View style={styles.iconWrap}>
                  <Text style={styles.iconText}>{icon}</Text>
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  {!!doc.description && (
                    <Text style={styles.docDesc}>{doc.description}</Text>
                  )}
                  <View style={styles.docMeta}>
                    {!!ext && (
                      <View style={styles.metaTag}>
                        <Text style={styles.metaTagText}>{ext}</Text>
                      </View>
                    )}
                    {!!doc.fileSize && (
                      <Text style={styles.docSize}>{doc.fileSize}</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={styles.dlBtn} onPress={() => handleDownload(doc)}>
                  <Text style={styles.dlBtnIcon}>⬇</Text>
                </TouchableOpacity>
              </View>
            );
          })}
          <View style={{ height: spacing.xxxl + insets.bottom }} />
        </ScrollView>
      )}
      </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.darkBlue,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 34, height: 34, borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  backButtonText: { color: colors.white, fontSize: typography.sizes.lg },
  emblem: { width: 32, height: 32, borderRadius: 16, marginRight: spacing.sm },
  headerTitle: { color: colors.white, fontSize: typography.sizes.lg, fontWeight: '700' },
  addButton: {
    backgroundColor: colors.blue, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    alignItems: 'center', marginBottom: spacing.lg, marginTop: spacing.lg,
  },
  addButtonText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: '700' },
  // Upload form
  formContent: { padding: spacing.lg },
  filePicker: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceLight, paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md, alignItems: 'center', marginBottom: spacing.lg,
  },
  filePickerText: { color: colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: '600', textAlign: 'center' },
  label: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: spacing.sm },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: typography.sizes.sm, color: colors.textPrimary,
    marginBottom: spacing.lg, backgroundColor: colors.white,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  saveButton: {
    backgroundColor: colors.blue, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md,
  },
  buttonDisabled: { opacity: 0.6 },
  saveButtonText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: '700' },
  filterBar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 52,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  chipText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: { color: colors.white },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { color: colors.textSecondary, fontSize: typography.sizes.base },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center' },
  list: { padding: spacing.lg },
  docCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 24 },
  docInfo: { flex: 1 },
  docName: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  docDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  docMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaTag: {
    backgroundColor: colors.blue + '18',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  metaTagText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.blue },
  docSize: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  dlBtn: {
    width: 40, height: 40, borderRadius: borderRadius.md,
    backgroundColor: colors.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  dlBtnIcon: { color: colors.white, fontSize: 18 },
});

export default DocumentsScreen;
