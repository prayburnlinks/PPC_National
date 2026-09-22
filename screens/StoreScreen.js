import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { useUser } from '../context/UserContext';
import { getMerchItems, createMerchOrder, submitOrderPayment } from '../services/merchService';
import { BANK_DETAILS } from '../constants/config';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';

const StoreScreen = ({ navigation }) => {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [order, setOrder] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setItems(await getMerchItems());
    setLoading(false);
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const closeModal = () => {
    setSelectedItem(null);
    setSelectedSize(null);
    setQuantity(1);
    setOrder(null);
    setSubmitted(false);
  };

  const handlePlaceOrder = async () => {
    const hasSizes = (selectedItem?.sizes || []).length > 0;
    if (hasSizes && !selectedSize) {
      Alert.alert('Select a Size', 'Please choose a size before ordering.');
      return;
    }
    setPlacingOrder(true);
    try {
      const created = await createMerchOrder(user, selectedItem, selectedSize, quantity);
      setOrder(created);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to place order.');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleUploadProof = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      setUploading(true);
      await submitOrderPayment(order, user, file);
      setSubmitted(true);
    } catch (error) {
      Alert.alert('Upload Failed', error.message || 'Failed to upload proof of payment.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Image source={require('../assets/emblem.jpg')} style={styles.emblem} resizeMode="contain" />
        <Text style={styles.headerTitle}>Store</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛍️</Text>
          <Text style={styles.emptyTitle}>No Items Yet</Text>
          <Text style={styles.emptyText}>Check back soon for merchandise.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: spacing.lg + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.itemCard}
              onPress={() => setSelectedItem(item)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" />
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.itemPrice}>R{item.price}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={!!selectedItem}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        {selectedItem && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: spacing.lg + insets.bottom }]}>
              <View style={styles.modalHandle} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image source={{ uri: selectedItem.imageUrl }} style={styles.modalImage} resizeMode="contain" />
                <Text style={styles.modalTitle}>{selectedItem.name}</Text>
                <Text style={styles.modalPrice}>R{selectedItem.price}</Text>
                {selectedItem.description ? (
                  <Text style={styles.modalDescription}>{selectedItem.description}</Text>
                ) : null}

                {!order ? (
                  <>
                    {selectedItem.sizes?.length > 0 && (
                      <>
                        <Text style={styles.sectionLabel}>SIZE</Text>
                        <View style={styles.sizeRow}>
                          {selectedItem.sizes.map((size) => (
                            <TouchableOpacity
                              key={size}
                              style={[styles.sizeChip, selectedSize === size && styles.sizeChipSelected]}
                              onPress={() => setSelectedSize(size)}
                            >
                              <Text style={[styles.sizeChipText, selectedSize === size && styles.sizeChipTextSelected]}>
                                {size}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    )}

                    <Text style={styles.sectionLabel}>QUANTITY</Text>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        style={styles.qtyButton}
                        onPress={() => setQuantity(q => Math.max(1, q - 1))}
                      >
                        <Text style={styles.qtyButtonText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyButton}
                        onPress={() => setQuantity(q => q + 1)}
                      >
                        <Text style={styles.qtyButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Total</Text>
                      <Text style={styles.totalValue}>
                        R{Math.round(selectedItem.price * quantity * 100) / 100}
                      </Text>
                    </View>
                  </>
                ) : !submitted ? (
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentInfoTitle}>💳 Payment Details</Text>
                    <Text style={styles.paymentInfoText}>
                      Complete your EFT payment of{' '}
                      <Text style={{ fontWeight: '700' }}>R{order.totalAmount}</Text>:
                    </Text>
                    <View style={styles.bankRow}>
                      <Text style={styles.bankLabel}>Bank</Text>
                      <Text style={styles.bankValue}>{BANK_DETAILS.bank}</Text>
                    </View>
                    <View style={styles.bankRow}>
                      <Text style={styles.bankLabel}>Account</Text>
                      <Text style={styles.bankValue}>{BANK_DETAILS.accountName}</Text>
                    </View>
                    <View style={styles.bankRow}>
                      <Text style={styles.bankLabel}>Number</Text>
                      <View style={styles.bankValueRow}>
                        <Text style={styles.bankValue}>{BANK_DETAILS.accountNumber}</Text>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={async () => {
                            await Clipboard.setStringAsync(BANK_DETAILS.accountNumber);
                            Alert.alert('Copied', `"${BANK_DETAILS.accountNumber}" copied to clipboard!`);
                          }}
                        >
                          <Text style={styles.copyButtonText}>Copy</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.bankRow}>
                      <Text style={styles.bankLabel}>Branch</Text>
                      <Text style={styles.bankValue}>{BANK_DETAILS.branchCode}</Text>
                    </View>
                    <View style={[styles.bankRow, styles.referenceRow]}>
                      <Text style={styles.bankLabel}>Reference</Text>
                      <Text style={[styles.bankValue, styles.referenceValue]}>{order.reference}</Text>
                    </View>

                    <Text style={styles.popHint}>Upload your proof of payment (JPG, PNG or PDF)</Text>
                    <TouchableOpacity style={styles.popUploadBtn} onPress={handleUploadProof} disabled={uploading}>
                      {uploading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.popUploadBtnText}>Upload Proof of Payment</Text>}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.submittedConfirm}>
                    <Text style={styles.submittedConfirmText}>✓ Proof of payment submitted — awaiting review</Text>
                  </View>
                )}
              </ScrollView>

              {!order && (
                <TouchableOpacity
                  style={[styles.orderButton, placingOrder && styles.buttonDisabled]}
                  onPress={handlePlaceOrder}
                  disabled={placingOrder}
                >
                  {placingOrder ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.orderButtonText}>Place Order</Text>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  emblem: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.white, marginRight: spacing.sm },
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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { fontSize: typography.sizes.base, color: colors.textSecondary, textAlign: 'center' },
  grid: {
    padding: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  itemCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceLight,
  },
  itemName: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  itemPrice: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.blue },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(10,31,68,0.6)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 36, height: 4, backgroundColor: colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg,
  },
  modalImage: {
    width: '100%', aspectRatio: 1, borderRadius: borderRadius.lg,
    marginBottom: spacing.lg, backgroundColor: colors.surfaceLight,
  },
  modalTitle: { fontSize: typography.sizes.xxl, fontWeight: '800', color: colors.textPrimary },
  modalPrice: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.blue, marginTop: spacing.xs, marginBottom: spacing.md },
  modalDescription: { fontSize: typography.sizes.sm, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.lg },
  sectionLabel: {
    fontSize: typography.sizes.xs, fontWeight: '700', color: colors.textSecondary,
    letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.md,
  },
  sizeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sizeChip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  sizeChipSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  sizeChipText: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textPrimary },
  sizeChipTextSelected: { color: colors.white },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  qtyButton: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceLight,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyButtonText: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.textPrimary },
  qtyValue: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.textPrimary, minWidth: 24, textAlign: 'center' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
  },
  totalLabel: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  totalValue: { fontSize: typography.sizes.lg, fontWeight: '800', color: colors.textPrimary },
  paymentInfo: {
    backgroundColor: colors.surfaceLight, borderRadius: borderRadius.md,
    padding: spacing.md, marginTop: spacing.md,
  },
  paymentInfoTitle: { fontSize: typography.sizes.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  paymentInfoText: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: spacing.md },
  bankRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  bankLabel: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  bankValue: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.textPrimary },
  bankValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  copyButton: {
    backgroundColor: colors.surfaceLight, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  copyButtonText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.blue },
  referenceRow: { borderBottomWidth: 0 },
  referenceValue: { color: colors.blue },
  popHint: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.md },
  popUploadBtn: { backgroundColor: colors.blue, borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center' },
  popUploadBtnText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: '600' },
  submittedConfirm: {
    backgroundColor: colors.green + '18', borderRadius: borderRadius.md,
    padding: spacing.md, alignItems: 'center', marginTop: spacing.md,
  },
  submittedConfirmText: { color: colors.green, fontWeight: '700', fontSize: typography.sizes.sm },
  orderButton: {
    backgroundColor: colors.blue, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  orderButtonText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: '700' },
  closeButton: {
    borderRadius: borderRadius.md, paddingVertical: spacing.md,
    alignItems: 'center', marginTop: spacing.sm,
  },
  closeButtonText: { color: colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: '600' },
});

export default StoreScreen;
