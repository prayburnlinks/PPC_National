import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { useUser } from '../context/UserContext';
import {
  getAllMerchItemsForAdmin,
  createMerchItem,
  updateMerchItem,
} from '../services/merchService';
import * as DocumentPicker from 'expo-document-picker';

const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const emptyForm = { name: '', description: '', price: '', sizes: [...ALL_SIZES], imageFile: null };

const AdminMerchItemsScreen = ({ navigation }) => {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await getAllMerchItemsForAdmin());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAddForm = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditingItem(item);
    setForm({ name: item.name, description: item.description || '', price: String(item.price), sizes: item.sizes || [], imageFile: null });
    setShowForm(true);
  };

  const toggleSize = (size) => {
    setForm(f => ({
      ...f,
      sizes: f.sizes.includes(size) ? f.sizes.filter(s => s !== size) : [...f.sizes, size],
    }));
  };

  const handlePickImage = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    setForm(f => ({ ...f, imageFile: result.assets[0] }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price || (!editingItem && !form.imageFile)) {
      Alert.alert('Missing Info', 'Please fill in the name, price, and a photo before saving.');
      return;
    }
    setSaving(true);
    try {
      const price = parseFloat(form.price);
      if (editingItem) {
        await updateMerchItem(editingItem.id, {
          name: form.name.trim(),
          description: form.description.trim(),
          price,
          sizes: form.sizes,
          ...(form.imageFile ? { imageFile: form.imageFile } : {}),
        });
      } else {
        await createMerchItem(user, {
          name: form.name.trim(),
          description: form.description.trim(),
          price,
          currency: 'ZAR',
          sizes: form.sizes,
          imageFile: form.imageFile,
        });
      }
      setShowForm(false);
      load();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (item) => {
    try {
      await updateMerchItem(item.id, { published: !item.published });
      setItems(prev => prev.map(i => (i.id === item.id ? { ...i, published: !i.published } : i)));
    } catch {
      Alert.alert('Error', 'Failed to update item.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => (showForm ? setShowForm(false) : navigation.goBack())} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{showForm ? (editingItem ? 'Edit Item' : 'Add Item') : 'Manage Merchandise'}</Text>
      </View>

      {showForm ? (
        <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
            {form.imageFile ? (
              <Image source={{ uri: form.imageFile.uri }} style={styles.imagePreview} />
            ) : editingItem?.imageUrl ? (
              <Image source={{ uri: editingItem.imageUrl }} style={styles.imagePreview} />
            ) : (
              <Text style={styles.imagePickerText}>📷 Add Photo</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Burning Fire T-Shirt"
            placeholderTextColor={colors.placeholder}
            value={form.name}
            onChangeText={(v) => setForm(f => ({ ...f, name: v }))}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the item"
            placeholderTextColor={colors.placeholder}
            value={form.description}
            onChangeText={(v) => setForm(f => ({ ...f, description: v }))}
            multiline
          />

          <Text style={styles.label}>Price (ZAR)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.placeholder}
            keyboardType="numeric"
            value={form.price}
            onChangeText={(v) => setForm(f => ({ ...f, price: v }))}
          />

          <Text style={styles.label}>Available Sizes</Text>
          <View style={styles.sizeRow}>
            {ALL_SIZES.map((size) => (
              <TouchableOpacity
                key={size}
                style={[styles.sizeChip, form.sizes.includes(size) && styles.sizeChipSelected]}
                onPress={() => toggleSize(size)}
              >
                <Text style={[styles.sizeChipText, form.sizes.includes(size) && styles.sizeChipTextSelected]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.saveButton, saving && styles.buttonDisabled]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveButtonText}>Save Item</Text>}
          </TouchableOpacity>
        </ScrollView>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.addButton} onPress={openAddForm}>
            <Text style={styles.addButtonText}>+ Add Item</Text>
          </TouchableOpacity>

          {items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🛍️</Text>
              <Text style={styles.emptyTitle}>No Items Yet</Text>
              <Text style={styles.emptyText}>Add your first merchandise item above.</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>R{item.price}</Text>
                  <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => openEditForm(item)}>
                      <Text style={styles.editLink}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => togglePublished(item)}>
                      <View style={[styles.statusBadge, { backgroundColor: item.published ? '#F0FBF6' : '#FFF0EE' }]}>
                        <Text style={[styles.statusBadgeText, { color: item.published ? colors.green : colors.red }]}>
                          {item.published ? 'Published' : 'Unpublished'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
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
  headerTitle: { color: colors.white, fontSize: typography.sizes.lg, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.lg },
  addButton: {
    backgroundColor: colors.blue, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.lg,
  },
  addButtonText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing.huge },
  emptyIcon: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center' },
  itemCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  itemImage: { width: 56, height: 56, borderRadius: borderRadius.md, backgroundColor: colors.surfaceLight },
  itemInfo: { flex: 1 },
  itemName: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  itemPrice: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  editLink: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.blue },
  statusBadge: { borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  statusBadgeText: { fontSize: typography.sizes.xs, fontWeight: '700' },
  // Form
  formContent: { padding: spacing.lg },
  imagePicker: {
    width: '100%', aspectRatio: 1, borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
  },
  imagePickerText: { color: colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: '600' },
  imagePreview: { width: '100%', height: '100%' },
  label: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: spacing.sm },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: typography.sizes.sm, color: colors.textPrimary,
    marginBottom: spacing.lg, backgroundColor: colors.white,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  sizeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  sizeChip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  sizeChipSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  sizeChipText: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textPrimary },
  sizeChipTextSelected: { color: colors.white },
  saveButton: {
    backgroundColor: colors.blue, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md,
  },
  buttonDisabled: { opacity: 0.6 },
  saveButtonText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: '700' },
});

export default AdminMerchItemsScreen;
