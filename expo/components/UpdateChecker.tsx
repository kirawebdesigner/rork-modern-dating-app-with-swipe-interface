import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import { Download, X, Sparkles } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENT_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const DISMISSED_VERSION_KEY = 'dismissed_update_version';

interface AppVersion {
  version: string;
  apk_url: string;
  release_notes: string;
  force_update: boolean;
}

export default function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<AppVersion | null>(null);
  const [visible, setVisible] = useState<boolean>(false);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkForUpdate();
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const checkForUpdate = async () => {
    try {
      console.log('[UpdateChecker] Checking for updates, current version:', CURRENT_VERSION);
      
      // Select all to be resilient to column name variations (like 'Update' vs 'release_notes')
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.log('[UpdateChecker] Query error:', error.message);
        // Temporarily alert during troubleshooting
        if (__DEV__) {
          // Alert.alert('Update Check Error', error.message);
        }
        return;
      }

      if (!data) {
        console.log('[UpdateChecker] No version data found');
        return;
      }

      const latestVersion = data.version;
      const releaseNotes = data.release_notes || data.Update || data.notes || '';
      const forceUpdate = !!data.force_update;
      const apkUrl = data.apk_url;

      console.log('[UpdateChecker] Latest:', latestVersion, 'Current:', CURRENT_VERSION, 'Force:', forceUpdate);

      if (isNewerVersion(latestVersion, CURRENT_VERSION)) {
        const dismissed = await AsyncStorage.getItem(DISMISSED_VERSION_KEY);
        if (dismissed === latestVersion && !forceUpdate) {
          console.log('[UpdateChecker] User dismissed this version');
          return;
        }

        setUpdateInfo({
          version: latestVersion,
          apk_url: apkUrl,
          release_notes: releaseNotes,
          force_update: forceUpdate
        });
        setVisible(true);
      } else {
        console.log('[UpdateChecker] App is up to date');
      }
    } catch (e: any) {
      console.log('[UpdateChecker] Exception:', e?.message || e);
    }
  };

  const isNewerVersion = (latest: string, current: string): boolean => {
    const l = latest.split('.').map(Number);
    const c = current.split('.').map(Number);
    for (let i = 0; i < Math.max(l.length, c.length); i++) {
      const lv = l[i] ?? 0;
      const cv = c[i] ?? 0;
      if (lv > cv) return true;
      if (lv < cv) return false;
    }
    return false;
  };

  const handleUpdate = () => {
    if (updateInfo?.apk_url) {
      let url = updateInfo.apk_url;
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      Linking.openURL(url).catch(e => {
        console.log('[UpdateChecker] Failed to open URL:', e);
      });
    }
  };

  const handleDismiss = async () => {
    if (updateInfo?.force_update) return;
    if (updateInfo?.version) {
      await AsyncStorage.setItem(DISMISSED_VERSION_KEY, updateInfo.version);
    }
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  };

  if (!visible || !updateInfo) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />

          <View style={styles.iconCircle}>
            <Sparkles size={32} color="#FF2D55" />
          </View>

          <Text style={styles.title}>New Update Available</Text>
          <Text style={styles.version}>v{updateInfo.version}</Text>

          {updateInfo.release_notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>What's New</Text>
              <Text style={styles.notesText}>{updateInfo.release_notes}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate} activeOpacity={0.8} testID="update-now-btn">
            <Download size={20} color="#FFF" />
            <Text style={styles.updateBtnText}>Update Now</Text>
          </TouchableOpacity>

          {!updateInfo.force_update && (
            <TouchableOpacity style={styles.laterBtn} onPress={handleDismiss} activeOpacity={0.7} testID="update-later-btn">
              <Text style={styles.laterBtnText}>Maybe Later</Text>
            </TouchableOpacity>
          )}

          {updateInfo.force_update && (
            <Text style={styles.forceText}>This update is required to continue using the app</Text>
          )}

          {!updateInfo.force_update && (
            <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
              <X size={20} color={Colors.text.secondary} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'web' ? 32 : 48,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF1F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '600' as const,
    marginBottom: 20,
  },
  notesBox: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  updateBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FF2D55',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  updateBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  laterBtn: {
    paddingVertical: 12,
  },
  laterBtnText: {
    color: Colors.text.secondary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  forceText: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
});
