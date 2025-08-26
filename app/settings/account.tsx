import React, { useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { ArrowLeft, Mail, KeyRound, Trash2, FileDown } from 'lucide-react-native';
import { useI18n } from '@/hooks/i18n-context';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/hooks/auth-context';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loadingEmail, setLoadingEmail] = useState<boolean>(false);
  const [loadingPassword, setLoadingPassword] = useState<boolean>(false);
  const canUpdateEmail = useMemo(() => email.trim().length > 5 && email.includes('@'), [email]);
  const canUpdatePassword = useMemo(() => password.trim().length >= 6, [password]);

  const handleUpdateEmail = async () => {
    if (!canUpdateEmail) return;
    try {
      setLoadingEmail(true);
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) throw error;
      Alert.alert(t('Saved'), t('Email updated'));
      setEmail('');
    } catch (e: any) {
      Alert.alert(t('Error'), e?.message ?? t('Failed to update email'));
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!canUpdatePassword) return;
    try {
      setLoadingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: password.trim() });
      if (error) throw error;
      Alert.alert(t('Saved'), t('Password updated'));
      setPassword('');
    } catch (e: any) {
      Alert.alert(t('Error'), e?.message ?? t('Failed to update password'));
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleExportData = async () => {
    try {
      const uid = user?.id ?? (await supabase.auth.getUser()).data.user?.id ?? null;
      if (!uid) throw new Error('Not authenticated');
      const [{ data: profile }, { data: matches }, { data: messages }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
        supabase.from('matches').select('*').or(`user1_id.eq.${uid},user2_id.eq.${uid}`),
        supabase.from('messages').select('*').or(`sender_id.eq.${uid},receiver_id.eq.${uid}`),
      ]);
      const exportObj = {
        user: { id: uid, email: user?.email ?? null },
        profile: profile ?? null,
        matches: matches ?? [],
        messages: messages ? (messages as any[]).length : 0,
        exportedAt: new Date().toISOString(),
      };
      const text = JSON.stringify(exportObj, null, 2);
      await Clipboard.setStringAsync(text);
      Alert.alert(t('Copied'), t('Your data JSON is copied to clipboard'));
    } catch (e: any) {
      Alert.alert(t('Error'), e?.message ?? t('Failed to export data'));
    }
  };

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
        <TouchableOpacity
          style={[styles.primaryBtn, { opacity: canUpdateEmail && !loadingEmail ? 1 : 0.6 }]}
          onPress={handleUpdateEmail}
          disabled={!canUpdateEmail || loadingEmail}
          testID="save-email"
        >
          <Text style={styles.primaryBtnText}>{loadingEmail ? t('Saving...') : t('Save')}</Text>
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
        <TouchableOpacity
          style={[styles.primaryBtn, { opacity: canUpdatePassword && !loadingPassword ? 1 : 0.6 }]}
          onPress={handleUpdatePassword}
          disabled={!canUpdatePassword || loadingPassword}
          testID="save-password"
        >
          <Text style={styles.primaryBtnText}>{loadingPassword ? t('Saving...') : t('Save')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Danger zone')}</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleExportData} testID="export-data">
          <FileDown size={18} color={Colors.text.primary} />
          <Text style={styles.secondaryBtnText}>{t('Export my data')}</Text>
        </TouchableOpacity>
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
  secondaryBtn: { flexDirection: 'row', gap: 8, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  secondaryBtnText: { color: Colors.text.primary, fontWeight: '700' },
  dangerBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#EF4444', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dangerBtnText: { color: Colors.text.white, fontWeight: '700' },
});
