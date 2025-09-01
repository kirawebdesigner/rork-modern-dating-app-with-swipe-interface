import React, { useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { ArrowLeft, Mail, KeyRound, Trash2, FileDown } from 'lucide-react-native';
import { useI18n } from '@/hooks/i18n-context';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/hooks/auth-context';
import GradientButton from '@/components/GradientButton';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loadingEmail, setLoadingEmail] = useState<boolean>(false);
  const [loadingPassword, setLoadingPassword] = useState<boolean>(false);
  const [loadingAll, setLoadingAll] = useState<boolean>(false);
  const canUpdateEmail = useMemo(() => email.trim().length > 5 && email.includes('@'), [email]);
  const canUpdatePassword = useMemo(() => password.trim().length >= 6, [password]);
  const displayName = useMemo(() => user?.name ?? 'You', [user?.name]);
  const avatar = useMemo(() => user?.profile?.photos?.[0] ?? 'https://images.unsplash.com/photo-1544006659-f0b21884ce1d?q=80&w=256&auto=format&fit=crop', [user?.profile?.photos]);

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
      <View style={styles.headerWrap}>
        <View style={styles.headerBg} />
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/settings' as any); } }} style={styles.backBtn} accessibilityLabel={t('Back')} testID="account-back">
            <ArrowLeft size={20} color={Colors.text.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('Account')}</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.profileRow}>
          <Image source={{ uri: avatar }} style={styles.avatar} accessibilityIgnoresInvertColors />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.subtitle}>{t('Security and account preferences')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('Email')}</Text>
          <View style={styles.cardBody}>
            <View style={[styles.inputRow, styles.itemDivider]}>
              <View style={styles.iconWrap}><Mail size={18} color={Colors.primary} /></View>
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
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('Password')}</Text>
          <View style={styles.cardBody}>
            <View style={[styles.inputRow, styles.itemDivider]}>
              <View style={styles.iconWrap}><KeyRound size={18} color={Colors.primary} /></View>
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
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('Danger zone')}</Text>
          <View style={styles.cardBody}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleExportData} testID="export-data">
              <FileDown size={18} color={Colors.text.primary} />
              <Text style={styles.secondaryBtnText}>{t('Export my data')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dangerBtn} onPress={() => Alert.alert(t('Coming soon'), t('Account deletion will be available soon.'))} testID="delete-account">
              <Trash2 size={18} color={Colors.text.white} />
              <Text style={styles.dangerBtnText}>{t('Delete account')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </View>

      <View style={styles.footer} testID="save-bar-account">
        <GradientButton
          title={loadingAll ? t('Saving...') : t('Save Changes')}
          onPress={async () => {
            try {
              setLoadingAll(true);
              if (canUpdateEmail) {
                await supabase.auth.updateUser({ email: email.trim() });
                setEmail('');
              }
              if (canUpdatePassword) {
                await supabase.auth.updateUser({ password: password.trim() });
                setPassword('');
              }
              Alert.alert(t('Saved'), t('Your changes have been saved'));
            } catch (e: any) {
              Alert.alert(t('Error'), e?.message ?? t('Failed to save changes'));
            } finally {
              setLoadingAll(false);
            }
          }}
          style={styles.saveButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundSecondary },
  headerWrap: { backgroundColor: 'transparent' },
  headerBg: { height: 140, backgroundColor: Colors.primary },
  headerRow: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: Colors.text.white, fontSize: 18, fontWeight: '700' },
  backBtn: { padding: 6 },
  profileRow: { position: 'absolute', bottom: -32, left: 16, right: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 16, borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 20, fontWeight: '800', color: Colors.text.white },
  subtitle: { fontSize: 12, color: '#FFE1EA' },
  content: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 24 },
  sectionTitle: { fontSize: 12, color: Colors.text.secondary, marginBottom: 8 },
  card: { marginBottom: 16 },
  cardBody: { backgroundColor: Colors.card, borderRadius: 16, shadowColor: Colors.shadow, shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4, overflow: 'hidden', padding: 12, gap: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, height: 50 },
  itemDivider: { borderBottomWidth: 0 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFF1F5', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, color: Colors.text.primary },
  primaryBtn: { marginTop: 0, backgroundColor: Colors.primary, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: Colors.text.white, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', gap: 8, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: Colors.text.primary, fontWeight: '700' },
  dangerBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#EF4444', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dangerBtnText: { color: Colors.text.white, fontWeight: '700' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'web' ? 20 : 34, backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border, shadowColor: Colors.shadow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 6 },
  saveButton: { marginTop: 8 },
});
