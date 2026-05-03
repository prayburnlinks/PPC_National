/**
 * Giving Screen
 * Tithe and offering donation interface
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { logGivingTransaction } from '../services/firestoreService';
import { GIVING_FUNDS, BANK_DETAILS } from '../constants/config';
import { useUser } from '../context/UserContext';

const GivingScreen = ({ navigation }) => {
  const { user } = useUser();
  const [selectedFund, setSelectedFund] = useState(GIVING_FUNDS[0].id);
  const [selectedAmount, setSelectedAmount] = useState('250');
  const [customAmount, setCustomAmount] = useState('');
  const [showBankModal, setShowBankModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const getDisplayAmount = () => {
    if (selectedAmount === 'other') return customAmount ? `R${customAmount}` : 'Enter amount';
    return `R${selectedAmount}`;
  };

  const handleProceedToGive = async () => {
    if (!selectedFund || (!selectedAmount || selectedAmount === 'other' && !customAmount)) {
      Alert.alert('Error', 'Please select an amount');
      return;
    }

    setLoading(true);
    try {
      const amount = selectedAmount === 'other' ? parseInt(customAmount) : parseInt(selectedAmount);
      
      await logGivingTransaction(user.uid, {
        fund: selectedFund,
        amount,
        paymentMethod: 'eft',
        reference: `${user.name} · ${user.congregation}`,
      });

      setLoading(false);
      setShowBankModal(true);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to process transaction');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Header */}
      <View style={styles.heroHeader}>
        <Text style={styles.heroIcon}>🙏</Text>
        <Text style={styles.heroTitle}>Give to God's Work</Text>
        <Text style={styles.heroVerse}>
          "Bring the whole tithe into the storehouse…" — Malachi 3:10
        </Text>
      </View>

      <View style={styles.content}>
        {/* Fund Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Fund</Text>
          <View style={styles.fundGrid}>
            {GIVING_FUNDS.map((fund) => (
              <TouchableOpacity
                key={fund.id}
                style={[
                  styles.fundCard,
                  selectedFund === fund.id && styles.fundCardSelected,
                ]}
                onPress={() => setSelectedFund(fund.id)}
              >
                <Text style={styles.fundIcon}>{fund.icon}</Text>
                <Text style={styles.fundName}>{fund.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Amount Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amount (ZAR)</Text>
          <View style={styles.amountGrid}>
            {['100', '250', '500', '1000', '2500', 'other'].map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[
                  styles.amountButton,
                  selectedAmount === amt && styles.amountButtonSelected,
                ]}
                onPress={() => setSelectedAmount(amt)}
              >
                <Text
                  style={[
                    styles.amountButtonText,
                    selectedAmount === amt && styles.amountButtonTextSelected,
                  ]}
                >
                  {amt === 'other' ? 'Other' : `R${amt}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedAmount === 'other' && (
            <TextInput
              style={styles.customAmountInput}
              placeholder="Enter amount in ZAR"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
              value={customAmount}
              onChangeText={setCustomAmount}
            />
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.methodCard}>
            <View style={styles.methodIconBox}>🏦</View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>EFT / Bank Transfer</Text>
              <Text style={styles.methodSub}>FNB · ABSA · Capitec · Nedbank</Text>
            </View>
            <View style={styles.radioButton}>
              <View style={styles.radioDot} />
            </View>
          </View>
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.giveButton, loading && styles.giveButtonDisabled]}
          onPress={handleProceedToGive}
          disabled={loading}
        >
          <Text style={styles.giveButtonText}>
            Proceed to Give {getDisplayAmount()} →
          </Text>
        </TouchableOpacity>

        <Text style={styles.secureNote}>🔒 All transactions are secure and encrypted</Text>
        <View style={styles.spacer} />
      </View>

      {/* Bank Details Modal */}
      <Modal visible={showBankModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>EFT Banking Details</Text>

            {Object.entries(BANK_DETAILS).map(([key, value]) => (
              <View key={key} style={styles.bankRow}>
                <Text style={styles.bankLabel}>
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                </Text>
                <View style={styles.bankValueRow}>
                  <Text style={styles.bankValue}>{value}</Text>
                  {(key === 'accountNumber' || key === 'branchCode') && (
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => {
                        Alert.alert('Copied', `"${value}" copied to clipboard!`);
                      }}
                    >
                      <Text style={styles.copyButtonText}>Copy</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            <View style={styles.referenceInfo}>
              <Text style={styles.referenceTitle}>📌 Example:</Text>
              <Text style={styles.referenceExample}>
                <Text style={{ fontWeight: '700' }}>Nomsa Dlamini · CT Central</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowBankModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Done — I've noted the details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroHeader: {
    backgroundColor: `linear-gradient(145deg, ${colors.orangeRed}, ${colors.gold})`,
    backgroundColor: colors.orangeRed,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  heroIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  heroTitle: {
    color: colors.white,
    fontSize: typography.sizes.xxl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  heroVerse: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  fundGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  fundCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  fundCardSelected: {
    borderColor: colors.lightPurple,
    backgroundColor: colors.surfaceLight,
  },
  fundIcon: {
    fontSize: typography.sizes.lg,
    marginBottom: spacing.sm,
  },
  fundName: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amountButton: {
    width: '31%',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  amountButtonSelected: {
    borderColor: colors.lightPurple,
    backgroundColor: colors.surfaceLight,
  },
  amountButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  amountButtonTextSelected: {
    color: colors.purple,
  },
  customAmountInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
  },
  methodCard: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.lightPurple,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  methodIconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: typography.sizes.lg,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  methodSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  radioButton: {
    width: 18,
    height: 18,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.lightPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: borderRadius.full,
    backgroundColor: colors.lightPurple,
  },
  giveButton: {
    backgroundColor: colors.purple,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  giveButtonDisabled: {
    opacity: 0.6,
  },
  giveButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: '700',
  },
  secureNote: {
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  spacer: {
    height: spacing.lg,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 10, 46, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  modalHandle: {
    width: 32,
    height: 3,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bankLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  bankValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bankValue: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  copyButton: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  copyButtonText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.purple,
  },
  referenceInfo: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginVertical: spacing.lg,
  },
  referenceTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  referenceExample: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
  },
  modalCloseButton: {
    backgroundColor: colors.darkPurple,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  modalCloseButtonText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },
});

export default GivingScreen;
