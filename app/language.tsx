import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useI18n } from '@/hooks/i18n-context';

type LanguageCode = 'en' | 'am';

interface LangOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
}

const OPTIONS: LangOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'am', label: 'Amharic', nativeLabel: 'አማርኛ' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { t, setLanguage } = useI18n();
  const [current, setCurrent] = useState<LanguageCode>('en');
  const [loading, setLoading] = useState<boolean>(false);

  const load = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('app_language');
      const parsed = (stored as LanguageCode) || 'en';
      setCurrent(parsed);
    } catch (e: any) {
      console.error('[Language] load error', e?.message || e);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSelect = useCallback(async (code: LanguageCode) => {
    try {
      setLoading(true);
      await setLanguage(code);
      setCurrent(code);
      const title = code === 'am' ? t('Language updated') : t('Language updated');
      const message = code === 'am' ? t('The app will use your selected language. Some screens may refresh.') : t('The app will use your selected language. Some screens may refresh.');
      Alert.alert(title, message);
    } catch (e: any) {
      console.error('[Language] save error', e?.message || e);
      Alert.alert('Error', 'Failed to update language. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [setLanguage, t]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Go back" onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/settings' as any); } }} testID="language-back-btn" style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('Language')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.list}>
        {OPTIONS.map(opt => {
          const selected = opt.code === current;
          return (
            <TouchableOpacity
              key={opt.code}
              style={styles.item}
              onPress={() => onSelect(opt.code)}
              disabled={loading}
              testID={`lang-${opt.code}`}
              accessibilityLabel={`${opt.label} ${selected ? 'selected' : ''}`}
            >
              <View style={styles.itemLeft}>
                <Text style={styles.itemLabel}>{opt.label}</Text>
                <Text style={styles.itemNative}>{opt.nativeLabel}</Text>
              </View>
              {selected ? <Check size={18} color={Colors.primary} /> : <View style={{ width: 18 }} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '600', color: Colors.text.primary, textAlign: 'center', flex: 1 },
  backBtn: { padding: 4 },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  item: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemLeft: { flexDirection: 'column' },
  itemLabel: { fontSize: 16, color: Colors.text.primary },
  itemNative: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
});
