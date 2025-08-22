import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { ArrowLeft, Mail, KeyRound, Trash2 } from 'lucide-react-native';
import { useI18n } from '@/hooks/i18n-context';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/settings' as any); } }} style={styles.backBtn} accessibilityLabel={t('Back')} testID="account-back">
          <ArrowLeft size={20} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('Account')}</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Email')}</Text>
        <View style={styles.inputRow}>
          <Mail size={18} color={Colors.text.secondary} />
          <TextInput
            style={styles.input}
            placeholder={t('Enter new email')}
            placeholderTextColor={'#9CA3AF'}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            testID="account-email"
          />
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => Alert.alert(t('Saved'), t('Email updated'))} testID="save-email">
          <Text style={styles.primaryBtnText}>{t('Save')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Password')}</Text>
        <View style={styles.inputRow}>
          <KeyRound size={18} color={Colors.text.secondary} />
          <TextInput
            style={styles.input}
            placeholder={t('Enter new password')}
            placeholderTextColor={'#9CA3AF'}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            testID="account-password"
          />
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => Alert.alert(t('Saved'), t('Password updated'))} testID="save-password">
          <Text style={styles.primaryBtnText}>{t('Save')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Danger zone')}</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={() => Alert.alert(t('Coming soon'), t('Account deletion will be available soon.'))} testID="delete-account">
          <Trash2 size={18} color={Colors.text.white} />
          <Text style={styles.dangerBtnText}>{t('Delete account')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text.primary },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 14, color: Colors.text.secondary, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, height: 50 },
  input: { flex: 1, color: Colors.text.primary },
  primaryBtn: { marginTop: 10, backgroundColor: Colors.primary, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: Colors.text.white, fontWeight: '700' },
  dangerBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#EF4444', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dangerBtnText: { color: Colors.text.white, fontWeight: '700' },
});
