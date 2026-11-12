import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../constants/theme';

/**
 * Full-screen picture viewer for the Documents page, so an image can be looked
 * at without downloading it. Pinch to zoom (iPhone); Close or the back button
 * dismisses it.
 */
const ImageViewerModal = ({ visible, uri, title, onClose }) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [status, setStatus] = useState('loading'); // loading | ready | failed

  // A new picture starts from "loading" again.
  useEffect(() => {
    if (visible) setStatus('loading');
  }, [visible, uri]);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        {status === 'failed' ? (
          <View style={styles.centered}>
            <Text style={styles.failedTitle}>This image couldn't be loaded</Text>
            <Text style={styles.failedText}>Check your connection and try again.</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.imageWrap}
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
            bouncesZoom
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={{ uri }}
              style={{ width, height: height * 0.75 }}
              resizeMode="contain"
              accessibilityLabel={title}
              onLoad={() => setStatus('ready')}
              onError={() => setStatus('failed')}
            />
          </ScrollView>
        )}

        {status === 'loading' && (
          <View style={styles.loading} pointerEvents="none">
            <ActivityIndicator size="large" color={colors.white} />
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.darkBlue,
  },
  title: { flex: 1, color: colors.white, fontSize: typography.sizes.lg, fontWeight: '700' },
  closeButton: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: '700' },
  scroll: { flex: 1 },
  imageWrap: { flexGrow: 1, justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl },
  failedTitle: { color: colors.white, fontSize: typography.sizes.lg, fontWeight: '700', marginBottom: spacing.sm },
  failedText: { color: 'rgba(255, 255, 255, 0.75)', fontSize: typography.sizes.base, textAlign: 'center' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});

export default ImageViewerModal;
