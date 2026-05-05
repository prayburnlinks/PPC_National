/**
 * District Detail Screen
 * Shows list of congregations for a selected district
 */

import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { CONGREGATIONS } from '../constants/config';

const DistrictDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { districtName } = route.params || { districtName: null };

  const items = CONGREGATIONS.filter(c => c.district === districtName);

  return (
    <View style={[styles.container, { paddingTop: insets.top }] }>
      <View style={styles.header}>
        <Text style={styles.title}>{districtName}</Text>
        <Text style={styles.sub}>{items.length} congregations</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item, idx) => item.name + idx}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => { /* future: navigate to congregation */ }}>
            <Text style={styles.itemText}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No congregations found for this district.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  list: {
    padding: spacing.lg,
  },
  item: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  itemText: {
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  empty: {
    padding: spacing.lg,
    color: colors.textSecondary,
  },
});

export default DistrictDetailScreen;
