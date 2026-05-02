/**
 * Register Screen
 * User registration with role selection and approval logic
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { registerUser } from '../services/authService';
import { ROLES, CONGREGATIONS } from '../constants/config';

const RegisterScreen = ({ navigation, onRegisterSuccess }) => {
  const [step, setStep] = useState(1); // Step 1: Basic, Step 2: Role, Step 3: Congregation
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(ROLES.MEMBER);
  const [congregation, setCongregation] = useState('');
  const [district, setDistrict] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCongregationModal, setShowCongregationModal] = useState(false);

  const handleNext = () => {
    if (step === 1) {
      if (!name || !email || !phone || !password || !confirmPassword) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleRegister = async () => {
    if (!congregation || !district) {
      Alert.alert('Error', 'Please select your congregation and district');
      return;
    }

    setLoading(true);
    try {
      const result = await registerUser({
        email,
        password,
        name,
        phone,
        congregation,
        district,
        role,
      });

      setLoading(false);

      Alert.alert('Success', result.message, [
        {
          text: 'OK',
          onPress: () => {
            if (result.status === 'approved') {
              navigation.navigate('Login');
            } else {
              navigation.navigate('Login');
            }
          },
        },
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert('Registration Failed', error.message || 'An error occurred');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.navigate('Login');
    }
  };

  const selectCongregation = (cong) => {
    setCongregation(cong);
    // Auto-set district based on congregation
    if (cong.includes('Cape Town')) {
      setDistrict('Western Cape (3)');
    } else if (cong.includes('Pretoria')) {
      setDistrict('Gauteng North (1)');
    } else if (cong.includes('Soweto')) {
      setDistrict('Gauteng South (2)');
    } else if (cong.includes('Durban')) {
      setDistrict('KwaZulu-Natal (4)');
    }
    setShowCongregationModal(false);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.stepIndicator}>Step {step} of 3</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Basic Information</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor={colors.placeholder}
                editable={!loading}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="+27 XX XXX XXXX"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
                editable={!loading}
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.passwordToggleText}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Text style={styles.passwordToggleText}>
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Step 2: Role Selection */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Your Role</Text>
            <Text style={styles.stepSubtitle}>
              Choose the role that best describes you in the church
            </Text>

            {Object.values(ROLES).map(r => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.roleCard,
                  role === r && styles.roleCardSelected,
                ]}
                onPress={() => setRole(r)}
              >
                <View style={styles.roleCardContent}>
                  <Text style={styles.roleIcon}>
                    {r === ROLES.MEMBER ? '👥' : r === ROLES.LEADER ? '🎯' : '👑'}
                  </Text>
                  <View style={styles.roleTextContainer}>
                    <Text style={styles.roleName}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                    <Text style={styles.roleDescription}>
                      {r === ROLES.MEMBER
                        ? 'Regular church member'
                        : r === ROLES.LEADER
                        ? 'Ministry leader or pastor'
                        : 'Administrative access'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioButton,
                      role === r && styles.radioButtonSelected,
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.roleInfoBox}>
              <Text style={styles.roleInfoTitle}>ℹ️ Role Information</Text>
              <Text style={styles.roleInfoText}>
                {role === ROLES.MEMBER
                  ? 'Members can register for events, give tithes, and access church media.'
                  : role === ROLES.LEADER
                  ? 'Leaders require admin approval. You\'ll have additional event management capabilities.'
                  : 'Admins require approval and have full platform access.'}
              </Text>
            </View>
          </View>
        )}

        {/* Step 3: Congregation & District */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Your Congregation</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Select Congregation</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowCongregationModal(true)}
              >
                <Text style={styles.selectButtonText}>
                  {congregation || 'Select your congregation'}
                </Text>
                <Text style={styles.selectButtonIcon}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>District</Text>
              <View style={styles.districtBox}>
                <Text style={styles.districtText}>
                  {district || 'Will be auto-selected based on congregation'}
                </Text>
              </View>
            </View>

            <View style={styles.termsBox}>
              <Text style={styles.termsCheckbox}>☑️</Text>
              <Text style={styles.termsText}>
                I agree to the Terms of Service and Privacy Policy
              </Text>
            </View>
          </View>
        )}

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleBack}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={step < 3 ? handleNext : handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {step < 3 ? 'Next' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Congregation Modal */}
        <Modal
          visible={showCongregationModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCongregationModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Congregation</Text>
                <TouchableOpacity onPress={() => setShowCongregationModal(false)}>
                  <Text style={styles.modalCloseButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={CONGREGATIONS}
                keyExtractor={(item, idx) => idx.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.congregationItem}
                    onPress={() => selectCongregation(item)}
                  >
                    <Text style={styles.congregationItemText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  backButtonText: {
    fontSize: typography.sizes.xl,
    color: colors.purple,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stepIndicator: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.purple,
  },
  stepContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  stepTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  stepSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  inputWrapper: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
  },
  passwordToggleText: {
    fontSize: typography.sizes.lg,
    padding: spacing.sm,
  },
  roleCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
  },
  roleCardSelected: {
    borderColor: colors.purple,
    backgroundColor: colors.surfaceLight,
  },
  roleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIcon: {
    fontSize: typography.sizes.xxxl,
    marginRight: spacing.md,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleName: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  roleDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioButtonSelected: {
    borderColor: colors.purple,
    backgroundColor: colors.purple,
  },
  roleInfoBox: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  roleInfoTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.purple,
    marginBottom: spacing.sm,
  },
  roleInfoText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
  },
  selectButtonText: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
  },
  selectButtonIcon: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  districtBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceLight,
  },
  districtText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  termsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
  },
  termsCheckbox: {
    fontSize: typography.sizes.lg,
    marginRight: spacing.md,
    marginTop: spacing.xs,
  },
  termsText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.purple,
  },
  secondaryButton: {
    backgroundColor: colors.border,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalCloseButton: {
    fontSize: typography.sizes.xl,
    color: colors.textSecondary,
  },
  congregationItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  congregationItemText: {
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
  },
});

export default RegisterScreen;
