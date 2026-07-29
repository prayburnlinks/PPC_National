import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import { ROLES } from '../constants/config';
import { getDocuments } from '../services/documentsService';

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
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    if (user?.role !== ROLES.ADMIN && user?.role !== ROLES.LEADER) {
      navigation.goBack();
      return;
    }
    getDocuments()
      .then(docs => setDocuments(docs))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Image source={require('../assets/emblem.jpg')} style={styles.emblem} resizeMode="contain" />
        <Text style={styles.headerTitle}>Documents</Text>
      </View>

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
            Documents will appear here once uploaded in the Firebase Console.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
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
