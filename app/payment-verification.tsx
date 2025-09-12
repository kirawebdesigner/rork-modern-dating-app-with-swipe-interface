import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Alert, ActivityIndicator, TextInput, SafeAreaView, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import Colors from '@/constants/colors';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function PaymentVerificationScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [txId, setTxId] = useState<string>('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const TELEBIRR_NUMBER = '0944120739';
  const TELEBIRR_NAME = 'Tesnim meftuh';
  const TELEGRAM_DEEPLINK = 'tg://msg?to=0944120739';

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please allow photo access to attach a screenshot.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: false,
        allowsEditing: false,
      });
      if (!res.canceled) {
        const uri = res.assets?.[0]?.uri ?? null;
        setImageUri(uri);
      }
    } catch (e) {
      console.log('[PaymentVerify] pickImage error', e);
      Alert.alert('Failed to open gallery');
    }
  };

  const onSubmit = async () => {
    try {
      if (!email.trim()) {
        Alert.alert('Enter your account email');
        return;
      }
      if (!imageUri) {
        Alert.alert('Attach a payment screenshot');
        return;
      }
      setSubmitting(true);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id ?? null;

      let uploadedPath: string | null = null;
      try {
        const fileName = `telebirr_${userId ?? 'anon'}_${Date.now()}.jpg`;
        const bucket = 'manual-payments';
        const file = await fetch(imageUri);
        const blob = await file.blob();
        // Attempt upload to Supabase Storage (bucket must exist and allow public uploads)
        const { error: upErr } = await supabase.storage.from(bucket).upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });
        if (!upErr) {
          uploadedPath = `${bucket}/${fileName}`;
        } else {
          console.log('[PaymentVerify] storage upload failed', upErr.message);
        }
      } catch (e) {
        console.log('[PaymentVerify] upload attempt failed', e);
      }

      try {
        const payload = {
          user_id: userId,
          type: 'unlocks',
          amount: Number(amount || 0) || 0,
          transaction_type: 'purchase',
          description: `MANUAL TELEBIRR REQUEST | email=${email} | tx=${txId || 'n/a'} | phone=0944120739 Tesnim meftuh | file=${uploadedPath ?? 'upload_failed'} | platform=${Platform.OS}`,
        } as const;
        await supabase.from('credit_transactions').insert(payload);
      } catch (e) {
        console.log('[PaymentVerify] insert to credit_transactions failed', e);
      }

      Alert.alert(
        'Submitted',
        `Your request is submitted. We will review and approve manually. If upload failed, send the screenshot + your account email by Telegram to ${TELEBIRR_NUMBER} (${TELEBIRR_NAME}).`
      );
      if (router.canGoBack()) router.back(); else router.replace('/premium' as any);
    } catch (e) {
      console.log('[PaymentVerify] submit error', e);
      Alert.alert('Submission failed', 'Please try again or send via Telebirr number with your email.');
    } finally {
      setSubmitting(false);
    }
  };

  const onTelegram = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(TELEBIRR_NUMBER);
      const supported = await Linking.canOpenURL(TELEGRAM_DEEPLINK);
      if (supported) {
        await Linking.openURL(TELEGRAM_DEEPLINK);
      } else {
        if (Platform.OS === 'web') {
          console.log('Open Telegram manually and message', TELEBIRR_NUMBER);
        }
        Alert.alert('Number copied', 'Open Telegram and message the number with your email + screenshot.');
      }
    } catch (e) {
      console.log('[PaymentVerify] telegram open error', e);
      Alert.alert('Copied', 'Phone number copied to clipboard. Open Telegram and message us.');
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Image
          source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/bdshjzcr8c9zb8mhnshfy' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Manual Payment Verification</Text>
          <Text style={styles.subtitle}>Pay via Telebirr and submit your receipt.</Text>
        </View>
      </View>

      <View style={styles.box}>
        <Text style={styles.label}>Telebirr Number</Text>
        <Text style={styles.value}>{TELEBIRR_NUMBER}</Text>
        <Text style={styles.value}>Name: {TELEBIRR_NAME}</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Clipboard.setStringAsync(TELEBIRR_NUMBER)} testID="copy-number">
            <Text style={styles.actionText}>Copy Number</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.telegramBtn]} onPress={onTelegram} testID="open-telegram">
            <Text style={[styles.actionText, { color: Colors.text.white }]}>Message on Telegram</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>Account Email</Text>
          <View style={styles.inputBox}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email used in the app"
              placeholderTextColor={Colors.text.light}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.textInput}
              testID="input-email"
            />
          </View>
        </View>
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>Amount (ETB)</Text>
          <View style={styles.inputBox}>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="Optional"
              placeholderTextColor={Colors.text.light}
              keyboardType="numeric"
              style={styles.textInput}
              testID="input-amount"
            />
          </View>
        </View>
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>Transaction ID</Text>
          <View style={styles.inputBox}>
            <TextInput
              value={txId}
              onChangeText={setTxId}
              placeholder="Optional"
              placeholderTextColor={Colors.text.light}
              style={styles.textInput}
              testID="input-txid"
            />
          </View>
        </View>
        <TouchableOpacity style={styles.attach} onPress={pickImage} testID="attach-screenshot">
          <Text style={styles.attachText}>{imageUri ? 'Change Screenshot' : 'Attach Screenshot'}</Text>
        </TouchableOpacity>
        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        )}
        <TouchableOpacity style={[styles.submit, submitting && styles.submitDisabled]} onPress={onSubmit} disabled={submitting} testID="submit-payment-verify">
          {submitting ? <ActivityIndicator color={Colors.text.white} /> : <Text style={styles.submitText}>Submit</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.help}>If you have issues, send the screenshot + your account email by Telegram to {TELEBIRR_NUMBER} ({TELEBIRR_NAME}).</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 8, marginRight: 6, backgroundColor: 'white' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text.primary },
  subtitle: { color: Colors.text.secondary, marginTop: 2 },
  box: { marginTop: 16, backgroundColor: Colors.backgroundSecondary, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  label: { color: Colors.text.secondary, fontSize: 12 },
  value: { color: Colors.text.primary, fontWeight: '700', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { flex: 1, backgroundColor: Colors.card, padding: 10, borderRadius: 10, alignItems: 'center' },
  actionText: { color: Colors.text.primary, fontWeight: '700' },
  telegramBtn: { backgroundColor: '#2AABEE' },
  form: { marginTop: 16 },
  inputWrap: { marginBottom: 12 },
  inputLabel: { color: Colors.text.secondary, marginBottom: 6 },
  inputBox: { backgroundColor: Colors.backgroundSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12 },
  inputText: { color: Colors.text.light },
  textInput: { color: Colors.text.primary, padding: 0 },
  attach: { backgroundColor: Colors.card, padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  attachText: { color: Colors.text.primary, fontWeight: '700' },
  preview: { width: '100%', height: 240, borderRadius: 12, marginTop: 10 },
  submit: { backgroundColor: Colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: Colors.text.white, fontWeight: '700' },
  help: { color: Colors.text.secondary, marginTop: 16 },
});
