import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useI18n } from '@/hooks/i18n-context';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Privacy Policy')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>{t('Last updated')}: January 2025</Text>

        <Text style={styles.sectionTitle}>1. {t('Information We Collect')}</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Personal Information:</Text> When you create an account, we collect your phone number, name, date of birth, gender, photos, bio, interests, and location.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Usage Data:</Text> We collect information about how you use the app, including matches, likes, messages, and profile views.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Device Information:</Text> We may collect device type, operating system, unique device identifiers, and mobile network information.
        </Text>

        <Text style={styles.sectionTitle}>2. {t('How We Use Your Information')}</Text>
        <Text style={styles.paragraph}>
          We use your information to:
          {'\n'} • Provide and improve our dating service
          {'\n'} • Match you with compatible users
          {'\n'} • Enable communication between users
          {'\n'} • Personalize your experience
          {'\n'} • Ensure safety and prevent fraud
          {'\n'} • Send you notifications and updates
          {'\n'} • Comply with legal obligations
        </Text>

        <Text style={styles.sectionTitle}>3. {t('Information Sharing')}</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>With Other Users:</Text> Your profile information, photos, and activity are visible to other users based on your privacy settings.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Service Providers:</Text> We share data with third-party service providers who help us operate the app (hosting, analytics, payment processing).
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Legal Requirements:</Text> We may disclose information when required by law or to protect our rights and users' safety.
        </Text>
        <Text style={styles.paragraph}>
          We do not sell your personal information to third parties.
        </Text>

        <Text style={styles.sectionTitle}>4. {t('Data Security')}</Text>
        <Text style={styles.paragraph}>
          We implement industry-standard security measures to protect your data:
          {'\n'} • Encrypted data transmission (SSL/TLS)
          {'\n'} • Secure database storage
          {'\n'} • Regular security audits
          {'\n'} • Access controls and authentication
          {'\n'}{'\n'}
          However, no method of transmission over the internet is 100% secure. You are responsible for keeping your account credentials confidential.
        </Text>

        <Text style={styles.sectionTitle}>5. {t('Data Retention')}</Text>
        <Text style={styles.paragraph}>
          We retain your personal information for as long as your account is active or as needed to provide services. When you delete your account, we will delete or anonymize your personal information within 30 days, except where we need to retain it for legal obligations.
        </Text>

        <Text style={styles.sectionTitle}>6. {t('Your Privacy Rights')}</Text>
        <Text style={styles.paragraph}>
          You have the right to:
          {'\n'} • Access your personal data
          {'\n'} • Correct inaccurate data
          {'\n'} • Delete your account and data
          {'\n'} • Control your privacy settings
          {'\n'} • Opt out of marketing communications
          {'\n'} • Export your data
          {'\n'}{'\n'}
          To exercise these rights, visit your account settings or contact us at privacy@datingapp.com
        </Text>

        <Text style={styles.sectionTitle}>7. {t('Cookies & Tracking')}</Text>
        <Text style={styles.paragraph}>
          We use cookies and similar technologies to improve your experience, analyze usage patterns, and personalize content. You can manage cookie preferences in your device settings.
        </Text>

        <Text style={styles.sectionTitle}>8. {t('Location Data')}</Text>
        <Text style={styles.paragraph}>
          We collect your location to show you nearby matches. You can control location permissions in your device settings. Premium users can hide their precise location while still seeing matches.
        </Text>

        <Text style={styles.sectionTitle}>9. {t('Children\'s Privacy')}</Text>
        <Text style={styles.paragraph}>
          Our service is not intended for users under 18. We do not knowingly collect information from minors. If we discover that we have collected data from someone under 18, we will delete it immediately.
        </Text>

        <Text style={styles.sectionTitle}>10. {t('International Data Transfers')}</Text>
        <Text style={styles.paragraph}>
          Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>11. {t('Changes to Privacy Policy')}</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or email. Your continued use after changes constitutes acceptance.
        </Text>

        <Text style={styles.sectionTitle}>12. {t('Third-Party Services')}</Text>
        <Text style={styles.paragraph}>
          We use ArifPay for payment processing. When you make a purchase, your payment information is processed by ArifPay according to their privacy policy. We do not store your payment card information on our servers.
        </Text>

        <Text style={styles.sectionTitle}>13. {t('Contact Us')}</Text>
        <Text style={styles.paragraph}>
          If you have questions about this Privacy Policy or how we handle your data, please contact us:
          {'\n'}{'\n'}
          Email: privacy@datingapp.com
          {'\n'}Phone: +251 944 120 739
          {'\n'}Support: support@datingapp.com
          {'\n'}{'\n'}
          We aim to respond to all inquiries within 48 hours.
        </Text>

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
  lastUpdated: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: Colors.text.secondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  bold: {
    fontWeight: '700',
    color: Colors.text.primary,
  },
  bottomSpacing: {
    height: 40,
  },
});
