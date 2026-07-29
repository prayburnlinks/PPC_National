import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { NATIONAL_BOARD } from '../constants/config';

const NationalBoardScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [previewMember, setPreviewMember] = useState(null);

  const title = route?.params?.title || 'National Board';
  const board = route?.params?.board || NATIONAL_BOARD;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Image source={require('../assets/emblem.jpg')} style={styles.emblem} resizeMode="contain" />
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSub}>Pentecostal Protestant Church · SA</Text>
      </View>

      {/* Board Members */}
      <View style={styles.content}>
        <Text style={styles.sectionLabel}>BOARD MEMBERS</Text>

        {board.map((member) => (
          <View key={member.id} style={styles.card}>
            <TouchableOpacity
              style={styles.photoWrap}
              activeOpacity={member.photoFull ? 0.7 : 1}
              onPress={() => member.photoFull && setPreviewMember(member)}
              disabled={!member.photoFull}
            >
              {member.photo ? (
                <Image source={member.photo} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoInitials}>
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.info}>
              <Text style={styles.name}>{member.name}</Text>
              <Text style={styles.portfolio}>{member.portfolio}</Text>
            </View>
          </View>
        ))}

        <View style={[styles.spacer, { height: spacing.xxxl + insets.bottom }]} />
      </View>

      <Modal
        visible={!!previewMember}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewMember(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPreviewMember(null)}
        >
          {previewMember && (
            <View style={styles.modalContent}>
              <Image source={previewMember.photoFull} style={styles.modalPhoto} resizeMode="cover" />
              <Text style={styles.modalName}>{previewMember.name}</Text>
              <Text style={styles.modalPortfolio}>{previewMember.portfolio}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    backgroundColor: colors.darkBlue,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  backText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },
  emblem: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  heroTitle: {
    color: colors.white,
    fontSize: typography.sizes.xxl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: typography.sizes.base,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  photoWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
  },
  photo: {
    width: 64,
    height: 64,
  },
  photoPlaceholder: {
    width: 64,
    height: 64,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitials: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.blue,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  portfolio: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  spacer: {
    height: spacing.xxxl,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalPhoto: {
    width: 300,
    height: 400,
    borderRadius: borderRadius.lg,
  },
  modalName: {
    color: colors.white,
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    marginTop: spacing.lg,
  },
  modalPortfolio: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
});

export default NationalBoardScreen;
