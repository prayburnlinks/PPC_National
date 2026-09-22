/**
 * Districts Screen
 * Shows all PPC districts. Admins can edit the district board names and each
 * congregation's pastor; saved names are stored in Firestore and shown to
 * every user.
 */

import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { DISTRICTS, CONGREGATIONS, ROLES } from '../constants/config';
import { useUser } from '../context/UserContext';
import {
  getDistrictDetails,
  saveDistrictDetails,
  districtDocId,
  congregationKey,
} from '../services/districtsService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BOARD_ROLES = [
  { key: 'chairperson', label: 'Chairperson' },
  { key: 'deputy',      label: 'Deputy Chairperson' },
  { key: 'secretary',   label: 'Secretary' },
  { key: 'treasurer',   label: 'Treasurer' },
];
const UNASSIGNED = 'TBA';
const MAX_NAME_LENGTH = 60;

const congregationsIn = (district) => CONGREGATIONS.filter(c => c.district === district.name);

// Applies a draft ({ key: text }) to the current values: trims, turns a blank
// into the TBA placeholder, and returns only the entries that differ.
const changedEntries = (draft, current) =>
  Object.fromEntries(
    Object.entries(draft ?? {})
      .map(([key, text]) => [key, text.trim() || UNASSIGNED])
      .filter(([key, name]) => name !== current[key])
  );

const DistrictsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [expanded, setExpanded] = useState([]);
  // What an admin has saved in Firestore, keyed by districtDocId:
  // { board, pastors }. It overrides the defaults in config. `detailsLoaded`
  // gates editing so an admin can't save on top of defaults that were hiding
  // newer saved names.
  const [savedDetails, setSavedDetails] = useState({});
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  // Unsaved edits: { [districtDocId]: { board: { [roleKey]: text }, pastors:
  // { [congregationKey]: text } } } — only the fields the admin touched.
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const canEdit = user?.role === ROLES.ADMIN;
  const toggleDistrict = (name) => setExpanded(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);

  // Re-read on every focus so an admin's save shows up for everyone the next
  // time they open the tab, not only after an app restart.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getDistrictDetails()
        .then(details => {
          if (active) {
            setSavedDetails(details);
            setDetailsLoaded(true);
          }
        })
        .catch(() => {});
      return () => { active = false; };
    }, [])
  );

  const boardFor = (district) => ({
    ...district.board,
    ...savedDetails[districtDocId(district.name)]?.board,
  });

  // { [congregationKey]: pastor } for a district. A saved name wins over one
  // in config; a congregation with neither shows the TBA placeholder.
  const pastorsFor = (district) => {
    const saved = savedDetails[districtDocId(district.name)]?.pastors;
    return Object.fromEntries(
      congregationsIn(district).map(c => {
        const key = congregationKey(c.name);
        return [key, (saved?.[key] ?? c.pastor) || UNASSIGNED];
      })
    );
  };

  const stopEditing = () => {
    setEditing(false);
    setDrafts({});
  };

  // `group` is 'board' or 'pastors'
  const setDraftName = (district, group, key, text) => {
    const id = districtDocId(district.name);
    setDrafts(prev => ({
      ...prev,
      [id]: { ...prev[id], [group]: { ...prev[id]?.[group], [key]: text } },
    }));
  };

  const handleSave = async () => {
    // Only what actually changed is written, per district.
    const changes = DISTRICTS.flatMap(district => {
      const draft = drafts[districtDocId(district.name)];
      if (!draft) return [];
      const currentBoard = boardFor(district);
      const boardChanges = changedEntries(draft.board, currentBoard);
      const pastorChanges = changedEntries(draft.pastors, pastorsFor(district));
      const boardChanged = Object.keys(boardChanges).length > 0;
      const pastorsChanged = Object.keys(pastorChanges).length > 0;
      if (!boardChanged && !pastorsChanged) return [];
      return [{
        name: district.name,
        // The whole board is written, not just the edited roles, so a saved
        // doc always holds all four.
        ...(boardChanged && { board: { ...currentBoard, ...boardChanges } }),
        ...(pastorsChanged && { pastors: pastorChanges }),
      }];
    });

    if (changes.length === 0) {
      stopEditing();
      return;
    }

    setSaving(true);
    try {
      await saveDistrictDetails(user, changes);
      setSavedDetails(prev => {
        const next = { ...prev };
        changes.forEach(({ name, board, pastors }) => {
          const id = districtDocId(name);
          next[id] = {
            ...next[id],
            ...(board && { board }),
            ...(pastors && { pastors: { ...next[id]?.pastors, ...pastors } }),
          };
        });
        return next;
      });
      stopEditing();
    } catch (error) {
      Alert.alert('Could not save', error.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Frozen Header */}
      <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.heroTop}>
          <Image source={require('../assets/emblem.jpg')} style={styles.emblem} resizeMode="contain" />
          {canEdit && detailsLoaded && (
            <View style={styles.editActions}>
              {editing ? (
                <>
                  <TouchableOpacity
                    style={styles.heroButton}
                    onPress={stopEditing}
                    disabled={saving}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.heroButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.heroButton, styles.saveButton]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.8}
                  >
                    {saving
                      ? <ActivityIndicator size="small" color={colors.darkBlue} />
                      : <Text style={[styles.heroButtonText, styles.saveButtonText]}>Save</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.heroButton}
                  onPress={() => setEditing(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.heroButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
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

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
      <View style={styles.content}>
        {editing && (
          <View style={styles.editBanner}>
            <Text style={styles.editBannerText}>
              Editing names. Expand a district to change its board and each congregation's pastor, then tap Save — everyone will see the update.
            </Text>
          </View>
        )}

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

        {/* National Women's Board Entry */}
        <TouchableOpacity
          style={styles.boardCard}
          onPress={() => navigation.navigate('NationalWomensBoard')}
          activeOpacity={0.8}
        >
          <View style={styles.boardLeft}>
            <Text style={styles.boardIcon}>👗</Text>
            <View>
              <Text style={styles.boardTitle}>National Women's Board</Text>
              <Text style={styles.boardSub}>Meet our leadership team</Text>
            </View>
          </View>
          <Text style={styles.boardArrow}>›</Text>
        </TouchableOpacity>

        {/* National Youth Board Entry */}
        <TouchableOpacity
          style={styles.boardCard}
          onPress={() => navigation.navigate('NationalYouthBoard')}
          activeOpacity={0.8}
        >
          <View style={styles.boardLeft}>
            <Text style={styles.boardIcon}>🙌</Text>
            <View>
              <Text style={styles.boardTitle}>National Youth Board</Text>
              <Text style={styles.boardSub}>Meet our leadership team</Text>
            </View>
          </View>
          <Text style={styles.boardArrow}>›</Text>
        </TouchableOpacity>

        {/* National Sunday School Board Entry */}
        <TouchableOpacity
          style={styles.boardCard}
          onPress={() => navigation.navigate('NationalSundaySchoolBoard')}
          activeOpacity={0.8}
        >
          <View style={styles.boardLeft}>
            <Text style={styles.boardIcon}>📖</Text>
            <View>
              <Text style={styles.boardTitle}>National Sunday School Board</Text>
              <Text style={styles.boardSub}>Meet our leadership team</Text>
            </View>
          </View>
          <Text style={styles.boardArrow}>›</Text>
        </TouchableOpacity>

        {DISTRICTS.map((district, idx) => {
          const isOpen = expanded.includes(district.name);
          const congregations = congregationsIn(district);
          const board = boardFor(district);
          const pastors = pastorsFor(district);
          const draft = drafts[districtDocId(district.name)];
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
                    {BOARD_ROLES.map(({ key, label }) => {
                      const name = board[key];
                      // TBA shows as the placeholder so an admin can type straight over it
                      const inputValue = draft?.board?.[key] ?? (name && name !== UNASSIGNED ? name : '');
                      return (
                        <View key={key} style={styles.boardCell}>
                          <Text style={styles.boardCellRole}>{label}</Text>
                          {editing ? (
                            <TextInput
                              style={styles.boardCellInput}
                              value={inputValue}
                              onChangeText={(text) => setDraftName(district, 'board', key, text)}
                              placeholder={UNASSIGNED}
                              placeholderTextColor={colors.placeholder}
                              accessibilityLabel={`${district.name} ${label}`}
                              autoCapitalize="words"
                              autoCorrect={false}
                              maxLength={MAX_NAME_LENGTH}
                              editable={!saving}
                            />
                          ) : (
                            <Text style={[styles.boardCellName, name === UNASSIGNED && styles.unassignedText]}>
                              {name || UNASSIGNED}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Congregations */}
                  <Text style={styles.sectionLabel}>CONGREGATIONS</Text>
                  {congregations.map((c) => {
                    const key = congregationKey(c.name);
                    const pastor = pastors[key];
                    // Same as the board: TBA shows as the placeholder
                    const pastorInput = draft?.pastors?.[key] ?? (pastor === UNASSIGNED ? '' : pastor);
                    return (
                      <View key={c.name} style={styles.congregationItem}>
                        <View style={styles.congregationRow}>
                          <Text style={styles.congregationText}>{c.name}</Text>
                          {c.assemblyName && (
                            <Text style={styles.assemblyName}>{c.assemblyName}</Text>
                          )}
                        </View>
                        {editing ? (
                          <View style={styles.pastorEditRow}>
                            <Text style={styles.pastorText}>🙏</Text>
                            <TextInput
                              style={[styles.boardCellInput, styles.pastorInput]}
                              value={pastorInput}
                              onChangeText={(text) => setDraftName(district, 'pastors', key, text)}
                              placeholder={UNASSIGNED}
                              placeholderTextColor={colors.placeholder}
                              accessibilityLabel={`${c.name} pastor`}
                              autoCapitalize="words"
                              autoCorrect={false}
                              maxLength={MAX_NAME_LENGTH}
                              editable={!saving}
                            />
                          </View>
                        ) : (
                          <Text style={[styles.pastorText, pastor === UNASSIGNED && styles.unassignedText]}>
                            🙏 {pastor}
                          </Text>
                        )}
                      </View>
                    );
                  })}
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
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  emblem: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroButton: {
    minWidth: 68,
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  saveButtonText: {
    color: colors.darkBlue,
  },
  editBanner: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  editBannerText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    lineHeight: 18,
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
  unassignedText: {
    color: colors.placeholder,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  boardCellInput: {
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightBlue,
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
  pastorEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  pastorInput: {
    flex: 1,
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
