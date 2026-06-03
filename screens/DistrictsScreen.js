/**
 * Districts Screen
 * Shows all PPC districts
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { DISTRICTS, CONGREGATIONS } from '../constants/config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DistrictsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState([]);
  const toggleDistrict = (name) => setExpanded(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);

  return (
    <View style={styles.container}>
      {/* Frozen Header */}
      <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
        <Image source={require('../assets/emblem.jpg')} style={styles.emblem} resizeMode="contain" />
        <Text style={styles.heroTitle}>PPC Districts</Text>
        <Text style={styles.heroSub}>National Church of South Africa</Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{DISTRICTS.length}</Text>
            <Text style={styles.statLabel}>Districts</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{CONGREGATIONS.length}</Text>
            <Text style={styles.statLabel}>Congregations</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* National Board Entry */}
        <TouchableOpacity
          style={styles.boardCard}
          onPress={() => navigation.navigate('NationalBoard')}
          activeOpacity={0.8}
        >
          <View style={styles.boardLeft}>
            <Text style={styles.boardIcon}>👔</Text>
            <View>
              <Text style={styles.boardTitle}>National Board</Text>
              <Text style={styles.boardSub}>Meet our leadership team</Text>
            </View>
          </View>
          <Text style={styles.boardArrow}>›</Text>
        </TouchableOpacity>

        {DISTRICTS.map((district, idx) => {
          const isOpen = expanded.includes(district.name);
          const congregations = CONGREGATIONS.filter(c => c.district === district.name);
          return (
            <View key={district.id}>
              <TouchableOpacity
                style={styles.districtItem}
                onPress={() => toggleDistrict(district.name)}
                activeOpacity={0.8}
              >
                <View style={styles.districtLeft}>
                  <View style={styles.districtNum}>
                    <Text style={styles.districtNumText}>{district.id}</Text>
                  </View>
                  <View>
                    <Text style={styles.districtName}>{district.name}</Text>
                    <Text style={styles.districtCong}>
                      📍 {district.location} · {district.congregations} congregations
                    </Text>
                  </View>
                </View>
                <Text style={styles.districtArrow}>{isOpen ? '˅' : '›'}</Text>
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.expandedPanel}>
                  {/* District Board */}
                  <Text style={styles.sectionLabel}>DISTRICT BOARD</Text>
                  <View style={styles.boardGrid}>
                    {[
                      { role: 'Chairperson',        name: district.board?.chairperson },
                      { role: 'Deputy Chairperson', name: district.board?.deputy },
                      { role: 'Secretary',          name: district.board?.secretary },
                      { role: 'Treasurer',          name: district.board?.treasurer },
                    ].map(({ role, name }) => (
                      <View key={role} style={styles.boardCell}>
                        <Text style={styles.boardCellRole}>{role}</Text>
                        <Text style={[styles.boardCellName, name === 'TBA' && styles.boardCellTBA]}>
                          {name || 'TBA'}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Congregations */}
                  <Text style={styles.sectionLabel}>CONGREGATIONS</Text>
                  {congregations.map((c) => (
                    <View key={c.name} style={styles.congregationItem}>
                      <View style={styles.congregationRow}>
                        <Text style={styles.congregationText}>{c.name}</Text>
                        {c.assemblyName && (
                          <Text style={styles.assemblyName}>{c.assemblyName}</Text>
                        )}
                      </View>
                      {c.pastor && (
                        <Text style={styles.pastorText}>🙏 {c.pastor}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
        <View style={styles.spacer} />
      </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emblem: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  hero: {
    backgroundColor: colors.darkBlue,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  heroTitle: {
    color: colors.white,
    fontSize: typography.sizes.xxxl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  heroSub: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: typography.sizes.md,
    marginBottom: spacing.lg,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  stat: {
    alignItems: 'center',
  },
  statNum: {
    color: colors.gold,
    fontSize: typography.sizes.h1,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: typography.sizes.sm,
    letterSpacing: 0.5,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  districtItem: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  districtLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  districtNum: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  districtNumText: {
    color: colors.white,
    fontSize: typography.sizes.base,
    fontWeight: '700',
  },
  districtName: {
    fontSize: typography.sizes.base,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  districtCong: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  districtArrow: {
    fontSize: typography.sizes.xl,
    color: '#ccc',
  },
  spacer: {
    height: spacing.lg,
  },
  expandedPanel: {
    paddingHorizontal: spacing.lg + 8,
    paddingBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: 12,
  },
  boardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  boardCell: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  boardCellRole: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 3,
  },
  boardCellName: {
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  boardCellTBA: {
    color: colors.placeholder,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  congregationItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: spacing.sm,
  },
  congregationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  congregationText: {
    fontSize: typography.sizes.base,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  assemblyName: {
    fontSize: typography.sizes.sm,
    color: colors.blue,
    fontWeight: '600',
  },
  pastorText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  boardCard: {
    backgroundColor: colors.darkBlue,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  boardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  boardIcon: {
    fontSize: 28,
  },
  boardTitle: {
    color: colors.white,
    fontSize: typography.sizes.base,
    fontWeight: '700',
  },
  boardSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  boardArrow: {
    color: colors.white,
    fontSize: typography.sizes.xxl,
  },
});

export default DistrictsScreen;
