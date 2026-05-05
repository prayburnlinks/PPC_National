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
  Modal,
  Platform,
  Image,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { loginUser, sendResetEmail } from '../services/authService';
import { useUser } from '../context/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LoginScreen = ({ navigation }) => {
  const { onLogin } = useUser();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = () => {
    setResetEmail(email);
    setShowResetModal(true);
  };

  const handleSendReset = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    setResetLoading(true);
    try {
      await sendResetEmail(resetEmail.trim());
      setResetLoading(false);
      setShowResetModal(false);
      Alert.alert('Email Sent', 'Check your inbox for the password reset link.');
    } catch (error) {
      setResetLoading(false);
      Alert.alert('Error', error.message || 'Failed to send reset email');
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const result = await loginUser(email, password);
      setLoading(false);
      if (result.success) {
        onLogin(result.user);
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Login Failed', error.message || 'An error occurred');
    }
  };

  return (
    <View style={styles.root}>
      {/* Top blue hero section */}
      <View style={[styles.hero, { paddingTop: insets.top + spacing.xxxl }]}>
        <View style={styles.emblemWrapper}>
          <Image
            source={require('../assets/emblem.jpg')}
            style={styles.emblem}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.heroTitle}>PPC National Church</Text>
        <Text style={styles.heroSub}>Pentecostal Protestant Church</Text>

        {/* Red accent bar */}
        <View style={styles.accentBar}>
          <View style={styles.accentSegment} />
          <View style={[styles.accentSegment, styles.accentWhite]} />
          <View style={styles.accentSegment} />
        </View>
      </View>

      {/* White card sliding up over the blue */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.formTitle}>Welcome Back</Text>
          <Text style={styles.formSub}>Sign in to your account</Text>

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
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                <Text style={styles.passwordToggleText}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.forgotContainer} onPress={handleForgotPassword}>
            <Text style={styles.forgotLink}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            "The fire must be kept burning on the altar continuously; it must not go out."
          </Text>
          <Text style={styles.footerRef}>— Leviticus 6:13</Text>
        </View>
      </ScrollView>
      {/* Forgot Password Modal */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSubtitle}>Enter your email to receive a reset link.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="your@email.com"
              placeholderTextColor={colors.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              value={resetEmail}
              onChangeText={setResetEmail}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.modalButton, resetLoading && styles.buttonDisabled]}
              onPress={handleSendReset}
              disabled={resetLoading}
            >
              {resetLoading
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.modalButtonText}>Send Reset Link</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowResetModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.darkBlue,
  },
  hero: {
    backgroundColor: colors.darkBlue,
    alignItems: 'center',
    paddingBottom: spacing.xxxl + 20,
    paddingHorizontal: spacing.lg,
  },
  emblemWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 4,
    borderColor: colors.red,
    overflow: 'hidden',
  },
  emblem: {
    width: 130,
    height: 130,
  },
  heroTitle: {
    color: colors.white,
    fontSize: typography.sizes.xxl,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: typography.sizes.sm,
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
  accentBar: {
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.sm,
  },
  accentSegment: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.red,
  },
  accentWhite: {
    backgroundColor: colors.white,
  },
  scroll: {
    flex: 1,
    marginTop: -24,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  formTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  formSub: {
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
    backgroundColor: colors.white,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
  },
  passwordToggle: {
    padding: spacing.sm,
  },
  passwordToggleText: {
    fontSize: typography.sizes.lg,
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginBottom: spacing.lg,
  },
  forgotLink: {
    fontSize: typography.sizes.sm,
    color: colors.blue,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: colors.blue,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  signupLink: {
    fontSize: typography.sizes.sm,
    color: colors.blue,
    fontWeight: '700',
  },
  footer: {
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.lg,
  },
  footerText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerRef: {
    fontSize: typography.sizes.sm,
    color: colors.red,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,31,68,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  modalButton: {
    backgroundColor: colors.blue,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: '700',
  },
  modalCancel: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
});

export default LoginScreen;
