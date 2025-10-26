import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, MapPin, Bell, Mic, Image as ImageIcon, Shield } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useI18n } from '@/hooks/i18n-context';
import GradientButton from '@/components/GradientButton';

export default function PermissionsInfoScreen() {
  const router = useRouter();
  const { t } = useI18n();

  const permissions = [
    {
      icon: Camera,
      title: t('Camera Access'),
      description: t('Take photos for your profile and share moments with matches'),
      required: false,
    },
    {
      icon: ImageIcon,
      title: t('Photo Library'),
      description: t('Upload photos from your device to your dating profile'),
      required: true,
    },
    {
      icon: MapPin,
      title: t('Location'),
      description: t('Find and match with people nearby based on your location'),
      required: true,
    },
    {
      icon: Bell,
      title: t('Notifications'),
      description: t('Get notified about new matches, messages, and likes'),
      required: false,
    },
    {
      icon: Mic,
      title: t('Microphone'),
      description: t('Send voice messages to your matches (optional)'),
      required: false,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Permissions')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Shield size={64} color={Colors.primary} />
        </View>

        <Text style={styles.title}>{t('App Permissions')}</Text>
        <Text style={styles.description}>
          {t('To provide you with the best dating experience, we need access to certain features on your device. Here\'s what we need and why:')}
        </Text>

        <View style={styles.permissionsList}>
          {permissions.map((permission, index) => (
            <View key={index} style={styles.permissionCard}>
              <View style={styles.permissionIcon}>
                <permission.icon size={28} color={Colors.primary} />
              </View>
              <View style={styles.permissionContent}>
                <View style={styles.permissionHeader}>
                  <Text style={styles.permissionTitle}>{permission.title}</Text>
                  {permission.required && (
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredText}>{t('Required')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.permissionDescription}>{permission.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>{t('Your Privacy Matters')}</Text>
          <Text style={styles.infoText}>
            {t('We only request permissions that are necessary for the app to function. You can manage these permissions anytime in your device settings. We never share your data without your consent.')}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <GradientButton
            title={t('I Understand')}
            onPress={() => router.back()}
          />
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionsList: {
    gap: 16,
    marginBottom: 32,
  },
  permissionCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  permissionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  permissionContent: {
    flex: 1,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  permissionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
    marginRight: 8,
  },
  requiredBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  requiredText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.white,
  },
  permissionDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  bottomSpacing: {
    height: 40,
  },
});
