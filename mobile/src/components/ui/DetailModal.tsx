import * as React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Platform, KeyboardAvoidingView, SafeAreaView } from 'react-native';
import { colors } from '@/constants/colors';

interface DetailModalProps {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children?: React.ReactNode;
  /** presentation: 'sheet' (default translucent bottom sheet) or 'fullscreen' */
  presentation?: 'sheet' | 'fullscreen';
}

export const DetailModal: React.FC<DetailModalProps> = ({ visible, title, onClose, children, presentation = 'sheet' }) => {
  const fullscreen = presentation === 'fullscreen';
  return (
    <Modal
      visible={visible}
      animationType={fullscreen ? 'slide' : (Platform.OS === 'android' ? 'fade' : 'slide')}
      transparent={!fullscreen}
      statusBarTranslucent
      onRequestClose={onClose}
      presentationStyle={fullscreen ? 'fullScreen' : (Platform.OS === 'ios' ? 'overFullScreen' : undefined)}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex} pointerEvents={visible ? 'auto' : 'none'}>
        {fullscreen ? (
          <SafeAreaView style={styles.fullscreenRoot}>
            <View style={styles.fullscreenHeader}>
              <Text style={styles.fullscreenTitle}>{title}</Text>
              <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
                <Text style={styles.close}>Close</Text>
              </Pressable>
            </View>
            <View style={styles.fullscreenBody}>{children}</View>
          </SafeAreaView>
        ) : (
          <View style={styles.overlay}>
            <SafeAreaView style={styles.safeArea}>
              <View style={styles.sheet}>
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>{title}</Text>
                  <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
                    <Text style={styles.close}>Close</Text>
                  </Pressable>
                </View>
                <View style={styles.body}>{children}</View>
              </View>
            </SafeAreaView>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  safeArea: { flex: 1, justifyContent: 'flex-end' },
  sheet: { 
    backgroundColor: colors.background, 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    padding: 16, 
    maxHeight: '85%',
    width: '100%',
    alignSelf: 'center',
    // Elevation / shadow for Android & iOS distinction from background
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.primary },
  close: { color: colors.primary, fontWeight: '600' },
  body: { paddingTop: 8 },
  // Fullscreen variant
  fullscreenRoot: { flex: 1, backgroundColor: colors.background },
  fullscreenHeader: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fullscreenTitle: { fontSize: 20, fontWeight: '700', color: colors.primary, flex: 1 },
  fullscreenBody: { flex: 1, padding: 16 },
});

export default DetailModal;
