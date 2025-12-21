import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useI18n } from '@/hooks/i18n-context';

export default function TermsScreen() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Terms & Conditions')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>{t('Last updated')}: January 2025</Text>

        <Text style={styles.sectionTitle}>1. {t('Acceptance of Terms')}</Text>
        <Text style={styles.paragraph}>
          By accessing or using our dating application, you agree to be bound by these Terms & Conditions. If you do not agree with any part of these terms, you must not use our service.
        </Text>

        <Text style={styles.sectionTitle}>2. {t('Age Requirement')}</Text>
        <Text style={styles.paragraph}>
          You must be at least 18 years old to use this service. By creating an account, you confirm that you meet this age requirement. We reserve the right to verify your age and terminate accounts that violate this policy.
        </Text>

        <Text style={styles.sectionTitle}>3. {t('Account Registration')}</Text>
        <Text style={styles.paragraph}>
          You agree to provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
        </Text>

        <Text style={styles.sectionTitle}>4. {t('User Conduct')}</Text>
        <Text style={styles.paragraph}>
          You agree not to:
          {'\n'} • Harass, abuse, or harm other users
          {'\n'} • Post false, misleading, or fraudulent content
          {'\n'} • Use the service for illegal activities
          {'\n'} • Share explicit or inappropriate content
          {'\n'} • Impersonate others or create fake profiles
          {'\n'} • Violate intellectual property rights
        </Text>

        <Text style={styles.sectionTitle}>5. {t('Content Ownership')}</Text>
        <Text style={styles.paragraph}>
          You retain ownership of content you post, but grant us a license to use, modify, and display this content as needed to operate the service. We reserve the right to remove any content that violates our policies.
        </Text>

        <Text style={styles.sectionTitle}>6. {t('Privacy & Data')}</Text>
        <Text style={styles.paragraph}>
          Your use of the service is also governed by our Privacy Policy. We collect and process your data as described in our Privacy Policy to provide and improve our services.
        </Text>

        <Text style={styles.sectionTitle}>7. {t('Subscription & Payments')}</Text>
        <Text style={styles.paragraph}>
          Premium features require a paid subscription. Subscriptions automatically renew unless cancelled. Refunds are subject to our refund policy. We reserve the right to modify pricing with advance notice.
        </Text>

        <Text style={styles.sectionTitle}>8. {t('Termination')}</Text>
        <Text style={styles.paragraph}>
          We may suspend or terminate your account at any time for violations of these terms or for any other reason. You may delete your account at any time through the app settings.
        </Text>

        <Text style={styles.sectionTitle}>9. {t('Disclaimers')}</Text>
        <Text style={styles.paragraph}>
          The service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee matches, dates, or relationships. We are not responsible for interactions between users.
        </Text>

        <Text style={styles.sectionTitle}>10. {t('Limitation of Liability')}</Text>
        <Text style={styles.paragraph}>
          We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.
        </Text>

        <Text style={styles.sectionTitle}>11. {t('Changes to Terms')}</Text>
        <Text style={styles.paragraph}>
          We reserve the right to modify these terms at any time. We will notify users of significant changes. Continued use of the service after changes constitutes acceptance.
        </Text>

        <Text style={styles.sectionTitle}>12. {t('Refund Policy')}</Text>
        <Text style={styles.paragraph}>
          Refunds for premium subscriptions are handled on a case-by-case basis within 7 days of purchase. After 7 days, no refunds will be issued. To request a refund, contact our support team with your purchase details.
        </Text>

        <Text style={styles.sectionTitle}>13. {t('Contact Us')}</Text>
        <Text style={styles.paragraph}>
          If you have questions about these terms, please contact us:
          {'\n'}{'\n'}
          Email: support@datingapp.com
          {'\n'}Phone: +251 944 120 739
          {'\n'}{'\n'}
          We are here to help and will respond within 48 hours.
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
  bottomSpacing: {
    height: 40,
  },
});
