import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { useUser } from '../context/UserContext';
import { getPrayerRequests, submitPrayerRequest, prayForRequest } from '../services/firestoreService';

const PrayerWallScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scope, setScope] = useState('national');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const list = await getPrayerRequests('national', user?.district);
    setRequests(list);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user) return Alert.alert('Please sign in to submit a request');
    if (!body.trim()) return Alert.alert('Please enter a prayer request');
    try {
      await submitPrayerRequest(user.uid, { title: title.trim() || 'Prayer Request', body: body.trim(), scope, district: user?.district });
      setTitle('');
      setBody('');
      loadRequests();
    } catch (e) {
      Alert.alert('Error', 'Failed to submit prayer request');
    }
  };

  const handlePray = async (id) => {
    if (!user) return Alert.alert('Sign in to pray for requests');
    try {
      await prayForRequest(id, user.uid);
      // Optimistic refresh
      setRequests(prev => prev.map(r => r.id === id ? { ...r, prayCount: (r.prayCount || 0) + 1 } : r));
      loadRequests();
    } catch (e) {
      Alert.alert('Error', 'Failed to update prayer count');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <Text style={styles.requestTitle}>{item.title || 'Prayer'}</Text>
        <Text style={styles.requestCount}>{item.prayCount || 0} praying</Text>
      </View>
      <Text style={styles.requestBody}>{item.body}</Text>
      <View style={styles.requestFooter}>
        <Text style={styles.requestMeta}>📅 {new Date(item.createdAt).toLocaleDateString()}</Text>
        <TouchableOpacity style={styles.prayButton} onPress={() => handlePray(item.id)}>
          <Text style={styles.prayText}>Praying 🙏</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Prayer Wall</Text>
        <Text style={styles.sub}>Share requests and stand in prayer for one another</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          placeholder="Title (optional)"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />
        <TextInput
          placeholder="Write your prayer request..."
          value={body}
          onChangeText={setBody}
          style={[styles.input, styles.textArea]}
          multiline
        />

        <View style={styles.scopeRow}>
          <TouchableOpacity
            style={[styles.scopeButton, scope === 'national' && styles.scopeActive]}
            onPress={() => setScope('national')}
          >
            <Text style={scope === 'national' ? styles.scopeTextActive : styles.scopeText}>National</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scopeButton, scope === 'district' && styles.scopeActive]}
            onPress={() => setScope('district')}
            disabled={!user?.district}
          >
            <Text style={scope === 'district' ? styles.scopeTextActive : styles.scopeText}>District</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>Submit Request</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.purple} />
        ) : (
          <FlatList
            data={requests}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: spacing.lg }}
            ListEmptyComponent={<Text style={styles.empty}>No prayer requests yet — be the first to share.</Text>}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: typography.sizes.xl, fontWeight: '800', color: colors.textPrimary },
  sub: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginTop: spacing.xs },
  form: { padding: spacing.lg, backgroundColor: 'transparent' },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  scopeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  scopeButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  scopeActive: { backgroundColor: colors.purple, borderColor: colors.purple },
  scopeText: { color: colors.textSecondary },
  scopeTextActive: { color: colors.white },
  submitButton: { backgroundColor: colors.purple, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.sm },
  submitText: { color: colors.white, fontWeight: '700' },
  listContainer: { flex: 1 },
  requestCard: { backgroundColor: colors.white, marginBottom: spacing.md, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  requestTitle: { fontWeight: '700', color: colors.textPrimary },
  requestCount: { color: colors.textSecondary, fontSize: typography.sizes.xs },
  requestBody: { color: colors.textPrimary, marginBottom: spacing.sm },
  requestFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestMeta: { color: colors.textSecondary, fontSize: typography.sizes.xs },
  prayButton: { backgroundColor: colors.gold, paddingVertical: 6, paddingHorizontal: 10, borderRadius: borderRadius.sm },
  prayText: { color: colors.darkBlue, fontWeight: '700' },
  empty: { padding: spacing.lg, color: colors.textSecondary },
});

export default PrayerWallScreen;
