import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { safeGoBack } from '@/lib/navigation';
import Colors from '@/constants/colors';
import { ArrowLeft, Mail, KeyRound, Trash2, FileDown } from 'lucide-react-native';
import { useI18n } from '@/hooks/i18n-context';
import { supabase } from '@/lib/supabase';
import { copyToClipboard } from '@/lib/clipboard';
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
      await copyToClipboard(text);
      Alert.alert(t('Copied'), t('Your data JSON is copied to clipboard'));
    } catch (e: any) {
      Alert.alert(t('Error'), e?.message ?? t('Failed to export data'));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack(router, '/settings')} style={styles.backBtn} accessibilityLabel={t('Back')} testID="account-back">
          <ArrowLeft size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Account')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>{t('Email')}</Text>
        <View style={styles.card}>
          <View style={styles.inputRow}>
            <View style={styles.inputIcon}>
              <Mail size={18} color="#3B82F6" />
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('Enter new email')}
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              testID="account-email"
            />
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, { opacity: canUpdateEmail && !loadingEmail ? 1 : 0.5 }]}
            onPress={handleUpdateEmail}
            disabled={!canUpdateEmail || loadingEmail}
            testID="save-email"
          >
            <Text style={styles.actionBtnText}>{loadingEmail ? t('Saving...') : t('Update Email')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>{t('Password')}</Text>
        <View style={styles.card}>
          <View style={styles.inputRow}>
            <View style={styles.inputIcon}>
              <KeyRound size={18} color="#8B5CF6" />
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('Enter new password')}
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              testID="account-password"
            />
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, { opacity: canUpdatePassword && !loadingPassword ? 1 : 0.5 }]}
            onPress={handleUpdatePassword}
            disabled={!canUpdatePassword || loadingPassword}
            testID="save-password"
          >
            <Text style={styles.actionBtnText}>{loadingPassword ? t('Saving...') : t('Update Password')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>{t('Data & Account')}</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.outlineBtn} onPress={handleExportData} testID="export-data">
            <FileDown size={18} color={Colors.text.primary} />
            <Text style={styles.outlineBtnText}>{t('Export My Data')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() => Alert.alert(t('Coming soon'), t('Account deletion will be available soon.'))}
            testID="delete-account"
          >
            <Trash2 size={18} color="#FFF" />
            <Text style={styles.dangerBtnText}>{t('Delete Account')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 12,
    backgroundColor: '#F8F8FA',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text.primary },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text.secondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8F8FA',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: { flex: 1, color: Colors.text.primary, fontSize: 15 },
  actionBtn: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { color: '#FFF', fontWeight: '700' as const, fontSize: 15 },
  outlineBtn: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F8F8FA',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: { color: Colors.text.primary, fontWeight: '600' as const, fontSize: 15 },
  dangerBtn: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#EF4444',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnText: { color: '#FFF', fontWeight: '700' as const, fontSize: 15 },
});
